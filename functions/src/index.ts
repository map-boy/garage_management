import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import PDFDocument from "pdfkit";

if (!admin.apps.length) {
  admin.initializeApp();
}
setGlobalOptions({maxInstances: 10});

const openwaApiKey = defineSecret("OPENWA_API_KEY");
const openwaUrl = defineSecret("OPENWA_URL");
const azureAppId = defineSecret("AZURE_APP_ID");
const azurePassword = defineSecret("AZURE_PASSWORD");
const azureTenant = defineSecret("AZURE_TENANT");
const azureSubscriptionId = defineSecret("AZURE_SUBSCRIPTION_ID");
const DEFAULT_WHATSAPP_LIMIT = 1000;

// ---- OpenWA send helpers ----
function toChatId(phone: string): string {
  return phone.replace(/[^\d]/g, "") + "@c.us";
}

async function sendWhatsAppText(
  apiKey: string,
  sessionId: string,
  toPhone: string,
  message: string
): Promise<void> {
  const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-text`, {
    method: "POST",
    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({chatId: toChatId(toPhone), text: message}),
  });
  if (!res.ok) {
    throw new Error(`OpenWA send failed: ${await res.text()}`);
  }
}

// ---- Quota check + increment (per garage) ----
async function checkAndIncrementQuota(garageId: string): Promise<boolean> {
  const garageRef = admin.firestore().collection("garages").doc(garageId);
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(garageRef);
    const data = snap.data() || {};
    const used = data.whatsappMessagesUsed || 0;
    const limit = data.whatsappMessagesLimit ?? DEFAULT_WHATSAPP_LIMIT;
    if (used >= limit) {
      return false;
    }
    tx.update(garageRef, {whatsappMessagesUsed: used + 1});
    return true;
  });
}

// ---- Auto-send WhatsApp when invoice is marked Paid ----
export const onInvoicePaid = onDocumentUpdated(
  {document: "garages/{garageId}/invoices/{invoiceId}", secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId]},
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === "Paid" || after.status !== "Paid") return;

    const {garageId} = event.params;
    const clientId = after.clientId;
    if (!clientId) return;

    const clientSnap = await admin.firestore()
      .collection("garages").doc(garageId)
      .collection("clients").doc(clientId).get();
    const client = clientSnap.data();
    if (!client?.phone) {
      logger.warn("No client phone for paid invoice", {garageId, invoiceId: event.params.invoiceId});
      return;
    }

    const garageSnap = await admin.firestore().collection("garages").doc(garageId).get();
    const garage = garageSnap.data();
    const garageName = garage?.garageName || "Your Garage";

    await ensureVmRunning();
    await waitForVmReady();
    const allowed = await checkAndIncrementQuota(garageId);
    if (!allowed) {
      logger.warn("WhatsApp quota exhausted", {garageId});
      return;
    }

    const subtotal = (after.lineItems || []).reduce(
      (acc: number, item: any) => acc + item.qty * item.unitCost, 0
    ) + (after.laborCost || 0);
    const taxRate = after.taxRate || 0;
    const total = subtotal + subtotal * taxRate;

    let vehiclePlate = "";
    let vehicleMakeModel = "";
    let vehicleYear: number | undefined = undefined;
    if (after.jobId) {
      const jobSnap = await admin.firestore()
        .collection("garages").doc(garageId)
        .collection("jobs").doc(after.jobId).get();
      const job = jobSnap.data();
      if (job?.vehicleId) {
        const vehicleSnap = await admin.firestore()
          .collection("garages").doc(garageId)
          .collection("vehicles").doc(job.vehicleId).get();
        const vehicle = vehicleSnap.data();
        if (vehicle) {
          vehiclePlate = vehicle.plate || "";
          vehicleMakeModel = `${vehicle.make || ""} ${vehicle.model || ""}`.trim();
          vehicleYear = vehicle.year;
        }
      }
    }


    try {
      const pdfBuffer = await generateInvoicePdf(
        garageName,
        client.name || "",
        client.email || "",
        after.id || event.params.invoiceId,
        vehiclePlate,
        vehicleMakeModel,
        vehicleYear,
        after.lineItems || [],
        after.laborCost || 0,
        taxRate,
        garage?.currency || "RWF"
      );
      const pdfUrl = await uploadInvoicePdfAndGetUrl(
        pdfBuffer,
        garageId,
        event.params.invoiceId
      );
      const sessionId = await getGarageSessionId(garageId);
      await ensureSessionActive(sessionId);
      await sendWhatsAppTemplate(
        openwaApiKey.value(),
        sessionId,
        formatPhone(client.phone),
        client.name || "",
        after.id || event.params.invoiceId,
        `${total.toLocaleString()} ${garage?.currency || "RWF"}`,
        pdfUrl
      );
      logger.info("WhatsApp paid notification sent", {garageId, clientId});
    } catch (error: any) {
      logger.error("WhatsApp send failed", error);
    }
  }
);

// ---- Manual admin send (boss dashboard) ----
export const sendManualWhatsApp = onCall(
  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId]},
  async (request) => {
    const {garageId, phoneNumber, message} = request.data;
    if (!garageId || !phoneNumber || !message) {
      throw new HttpsError("invalid-argument", "garageId, phoneNumber and message are required");
    }
    await ensureVmRunning();
    await waitForVmReady();
    const allowed = await checkAndIncrementQuota(garageId);
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "WhatsApp message quota exhausted for this garage");
    }
    try {
      const sessionId = await getGarageSessionId(garageId);
      await ensureSessionActive(sessionId);
      await sendWhatsAppText(openwaApiKey.value(), sessionId, formatPhone(phoneNumber), message);
      return {success: true};
    } catch (error: any) {
      logger.error("Manual WhatsApp send failed", error);
      throw new HttpsError("internal", error.message || "WhatsApp send failed");
    }
  }
);

// ---- WhatsApp session management (boss dashboard) ----
export const createWhatsAppSession = onCall(
  {secrets: [openwaApiKey, openwaUrl]},
  async (request) => {
    const {garageId} = request.data;
    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");
    const sessionName = `garage-${garageId}`.slice(0, 50);
    const res = await fetch(`${openwaUrl.value()}/api/sessions`, {
      method: "POST",
      headers: {"X-API-Key": openwaApiKey.value(), "Content-Type": "application/json"},
      body: JSON.stringify({name: sessionName}),
    });
    const data: any = await res.json();
    if (!res.ok) throw new HttpsError("internal", data.message || "Failed to create session");
    await admin.firestore().collection("garages").doc(garageId).update({
      whatsappSessionId: data.id,
      whatsappSessionStatus: data.status,
    });
    await fetch(`${openwaUrl.value()}/api/sessions/${data.id}/start`, {
      method: "POST",
      headers: {"X-API-Key": openwaApiKey.value()},
    });
    return {sessionId: data.id};
  }
);

export const getWhatsAppSessionStatus = onCall(
  {secrets: [openwaApiKey, openwaUrl]},
  async (request) => {
    const {garageId} = request.data;
    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");
    const garageSnap = await admin.firestore().collection("garages").doc(garageId).get();
    const sessionId = garageSnap.data()?.whatsappSessionId;
    if (!sessionId) return {linked: false};
    const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}`, {
      headers: {"X-API-Key": openwaApiKey.value()},
    });
    if (!res.ok) return {linked: false};
    const data: any = await res.json();
    return {linked: true, status: data.status, phone: data.phone, sessionId};
  }
);

