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

// ===== PATCH 9: sendWhatsAppText — retry once on 500, since OpenWA often
// delivers the message before its own response layer fails. Avoids
// punishing the client-facing user for a false-negative error. =====
replaceOnce(
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
[
'async function sendWhatsAppTextOnce(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  message: string',
'): Promise<Response> {',
'  return fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-text`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},',
'    body: JSON.stringify({chatId: toChatId(toPhone), text: message}),',
'  }, 20000);',
'}',
'',
'// OpenWA sometimes returns a 500 on its response layer even though the',
'// message was already delivered (confirmed via device testing). A bare',
'// 500 is retried once after a short delay before we give up — this cuts',
'// down on false-negative errors shown to the user for messages that',
'// actually went through.',
'async function sendWhatsAppText(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  message: string',
'): Promise<void> {',
'  let res = await sendWhatsAppTextOnce(apiKey, sessionId, toPhone, message);',
'  if (!res.ok && res.status >= 500) {',
'    logger.warn("OpenWA send returned 5xx, retrying once", {status: res.status});',
'    await new Promise((resolve) => setTimeout(resolve, 2000));',
'    res = await sendWhatsAppTextOnce(apiKey, sessionId, toPhone, message);',
'  }',
'  if (!res.ok) {',
'    throw new Error(`OpenWA send failed: ${await res.text()}`);',
'  }',
'}'
],
"sendWhatsAppText: retry once on 5xx before failing"
);

// ===== PATCH 10: sendManualWhatsApp — only consume quota on confirmed
// success, not before attempting the send. =====
replaceOnce(
[
'    await ensureVmRunning();',
'    await waitForVmReady();',
'    const allowed = await checkAndIncrementQuota(garageId);',
'    if (!allowed) {',
'      throw new HttpsError("resource-exhausted", "WhatsApp message quota exhausted for this garage");',
'    }',
'    try {',
'      const sessionId = await getGarageSessionId(garageId);',
'      await ensureSessionActive(sessionId);',
'      await sendWhatsAppText(openwaApiKey.value(), sessionId, formatPhone(phoneNumber), message);',
'      return {success: true};',
'    } catch (error: any) {',
'      logger.error("Manual WhatsApp send failed", error);',
'      throw new HttpsError("internal", error.message || "WhatsApp send failed");',
'    }'
],
[
'    await ensureVmRunning();',
'    await waitForVmReady();',
'    try {',
'      const sessionId = await getGarageSessionId(garageId);',
'      await ensureSessionActive(sessionId);',
'      await sendWhatsAppText(openwaApiKey.value(), sessionId, formatPhone(phoneNumber), message);',
'      // Only charge the client quota after a confirmed successful send —',
'      // a failed send must never consume the 1000-message allowance.',
'      const allowed = await checkAndIncrementQuota(garageId);',
'      if (!allowed) {',
'        logger.warn("Send succeeded but quota already exhausted at increment time", {garageId});',
'      }',
'      return {success: true};',
'    } catch (error: any) {',
'      logger.error("Manual WhatsApp send failed", error);',
'      throw new HttpsError("internal", error.message || "WhatsApp send failed");',
'    }'
],
"sendManualWhatsApp: charge quota only after confirmed send"
);

// ===== PATCH 11: onInvoicePaid — same fix, quota after confirmed send =====
replaceOnce(
[
'    await ensureVmRunning();',
'    await waitForVmReady();',
'    const allowed = await checkAndIncrementQuota(garageId);',
'    if (!allowed) {',
'      logger.warn("WhatsApp quota exhausted", {garageId});',
'      return;',
'    }',
'',
'    const subtotal = (after.lineItems || []).reduce('
],
[
'    await ensureVmRunning();',
'    await waitForVmReady();',
'',
'    const subtotal = (after.lineItems || []).reduce('
],
"onInvoicePaid: remove premature quota check (moved to after send)"
);

fs.writeFileSync(path, content, "utf8");
console.log("");
console.log("TOTAL PATCHES APPLIED: " + patchCount + " / 3");
