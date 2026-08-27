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

// ===== PATCH 12: sendWhatsAppTemplate — add timeout + retry-once on 5xx.
// The "Error downloading media" errors in OpenWA's own logs happen on
// this exact send-document call, so it needs the same resilience as
// sendWhatsAppText. =====
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
'  const res = await fetch(`${openwaUrl.value()}/api/sessions/${sessionId}/messages/send-document`, {',
'    method: "POST",',
'    headers: {"X-API-Key": apiKey, "Content-Type": "application/json"},',
'    body: JSON.stringify({',
'      chatId: toChatId(toPhone),',
'      url: pdfUrl,',
'      filename: `invoice-${invoiceNumber}.pdf`,',
'      mimetype: "application/pdf",',
'      caption,',
'    }),',
'  });',
'  if (!res.ok) {',
'    throw new Error(`OpenWA document send failed: ${await res.text()}`);',
'  }',
'}'
],
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
'}',
'',
'// Same OpenWA engine bug that hits sendWhatsAppText also hits document',
'// sends (confirmed via container logs: "Error downloading media" fires',
'// on this exact call). Retry once on 5xx before giving up.',
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
"sendWhatsAppTemplate: add timeout + retry-once on 5xx"
);

// ===== PATCH 13: onInvoicePaid — restore quota check, AFTER confirmed send =====
replaceOnce(
[
'      logger.info("WhatsApp paid notification sent", {garageId, clientId});',
'    } catch (error: any) {',
'      logger.error("WhatsApp send failed", error);',
'    }',
'  }',
');'
],
[
'      logger.info("WhatsApp paid notification sent", {garageId, clientId});',
'      // Only charge the client quota after a confirmed successful send —',
'      // a failed send must never consume the 1000-message allowance.',
'      const allowed = await checkAndIncrementQuota(garageId);',
'      if (!allowed) {',
'        logger.warn("Send succeeded but quota already exhausted at increment time", {garageId});',
'      }',
'    } catch (error: any) {',
'      logger.error("WhatsApp send failed", error);',
'    }',
'  }',
');'
],
"onInvoicePaid: charge quota only after confirmed send"
);

fs.writeFileSync(path, content, "utf8");
console.log("");
console.log("TOTAL PATCHES APPLIED: " + patchCount + " / 2");