export const getWhatsAppQr = onCall(
  {secrets: [openwaApiKey, openwaUrl]},
  async (request) => {
    const {garageId} = request.data;
    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");
    const sessionId = await getGarageSessionId(garageId);
    const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/qr`, {
      headers: {"X-API-Key": openwaApiKey.value()},
    });
    const data: any = await res.json();
    if (!res.ok) throw new HttpsError("internal", data.message || "QR not ready");
    return {qrCode: data.qrCode};
  }
);

export const requestWhatsAppPairingCode = onCall(
  {secrets: [openwaApiKey, openwaUrl]},
  async (request) => {
    const {garageId, phoneNumber} = request.data;
    if (!garageId || !phoneNumber) {
      throw new HttpsError("invalid-argument", "garageId and phoneNumber are required");
    }
    const sessionId = await getGarageSessionId(garageId);
    const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/pairing-code`, {
      method: "POST",
      headers: {"X-API-Key": openwaApiKey.value(), "Content-Type": "application/json"},
      body: JSON.stringify({phoneNumber: phoneNumber.replace(/[^\d]/g, "")}),
    });
    const data: any = await res.json();
    if (!res.ok) throw new HttpsError("internal", data.message || "Failed to get pairing code");
    return {pairingCode: data.pairingCode || data.code};
  }
);
// ---- Scheduled holiday / bulk messages ----
// Runs once daily at 08:00 Africa/Kigali time. Using an explicit timeZone
// (not UTC) means "today" always matches the garage's real local date,
// so a message scheduled for a specific day never fires a day early/late.
export const sendScheduledMessages = onSchedule(
  {schedule: "0 8 * * *", timeZone: "Africa/Kigali", secrets: [openwaApiKey, openwaUrl]},
  async () => {
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Kigali",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date()); // "YYYY-MM-DD"

    const dueSnap = await admin.firestore()
      .collectionGroup("scheduledMessages")
      .where("sendDate", "==", todayStr)
      .get();

    for (const doc of dueSnap.docs) {
      const data = doc.data();
      if (data.status !== "pending") continue;

      const garageId = doc.ref.parent.parent?.id;
      if (!garageId) continue;

      try {
        await ensureVmRunning();
        await waitForVmReady();
        const sessionId = await getGarageSessionId(garageId);
        await ensureSessionActive(sessionId);
        const clientsSnap = await admin.firestore()
          .collection("garages").doc(garageId)
          .collection("clients").get();

        let sentCount = 0;
        for (const clientDoc of clientsSnap.docs) {
          const client = clientDoc.data();
          if (!client.phone) continue;

          const allowed = await checkAndIncrementQuota(garageId);
          if (!allowed) {
            logger.warn("Quota exhausted mid-broadcast", {garageId, scheduledId: doc.id});
            break;
          }
          try {
            await sendWhatsAppText(openwaApiKey.value(), sessionId, formatPhone(client.phone), data.message);
            sentCount++;
          } catch (err) {
            logger.error("Scheduled message send failed for client", {garageId, clientId: clientDoc.id, err});
          }
        }

        await doc.ref.update({
          status: "sent",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          sentCount,
        });
        logger.info("Scheduled message broadcast complete", {garageId, scheduledId: doc.id, sentCount});
      } catch (error: any) {
        logger.error("Scheduled message batch failed", {garageId, scheduledId: doc.id, error});
      }
    }
  }
);

function formatPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}


async function getGarageSessionId(garageId: string): Promise<string> {
  const snap = await admin.firestore().collection("garages").doc(garageId).get();
  const sessionId = snap.data()?.whatsappSessionId;
  if (!sessionId) {
    throw new Error("No WhatsApp session linked for this garage. Link one in the admin panel first.");
  }
  return sessionId;
}
async function generateInvoicePdf(
  garageName: string,
  clientName: string,
  clientEmail: string,
  invoiceNumber: string,
  vehiclePlate: string,
  vehicleMakeModel: string,
  vehicleYear: number | undefined,
  lineItems: any[],
  laborCost: number,
  taxRate: number,
  currency: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({margin: 50});
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const subtotal = (lineItems || []).reduce(
      (acc, item) => acc + (item.qty || 0) * (item.unitCost || 0), 0
    ) + (laborCost || 0);
    const tax = subtotal * (taxRate || 0);
    const total = subtotal + tax;

    doc.fontSize(20).text(garageName, {align: "center"});
    doc.moveDown();
    doc.fontSize(14).text(`Invoice #${invoiceNumber}`, {align: "center"});
    doc.fontSize(10).fillColor("green").text("PAID", {align: "center"});
    doc.fillColor("black");
    doc.moveDown();

    doc.fontSize(12).text(`Bill to: ${clientName}`);
    if (clientEmail) {
      doc.fontSize(10).fillColor("gray").text(clientEmail);
      doc.fillColor("black");
    }
    doc.moveDown();

    if (vehiclePlate || vehicleMakeModel) {
      doc.fontSize(11).text("Vehicle:", {underline: true});
      doc.fontSize(10).text(`Registration: ${vehiclePlate || "N/A"}`);
      doc.fontSize(10).text(`Make/Model: ${vehicleMakeModel || "N/A"}`);
      if (vehicleYear) {
        doc.fontSize(10).text(`Year: ${vehicleYear}`);
      }
      doc.moveDown();
    }

    doc.fontSize(11).text("Items:", {underline: true});
    doc.moveDown(0.5);
    for (const item of lineItems || []) {
      const lineTotal = (item.qty || 0) * (item.unitCost || 0);
      doc.fontSize(10).text(
        `${item.description || "Item"}  x${item.qty}  -  ${lineTotal.toLocaleString()} ${currency}`
      );
    }
    if (laborCost) {
      doc.fontSize(10).text(`Labor Charges  -  ${laborCost.toLocaleString()} ${currency}`);
    }

    doc.moveDown();
    doc.fontSize(10).text(`Subtotal: ${subtotal.toLocaleString()} ${currency}`, {align: "right"});
    doc.fontSize(10).text(`Tax (${(taxRate * 100).toFixed(1)}%): ${tax.toLocaleString()} ${currency}`, {align: "right"});
    doc.fontSize(13).text(`Grand Total: ${total.toLocaleString()} ${currency}`, {align: "right"});

    doc.end();
  });
}
async function uploadInvoicePdfAndGetUrl(
  pdfBuffer: Buffer,
  garageId: string,
  invoiceId: string
): Promise<string> {
  const bucket = admin.storage().bucket();
  const filePath = `invoices/${garageId}/${invoiceId}.pdf`;
  const file = bucket.file(filePath);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {cacheControl: "private, max-age=0"},
  });

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return url;
}
async function sendWhatsAppTemplate(
  apiKey: string,
  sessionId: string,
  toPhone: string,
  customerName: string,
  invoiceNumber: string,
  amountText: string,
  pdfUrl: string
): Promise<void> {
  const caption = `Hi ${customerName}, your invoice ${invoiceNumber} for ${amountText} has been paid. Thank you!`;
  const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-document`, {
    method: "POST",
    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({
      chatId: toChatId(toPhone),
      url: pdfUrl,
      filename: `invoice-${invoiceNumber}.pdf`,
      mimetype: "application/pdf",
      caption,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenWA document send failed: ${await res.text()}`);
  }
}

