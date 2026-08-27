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

// ===== PATCH 7: getWhatsAppQr — timeout + poll for QR instead of failing instantly =====
replaceOnce(
[
'export const getWhatsAppQr = onCall(',
'  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId], timeoutSeconds: 120},',
'  async (request) => {',
'    const {garageId} = request.data;',
'    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");',
'    try {',
'      await ensureVmRunning();',
'      await waitForVmReady();',
'      const sessionId = await getGarageSessionId(garageId);',
'      await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }).catch(() => null);',
'      const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/qr`, {',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      });',
'      const data: any = await res.json();',
'      if (!res.ok) throw new HttpsError("internal", data.message || "QR not ready");',
'      return {qrCode: data.qrCode};',
'    } catch (error: any) {',
'      logger.error("getWhatsAppQr failed", error);',
'      throw new HttpsError("internal", error.message || "Could not get QR - VM may still be waking up");',
'    }',
'  }',
');'
],
[
'export const getWhatsAppQr = onCall(',
'  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId], timeoutSeconds: 120},',
'  async (request) => {',
'    const {garageId} = request.data;',
'    if (!garageId) throw new HttpsError("invalid-argument", "garageId is required");',
'    try {',
'      await ensureVmRunning();',
'      await waitForVmReady();',
'      const sessionId = await getGarageSessionId(garageId);',
'      await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }, 15000).catch(() => null);',
'      // OpenWA needs a moment after /start to generate the QR — poll',
'      // instead of failing on the first "not ready" response.',
'      const maxWaitMs = 30000;',
'      const intervalMs = 3000;',
'      const startTime = Date.now();',
'      let lastMessage = "QR not ready";',
'      while (Date.now() - startTime < maxWaitMs) {',
'        const res = await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/qr`, {',
'          headers: {"X-API-Key": openwaApiKey.value()},',
'        }, 8000).catch(() => null);',
'        if (res && res.ok) {',
'          const data: any = await res.json();',
'          if (data.qrCode) return {qrCode: data.qrCode};',
'        } else if (res) {',
'          const data: any = await res.json().catch(() => ({}));',
'          lastMessage = data.message || lastMessage;',
'        }',
'        await new Promise((resolve) => setTimeout(resolve, intervalMs));',
'      }',
'      throw new HttpsError("internal", lastMessage);',
'    } catch (error: any) {',
'      logger.error("getWhatsAppQr failed", error);',
'      throw new HttpsError("internal", error.message || "Could not get QR - VM may still be waking up");',
'    }',
'  }',
');'
],
"getWhatsAppQr: timeout + poll instead of instant fail"
);

// ===== PATCH 8: requestWhatsAppPairingCode — add timeouts =====
replaceOnce(
[
'export const requestWhatsAppPairingCode = onCall(',
'  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId], timeoutSeconds: 120},',
'  async (request) => {',
'    const {garageId, phoneNumber} = request.data;',
'    if (!garageId || !phoneNumber) {',
'      throw new HttpsError("invalid-argument", "garageId and phoneNumber are required");',
'    }',
'    try {',
'      await ensureVmRunning();',
'      await waitForVmReady();',
'      const sessionId = await getGarageSessionId(garageId);',
'      await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }).catch(() => null);',
'      const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/pairing-code`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value(), "Content-Type": "application/json"},',
'        body: JSON.stringify({phoneNumber: phoneNumber.replace(/[^\\d]/g, "")}),',
'      });',
'      const data: any = await res.json();',
'      if (!res.ok) throw new HttpsError("internal", data.message || "Failed to get pairing code");',
'      return {pairingCode: data.pairingCode || data.code};',
'    } catch (error: any) {',
'      logger.error("requestWhatsAppPairingCode failed", error);',
'      throw new HttpsError("internal", error.message || "Could not get pairing code - VM may still be waking up");',
'    }',
'  }',
');'
],
[
'export const requestWhatsAppPairingCode = onCall(',
'  {secrets: [openwaApiKey, openwaUrl, azureAppId, azurePassword, azureTenant, azureSubscriptionId], timeoutSeconds: 120},',
'  async (request) => {',
'    const {garageId, phoneNumber} = request.data;',
'    if (!garageId || !phoneNumber) {',
'      throw new HttpsError("invalid-argument", "garageId and phoneNumber are required");',
'    }',
'    try {',
'      await ensureVmRunning();',
'      await waitForVmReady();',
'      const sessionId = await getGarageSessionId(garageId);',
'      await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/start`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value()},',
'      }, 15000).catch(() => null);',
'      const res = await fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/pairing-code`, {',
'        method: "POST",',
'        headers: {"X-API-Key": openwaApiKey.value(), "Content-Type": "application/json"},',
'        body: JSON.stringify({phoneNumber: phoneNumber.replace(/[^\\d]/g, "")}),',
'      }, 20000);',
'      const data: any = await res.json();',
'      if (!res.ok) throw new HttpsError("internal", data.message || "Failed to get pairing code");',
'      return {pairingCode: data.pairingCode || data.code};',
'    } catch (error: any) {',
'      logger.error("requestWhatsAppPairingCode failed", error);',
'      throw new HttpsError("internal", error.message || "Could not get pairing code - VM may still be waking up");',
'    }',
'  }',
');'
],
"requestWhatsAppPairingCode: add timeouts"
);

fs.writeFileSync(path, content, "utf8");
console.log("");
console.log("TOTAL PATCHES APPLIED: " + patchCount + " / 2");
