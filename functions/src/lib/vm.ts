import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  azureAppId,
  azurePassword,
  azureSubscriptionId,
  azureTenant,
  openwaUrl,
} from "./secrets";
import {fetchWithTimeout, readBody, sleep, withRetry} from "./http";

/**
 * The OpenWA service runs on a single Azure VM that is deallocated outside
 * business hours to avoid paying for idle compute. Everything that needs to
 * send a message must first make sure that VM is up.
 */
export const AZURE_RESOURCE_GROUP = "garage-whatsapp-rg";
export const AZURE_VM_NAME = "openwa-vm-azure";

const VM_STATE_PATH = ["system", "vmState"] as const;

/**
 * Azure tokens are valid for roughly an hour. Caching one per warm instance
 * removes an auth round-trip from the critical path of every send, which
 * matters because the whole delivery has to finish inside the function's
 * timeout while the VM is still booting.
 */
let cachedToken: {token: string; expiresAt: number} | null = null;

async function getAzureToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const res = await fetchWithTimeout(
    `https://login.microsoftonline.com/${azureTenant.value()}/oauth2/token`,
    {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: azureAppId.value(),
        client_secret: azurePassword.value(),
        resource: "https://management.azure.com/",
      }),
    },
    15000
  );
  const data = await readBody(res);
  if (!res.ok || !data?.access_token) {
    // Never log the response body here — it can echo the client secret.
    throw new Error(`Azure authentication failed (${res.status})`);
  }
  const ttlSeconds = Number(data.expires_in || 3600);
  cachedToken = {
    token: data.access_token,
    // Refresh a minute early so a token never expires mid-request.
    expiresAt: Date.now() + Math.max(0, ttlSeconds - 60) * 1000,
  };
  return cachedToken.token;
}

async function azureVmAction(action: "start" | "deallocate"): Promise<void> {
  await withRetry(async () => {
    const token = await getAzureToken();
    const url =
      `https://management.azure.com/subscriptions/${azureSubscriptionId.value()}` +
      `/resourceGroups/${AZURE_RESOURCE_GROUP}` +
      `/providers/Microsoft.Compute/virtualMachines/${AZURE_VM_NAME}` +
      `/${action}?api-version=2023-09-01`;
    const res = await fetchWithTimeout(
      url,
      {method: "POST", headers: {Authorization: `Bearer ${token}`}},
      20000
    );
    if (!res.ok && res.status !== 202) {
      if (res.status === 401 || res.status === 403) cachedToken = null;
      const data = await readBody(res);
      throw new Error(
        `Azure ${action} failed (${res.status}): ${data?.message || ""}`
      );
    }
  }, {attempts: 3, label: `Azure VM ${action}`});
  logger.info(`Azure VM ${action} requested`, {vm: AZURE_VM_NAME});
}

function vmStateRef(): admin.firestore.DocumentReference {
  return admin.firestore().collection(VM_STATE_PATH[0]).doc(VM_STATE_PATH[1]);
}

/** Records that the VM is being used right now, deferring the idle shutdown. */
export async function touchVmActivity(): Promise<void> {
  await vmStateRef().set(
    {
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      running: true,
    },
    {merge: true}
  );
}

/**
 * Brings the VM up if it is not already running.
 *
 * The previous implementation issued an Azure start call on every single
 * send. Azure tolerates starting a running VM, but the call costs several
 * seconds against a function timeout and is throttled under load, so the
 * common warm path now skips it entirely and only refreshes the activity
 * stamp that keeps the idle reaper away.
 */
export async function ensureVmRunning(): Promise<void> {
  const snap = await vmStateRef().get();
  const alreadyRunning = snap.data()?.running === true;

  if (alreadyRunning && await isOpenWaReachable(4000)) {
    await touchVmActivity();
    return;
  }

  await azureVmAction("start");
  await touchVmActivity();
}

async function isOpenWaReachable(timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      openwaUrl.value(),
      {method: "GET"},
      timeoutMs
    );
    // A 404 still proves the HTTP server is listening.
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/** Polls until the OpenWA HTTP service answers, or gives up. */
export async function waitForVmReady(maxWaitMs = 90000): Promise<void> {
  const intervalMs = 5000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (await isOpenWaReachable(5000)) {
      logger.info("OpenWA service is reachable", {
        waitedMs: Date.now() - startTime,
      });
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error(
    "Timed out waiting for the WhatsApp VM to start. " +
    "It may still be booting — try again in a minute."
  );
}

/** Convenience wrapper used by every send path. */
export async function ensureVmReady(): Promise<void> {
  await ensureVmRunning();
  await waitForVmReady();
}

export async function stopVm(reason: string): Promise<void> {
  await azureVmAction("deallocate");
  await vmStateRef().set(
    {running: false, stoppedAt: admin.firestore.FieldValue.serverTimestamp()},
    {merge: true}
  );
  logger.info("Azure VM deallocated", {reason});
}

export async function readVmState(): Promise<{
  running: boolean;
  lastActivity: Date | null;
  idleMinutes: number | null;
}> {
  const snap = await vmStateRef().get();
  const data = snap.data();
  if (!data?.running) {
    return {running: false, lastActivity: null, idleMinutes: null};
  }
  const lastActivity = data.lastActivity?.toDate?.() || null;
  return {
    running: true,
    lastActivity,
    idleMinutes: lastActivity ?
      (Date.now() - lastActivity.getTime()) / 60000 :
      null,
  };
}
