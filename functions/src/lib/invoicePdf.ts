import PDFDocument from "pdfkit";
import * as admin from "firebase-admin";

export interface InvoiceLineItem {
  description?: string;
  qty?: number;
  unitCost?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * The one place invoice money is computed.
 *
 * The client (InvoiceTemplate, InvoicesPage) and this PDF must agree to the
 * last franc, so the formula lives here and is mirrored by
 * `calculateInvoiceTotals` in the app's shared utils. Tax applies to parts
 * plus labour, matching what the printed invoice shows the customer.
 */
export function calculateTotals(
  lineItems: InvoiceLineItem[],
  laborCost: number,
  taxRate: number
): InvoiceTotals {
  const subtotal = (lineItems || []).reduce(
    (acc, item) => acc + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
    0
  ) + (Number(laborCost) || 0);
  const tax = subtotal * (Number(taxRate) || 0);
  return {subtotal, tax, total: subtotal + tax};
}

export interface InvoicePdfInput {
  garageName: string;
  garageAddress?: string;
  garagePhone?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  invoiceNumber: string;
  issuedAt?: string;
  status: string;
  vehiclePlate?: string;
  vehicleMakeModel?: string;
  vehicleYear?: number;
  lineItems: InvoiceLineItem[];
  laborCost: number;
  taxRate: number;
  currency: string;
}

function money(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString("en-US")} ${currency}`;
}

export function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({margin: 50, size: "A4"});
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const {subtotal, tax, total} = calculateTotals(
      input.lineItems,
      input.laborCost,
      input.taxRate
    );
    const isPaid = input.status === "Paid";

    doc.fontSize(20).text(input.garageName, {align: "center"});
    if (input.garageAddress || input.garagePhone) {
      doc.fontSize(9).fillColor("gray").text(
        [input.garageAddress, input.garagePhone].filter(Boolean).join("  |  "),
        {align: "center"}
      );
      doc.fillColor("black");
    }
    doc.moveDown();

    doc.fontSize(14).text(`Invoice #${input.invoiceNumber}`, {align: "center"});
    doc.fontSize(10)
      .fillColor(isPaid ? "green" : "red")
      .text(isPaid ? "PAID" : "UNPAID", {align: "center"});
    doc.fillColor("black");
    if (input.issuedAt) {
      const issued = new Date(input.issuedAt);
      if (!isNaN(issued.getTime())) {
        doc.fontSize(9).fillColor("gray").text(
          `Issued: ${issued.toISOString().slice(0, 10)}`,
          {align: "center"}
        );
        doc.fillColor("black");
      }
    }
    doc.moveDown();

    doc.fontSize(12).text(`Bill to: ${input.clientName || "Walk-in Client"}`);
    const contact = [input.clientPhone, input.clientEmail]
      .filter(Boolean).join("  |  ");
    if (contact) {
      doc.fontSize(10).fillColor("gray").text(contact);
      doc.fillColor("black");
    }
    doc.moveDown();

    if (input.vehiclePlate || input.vehicleMakeModel) {
      doc.fontSize(11).text("Vehicle:", {underline: true});
      doc.fontSize(10).text(`Registration: ${input.vehiclePlate || "N/A"}`);
      doc.fontSize(10).text(`Make/Model: ${input.vehicleMakeModel || "N/A"}`);
      if (input.vehicleYear) doc.fontSize(10).text(`Year: ${input.vehicleYear}`);
      doc.moveDown();
    }

    doc.fontSize(11).text("Items:", {underline: true});
    doc.moveDown(0.5);
    for (const item of input.lineItems || []) {
      const lineTotal = (Number(item.qty) || 0) * (Number(item.unitCost) || 0);
      doc.fontSize(10).text(
        `${item.description || "Item"}  x${item.qty || 0}  -  ` +
        `${money(lineTotal, input.currency)}`
      );
    }
    if (input.laborCost) {
      doc.fontSize(10).text(
        `Labour Charges  -  ${money(input.laborCost, input.currency)}`
      );
    }

    doc.moveDown();
    doc.fontSize(10).text(
      `Subtotal: ${money(subtotal, input.currency)}`,
      {align: "right"}
    );
    doc.fontSize(10).text(
      `Tax (${((input.taxRate || 0) * 100).toFixed(1)}%): ` +
      `${money(tax, input.currency)}`,
      {align: "right"}
    );
    doc.fontSize(13).text(
      `Grand Total: ${money(total, input.currency)}`,
      {align: "right"}
    );

    doc.moveDown(2);
    doc.fontSize(9).fillColor("gray").text(
      `Thank you for choosing ${input.garageName}.`,
      {align: "center"}
    );

    doc.end();
  });
}

/**
 * Stores the PDF and returns a link OpenWA can fetch.
 *
 * The link must outlive the message: customers open invoices from WhatsApp
 * weeks later. A signed URL is used rather than making the bucket public so
 * one garage can never enumerate another's invoices.
 */
export async function uploadInvoicePdf(
  pdfBuffer: Buffer,
  garageId: string,
  invoiceId: string
): Promise<{url: string; expiresAt: string}> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(`invoices/${garageId}/${invoiceId}.pdf`);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {cacheControl: "private, max-age=0"},
  });

  const expires = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 days
  const [url] = await file.getSignedUrl({action: "read", expires});
  return {url, expiresAt: new Date(expires).toISOString()};
}