// ---- Azure VM auto start/stop (save cost â€” VM only runs during business hours) ----
const AZURE_RESOURCE_GROUP = "garage-whatsapp-rg";
const AZURE_VM_NAME = "openwa-vm-azure";

async function getAzureToken(): Promise<string> {
  const res = await fetch(
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
    }
  );
  const data: any = await res.json();
  if (!res.ok) throw new Error(`Azure auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function azureVmAction(action: "start" | "deallocate"): Promise<void> {
  const token = await getAzureToken();
  const url = `https://management.azure.com/subscriptions/${azureSubscriptionId.value()}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/${AZURE_VM_NAME}/${action}?api-version=2023-09-01`;
  const res = await fetch(url, {
    method: "POST",
    headers: {"Authorization": `Bearer ${token}`},
  });
  if (!res.ok && res.status !== 202) {
    throw new Error(`Azure ${action} failed: ${await res.text()}`);
  }
  logger.info(`Azure VM ${action} triggered`, {vm: AZURE_VM_NAME});
}

// Stops (deallocates) the VM at 8:00 PM Kigali time (after business hours) â€” this is
// what actually stops billing, since a deallocated VM is not charged for compute.
export const stopGarageVm = onSchedule(
  {schedule: "0 20 * * *", timeZone: "Africa/Kigali", secrets: [azureAppId, azurePassword, azureTenant, azureSubscriptionId]},
  async () => {
    await azureVmAction("deallocate");
  }
);


async function ensureVmRunning(): Promise<void> {
  const db = admin.firestore();
  const stateRef = db.collection("system").doc("vmState");
  await azureVmAction("start");
  await stateRef.set({lastActivity: admin.firestore.FieldValue.serverTimestamp(), running: true}, {merge: true});
}

async function waitForVmReady(): Promise<void> {
  const maxWaitMs = 90000;
  const intervalMs = 5000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(`${openwaUrl.value()}`, {method: "GET"});
      if (res.ok || res.status === 404) {
        logger.info("OpenWA service is ready");
        return;
      }
    } catch (err) {
      // VM/service not up yet, keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for VM/WhatsApp service to become ready");
}

async function ensureSessionActive(sessionId: string): Promise<void> {
  const apiKey = openwaApiKey.value();
  await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {
    method: "POST",
    headers: {"X-API-Key": apiKey},
  });
  const maxWaitMs = 60000;
  const intervalMs = 3000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}`, {
      headers: {"X-API-Key": apiKey},
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data.status === "connected" || data.status === "active") {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for WhatsApp session ${sessionId} to become active`);
}

// Idle-checker: runs every 10 min. Stops the VM if no activity for 15+ min — saves cost
// since the VM only needs to run right after an invoice is paid or a manual send.
export const stopIdleVm = onSchedule(
  {schedule: "*/10 * * * *", secrets: [azureAppId, azurePassword, azureTenant, azureSubscriptionId]},
  async () => {
    const db = admin.firestore();
    const stateRef = db.collection("system").doc("vmState");
    const snap = await stateRef.get();
    const data = snap.data();
    if (!data?.running) return;
    const lastActivity = data.lastActivity?.toDate?.() || new Date(0);
    const idleMinutes = (Date.now() - lastActivity.getTime()) / 60000;
    if (idleMinutes >= 15) {
      await azureVmAction("deallocate");
      await stateRef.set({running: false}, {merge: true});
      logger.info("VM stopped due to inactivity");
    }
  }
);

