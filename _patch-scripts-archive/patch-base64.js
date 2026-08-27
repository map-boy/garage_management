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

// ===== PATCH 14: sendWhatsAppTemplate — send PDF as base64 instead of a
// URL. OpenWA's browser-side fetch (Puppeteer/whatsapp-web.js) fails to
// download external URLs even when curl on the same VM succeeds — this
// is a known class of bug with headless Chrome's sandboxed networking.
// Sending base64 directly in the request body skips that fetch entirely. =====
replaceOnce(
[
'async function sendWhatsAppTemplateOnce(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  caption: string,',
'  invoiceNumber: string,',
'  pdfUrl: string',
'): Promise<Response> {',
'  return fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-document`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},',
'    body: JSON.stringify({',
'      chatId: toChatId(toPhone),',
'      url: pdfUrl,',
'      filename: `invoice-${invoiceNumber}.pdf`,',
'      mimetype: "application/pdf",',
'      caption,',
'    }),',
'  }, 30000);',
'}'
],
[
'async function sendWhatsAppTemplateOnce(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  caption: string,',
'  invoiceNumber: string,',
'  pdfBase64: string',
'): Promise<Response> {',
'  return fetchWithTimeout(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-document`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},',
'    body: JSON.stringify({',
'      chatId: toChatId(toPhone),',
'      base64: pdfBase64,',
'      filename: `invoice-${invoiceNumber}.pdf`,',
'      mimetype: "application/pdf",',
'      caption,',
'    }),',
'  }, 30000);',
'}'
],
"sendWhatsAppTemplateOnce: switch from url to base64 param"
);

replaceOnce(
[
'async function sendWhatsAppTemplate(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  customerName: string,',
'  invoiceNumber: string,',
'  amountText: string,',
'  pdfUrl: string',
'): Promise<void> {',
'  const caption = `Hi ${customerName}, your invoice ${invoiceNumber} for ${amountText} has been paid. Thank you!`;',
'  let res = await sendWhatsAppTemplateOnce(apiKey, sessionId, toPhone, caption, invoiceNumber, pdfUrl);',
'  if (!res.ok && res.status >= 500) {',
'    logger.warn("OpenWA document send returned 5xx, retrying once", {status: res.status});',
'    await new Promise((resolve) => setTimeout(resolve, 2500));',
'    res = await sendWhatsAppTemplateOnce(apiKey, sessionId, toPhone, caption, invoiceNumber, pdfUrl);',
'  }',
'  if (!res.ok) {',
'    throw new Error(`OpenWA document send failed: ${await res.text()}`);',
'  }',
'}'
],
[
'async function sendWhatsAppTemplate(',
'  apiKey: string,',
'  sessionId: string,',
'  toPhone: string,',
'  customerName: string,',
'  invoiceNumber: string,',
'  amountText: string,',
'  pdfBase64: string',
'): Promise<void> {',
'  const caption = `Hi ${customerName}, your invoice ${invoiceNumber} for ${amountText} has been paid. Thank you!`;',
'  let res = await sendWhatsAppTemplateOnce(apiKey, sessionId, toPhone, caption, invoiceNumber, pdfBase64);',
'  if (!res.ok && res.status >= 500) {',
'    logger.warn("OpenWA document send returned 5xx, retrying once", {status: res.status});',
'    await new Promise((resolve) => setTimeout(resolve, 2500));',
'    res = await sendWhatsAppTemplateOnce(apiKey, sessionId, toPhone, caption, invoiceNumber, pdfBase64);',
'  }',
'  if (!res.ok) {',
'    throw new Error(`OpenWA document send failed: ${await res.text()}`);',
'  }',
'}'
],
"sendWhatsAppTemplate: switch from url to base64 param"
);

// ===== PATCH 15: onInvoicePaid caller — pass base64 instead of the
// uploaded URL. Keep the Storage upload for record-keeping/audit trail,
// but the WhatsApp send now uses the buffer directly. =====
replaceOnce(
[
'      const pdfUrl = await uploadInvoicePdfAndGetUrl(',
'        pdfBuffer,',
'        garageId,',
'        event.params.invoiceId',
'      );',
'      const sessionId = await getGarageSessionId(garageId);',
'      await ensureSessionActive(sessionId);',
'      await sendWhatsAppTemplate(',
'        openwaApiKey.value(),',
'        sessionId,',
'        formatPhone(client.phone),',
'        client.name || "",',
'        after.id || event.params.invoiceId,',
'        `${total.toLocaleString()} ${garage?.currency || "RWF"}`,',
'        pdfUrl',
'      );'
],
[
'      // Keep the Storage upload for record-keeping, but send the',
'      // WhatsApp document as base64 directly — OpenWA\'s in-browser',
'      // fetch cannot reliably download external URLs even though the',
'      // same URL is fetchable via curl on the same VM.',
'      await uploadInvoicePdfAndGetUrl(',
'        pdfBuffer,',
'        garageId,',
'        event.params.invoiceId',
'      );',
'      const sessionId = await getGarageSessionId(garageId);',
'      await ensureSessionActive(sessionId);',
'      await sendWhatsAppTemplate(',
'        openwaApiKey.value(),',
'        sessionId,',
'        formatPhone(client.phone),',
'        client.name || "",',
'        after.id || event.params.invoiceId,',
'        `${total.toLocaleString()} ${garage?.currency || "RWF"}`,',
'        pdfBuffer.toString("base64")',
'      );'
],
"onInvoicePaid: pass pdfBuffer as base64 instead of signed URL"
);

fs.writeFileSync(path, content, "utf8");
console.log("");
console.log("TOTAL PATCHES APPLIED: " + patchCount + " / 3");
