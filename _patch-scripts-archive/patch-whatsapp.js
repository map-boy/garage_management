const fs = require("fs");
const path = "src/index.ts";
let content = fs.readFileSync(path, "utf8");
let patchCount = 0;

function replaceOnce(oldLines, newLines, label) {
  const oldStr = oldLines.join("\n");
  const newStr = newLines.join("\n");
  const count = content.split(oldStr).length - 1;
  if (count !== 1) {
    console.error("SKIPPED (expected 1 match, found " + count + "): " + label);
    return;
  }
  content = content.split(oldStr).join(newStr);
  patchCount++;
  console.log("Patched: " + label);
}

// ===== PATCH 1: disconnectWhatsAppSession — stop colliding on reconnect =====
replaceOnce(
[
'export const disconnectWhatsAppSession = onCall(',
'  {secrets: [openwaApiKey, openwaUrl], timeoutSeconds: 60},',
'  async (request) => {',
'    const {garageId} = request.data;',
'    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");',
'    try {',
'      const garageSnap = await admin.firestore().collection("garages").doc(garageId).get();',
'      const sessionId = garageSnap.data()?.whatsappSessionId;',
'      if (!sessionId) return {success: true};',
'      await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/logout`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }).catch(() => null);',
'      await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/stop`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }).catch(() => null);',
'      await admin.firestore().collection("garages").doc(garageId).update({',
'        whatsappSessionId: admin.firestore.FieldValue.delete(),',
'        whatsappSessionStatus: admin.firestore.FieldValue.delete(),',
'      });',
'      return {success: true};',
'    } catch (error: any) {',
'      logger.error("disconnectWhatsAppSession failed", error);',
'      throw new HttpsError("internal", error.message || "Failed to disconnect session");',
'    }',
'  }',
');'
],
[
'export const disconnectWhatsAppSession = onCall(',
'  {secrets: [openwaApiKey, openwaUrl], timeoutSeconds: 60},',
'  async (request) => {',
'    const {garageId} = request.data;',
'    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");',
'    try {',
'      const garageSnap = await admin.firestore().collection("garages").doc(garageId).get();',
'      const sessionId = garageSnap.data()?.whatsappSessionId;',
'      if (!sessionId) return {success: true};',
'      await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/logout`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }, 10000).catch(() => null);',
'      await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/stop`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }, 10000).catch(() => null);',
'      // Keep sessionId so reconnecting reuses this session instead of',
'      // colliding with a still-existing OpenWA session of the same name.',
'      await admin.firestore().collection("garages").doc(garageId).update({',
'        whatsappSessionStatus: "disconnected",',
'      });',
'      return {success: true};',
'    } catch (error: any) {',
'      logger.error("disconnectWhatsAppSession failed", error);',
'      throw new HttpsError("internal", error.message || "Failed to disconnect session");',
'    }',
'  }',
');'
],
"disconnectWhatsAppSession: keep sessionId + add timeouts"
);

// ===== PATCH 2: createWhatsAppSession — reuse existing session, add timeouts =====
replaceOnce(
[
'export const createWhatsAppSession = onCall(',
'  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId], timeoutSeconds: 180},',
'  async (request) => {',
'    const {garageId} = request.data;',
'    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");',
'    try {',
'      await ensureVmRunning();',
'      await waitForVmReady();',
'      const sessionName = `garage-${garageId}`.slice(0, 50);',
'      const res = await fetch(`${openwaUrl.value()}/api/sessions`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value(), "Content-Type": "application/json"},',
'        body: JSON.stringify({name: sessionName}),',
'      });',
'      let data: any = await res.json();',
'      if (!res.ok) {',
'        const alreadyExists = res.status === 409 || /already exists/i.test(data?.message || "");',
'        if (alreadyExists) {',
'          const listRes = await fetch(`${openwaUrl.value()}/api/sessions`, {',
'            headers: {"X-API-Key": openwaApiKey.value()},',
'          });',
'          const listData: any = await listRes.json();',
'          const sessions = Array.isArray(listData) ? listData : listData.sessions || [];',
'          const existing = sessions.find((s: any) => s.name === sessionName);',
'          if (!existing) throw new HttpsError("internal", "Session name conflict but could not find existing session");',
'          data = existing;',
'        } else {',
'          throw new HttpsError("internal", data.message || "Failed to create session");',
'        }',
'      }',
'      await admin.firestore().collection("garages").doc(garageId).update({',
'        whatsappSessionId: data.id,',
'        whatsappSessionStatus: data.status,',
'      });',
'      await fetch(`${openwaUrl.value()}/api/sessions/${data.id}/start`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      });',
'      return {sessionId: data.id};',
'    } catch (error: any) {',
'      logger.error("createWhatsAppSession failed", error);',
'      throw new HttpsError("internal", error.message || "Failed to create session - VM may still be waking up");',
'    }',
'  }',
');'
],
[
'export const createWhatsAppSession = onCall(',
'  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId], timeoutSeconds: 180},',
'  async (request) => {',
'    const {garageId} = request.data;',
'    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");',
'    try {',
'      await ensureVmRunning();',
'      await waitForVmReady();',
'      const garageRef = admin.firestore().collection("garages").doc(garageId);',
'      const existingSnap = await garageRef.get();',
'      const existingSessionId = existingSnap.data()?.whatsappSessionId;',
'      if (existingSessionId) {',
'        await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${existingSessionId}/start`, {',
'          method: "POST",',
'          headers: {"X-API-Key": openwaApiKey.value()},',
'        }, 15000).catch(() => null);',
'        return {sessionId: existingSessionId};',
'      }',
'      const sessionName = `garage-${garageId}`.slice(0, 50);',
'      const res = await fetchWithTimeout(`${openwaUrl.value()}/api/sessions`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value(), "Content-Type": "application/json"},',
'        body: JSON.stringify({name: sessionName}),',
'      }, 20000);',
'      let data: any = await res.json();',
'      if (!res.ok) {',
'        const alreadyExists = res.status === 409 || /already exists/i.test(data?.message || "");',
'        if (alreadyExists) {',
'          const listRes = await fetchWithTimeout(`${openwaUrl.value()}/api/sessions`, {',
'            headers: {"X-API-Key": openwaApiKey.value()},',
'          }, 15000);',
'          const listData: any = await listRes.json();',
'          const sessions = Array.isArray(listData) ? listData : listData.sessions || [];',
'          const existing = sessions.find((s: any) => s.name === sessionName);',
'          if (!existing) throw new HttpsError("internal", "Session name conflict but could not find existing session");',
'          data = existing;',
'        } else {',
'          throw new HttpsError("internal", data.message || "Failed to create session");',
'        }',
'      }',
'      await garageRef.update({',
'        whatsappSessionId: data.id,',
'        whatsappSessionStatus: data.status,',
'      });',
'      await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${data.id}/start`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }, 15000).catch(() => null);',
'      return {sessionId: data.id};',
'    } catch (error: any) {',
'      logger.error("createWhatsAppSession failed", error);',
'      throw new HttpsError("internal", error.message || "Failed to create session - VM may still be waking up");',
'    }',
'  }',
');'
],
"createWhatsAppSession: reuse existing session + add timeouts"
);

// ===== PATCH 3: ensureSessionActive — add timeouts, poll faster =====
replaceOnce(
[
'async function ensureSessionActive(sessionId: string): Promise<void> {',
'  const apiKey = openwaApiKey.value();',
'  await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey},',
'  });',
'  const maxWaitMs = 60000;',
'  const intervalMs = 3000;',
'  const startTime = Date.now();',
'  while (Date.now() - startTime < maxWaitMs) {',
'    const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}`, {',
'      headers: {"X-API-Key": apiKey},',
'    });',
'    if (res.ok) {',
'      const data: any = await res.json();',
'      if (data.status === "ready" || data.status === "connected" || data.status === "active") {',
'        return;',
'      }',
'    }',
'    await new Promise((resolve) => setTimeout(resolve, intervalMs));',
'  }',
'  throw new Error(`Timed out waiting for WhatsApp session ${sessionId} to become active`);',
'}'
],
[
'async function ensureSessionActive(sessionId: string): Promise<void> {',
'  const apiKey = openwaApiKey.value();',
'  await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey},',
'  }, 15000).catch(() => null);',
'  const maxWaitMs = 60000;',
'  const intervalMs = 2000;',
'  const startTime = Date.now();',
'  while (Date.now() - startTime < maxWaitMs) {',
'    const res = await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}`, {',
'      headers: {"X-API-Key": apiKey},',
'    }, 8000).catch(() => null);',
'    if (res && res.ok) {',
'      const data: any = await res.json();',
'      if (data.status === "ready" || data.status === "connected" || data.status === "active") {',
'        return;',
'      }',
'    }',
'    await new Promise((resolve) => setTimeout(resolve, intervalMs));',
'  }',
'  throw new Error(`Timed out waiting for WhatsApp session ${sessionId} to become active`);',
'}'
],
"ensureSessionActive: add timeouts, poll every 2s instead of 3s"
);

// ===== PATCH 4: sendWhatsAppText — add timeout so a send can never hang forever =====
replaceOnce(
[
'async function sendWhatsAppText(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  message: string',
'): Promise<void> {',
'  const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-text`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},',
'    body: JSON.stringify({chatId: toChatId(toPhone), text: message}),',
'  });',
'  if (!res.ok) {',
'    throw new Error(`OpenWA send failed: ${await res.text()}`);',
'  }',
'}'
],
[
'async function sendWhatsAppText(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  message: string',
'): Promise<void> {',
'  const res = await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-text`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},',
'    body: JSON.stringify({chatId: toChatId(toPhone), text: message}),',
'  }, 20000);',
'  if (!res.ok) {',
'    throw new Error(`OpenWA send failed: ${await res.text()}`);',
'  }',
'}'
],
"sendWhatsAppText: add timeout"
);

// ===== PATCH 5: azureVmAction — add timeout on Azure management calls =====
replaceOnce(
[
'async function azureVmAction(action: "start" | "deallocate"): Promise<void> {',
'  const token = await getAzureToken();',
'  const url = `https://management.azure.com/subscriptions/${azureSubscriptionId.value()}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/${AZURE_VM_NAME}/${action}?api-version=2023-09-01`;',
'  const res = await fetch(url, {',
'    method: "POST",',
'    headers: {"Authorization": `Bearer ${token}`},',
'  });',
'  if (!res.ok && res.status !== 202) {',
'    throw new Error(`Azure ${action} failed: ${await res.text()}`);',
'  }',
'  logger.info(`Azure VM ${action} triggered`, {vm: AZURE_VM_NAME});',
'}'
],
[
'async function azureVmAction(action: "start" | "deallocate"): Promise<void> {',
'  const token = await getAzureToken();',
'  const url = `https://management.azure.com/subscriptions/${azureSubscriptionId.value()}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/${AZURE_VM_NAME}/${action}?api-version=2023-09-01`;',
'  const res = await fetchWithTimeout(url, {',
'    method: "POST",',
'    headers: {"Authorization": `Bearer ${token}`},',
'  }, 20000);',
'  if (!res.ok && res.status !== 202) {',
'    throw new Error(`Azure ${action} failed: ${await res.text()}`);',
'  }',
'  logger.info(`Azure VM ${action} triggered`, {vm: AZURE_VM_NAME});',
'}'
],
"azureVmAction: add timeout"
);

// ===== PATCH 6: waitForVmReady — poll faster, wider ceiling =====
replaceOnce(
[
'async function waitForVmReady(): Promise<void> {',
'  const maxWaitMs = 90000;',
'  const intervalMs = 5000;',
'  const startTime = Date.now();',
'  while (Date.now() - startTime < maxWaitMs) {',
'    try {',
'      const res = await fetch(`${openwaUrl.value()}`, {method: "GET"});',
'      if (res.ok || res.status === 404) {',
'        logger.info("OpenWA service is ready");',
'        return;',
'      }',
'    } catch (err) {',
'      // VM/service not up yet, keep waiting',
'    }',
'    await new Promise((resolve) => setTimeout(resolve, intervalMs));',
'  }',
'  throw new Error("Timed out waiting for VM/WhatsApp service to become ready");',
'}'
],
[
'async function waitForVmReady(): Promise<void> {',
'  const maxWaitMs = 120000;',
'  const intervalMs = 3000;',
'  const startTime = Date.now();',
'  while (Date.now() - startTime < maxWaitMs) {',
'    try {',
'      const res = await fetchWithTimeout(`${openwaUrl.value()}`, {method: "GET"}, 4000);',
'      if (res.ok || res.status === 404) {',
'        logger.info("OpenWA service is ready");',
'        return;',
'      }',
'    } catch (err) {',
'      // VM/service not up yet, keep waiting',
'    }',
'    await new Promise((resolve) => setTimeout(resolve, intervalMs));',
'  }',
'  throw new Error("Timed out waiting for VM/WhatsApp service to become ready");',
'}'
],
"waitForVmReady: poll every 3s (was 5s), wider ceiling for reliability"
);

fs.writeFileSync(path, content, "utf8");
console.log("");
console.log("TOTAL PATCHES APPLIED: " + patchCount + " / 6");
