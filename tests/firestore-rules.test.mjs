import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

// Security tests for firestore.rules.
//
// Run with:  npm run test:rules
// (starts the Firestore emulator, which requires Java, and executes this file)
//
// Firestore combines rules with OR, so a broad wildcard match can silently
// re-grant what a specific rule withholds. That is not visible by reading the
// file — it has to be executed. Every "cannot" case below is an attack that
// was reachable at some point in this project's history.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES = fs.readFileSync(
  process.argv[2] || path.join(__dirname, "..", "firestore.rules"),
  "utf8"
);

const testEnv = await initializeTestEnvironment({
  projectId: "demo-garage",
  firestore: {rules: RULES, host: "127.0.0.1", port: 8080},
});

// --- Seed identities and baseline documents (rules bypassed) -------------
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, "users/owner1"), {role: "owner", garageId: "garageA"});
  await setDoc(doc(db, "users/tech1"), {role: "technician", garageId: "garageA"});
  await setDoc(doc(db, "users/owner2"), {role: "owner", garageId: "garageB"});
  await setDoc(doc(db, "users/boss1"), {role: "BOSS", garageId: "garageA"});

  await setDoc(doc(db, "garages/garageA"), {
    garageName: "A Garage",
    ownerId: "owner1",
    currency: "RWF",
    whatsappMessagesUsed: 10,
    whatsappMessagesLimit: 1000,
    whatsappSessionId: "sess-a",
  });
  await setDoc(doc(db, "garages/garageB"), {
    garageName: "B Garage", ownerId: "owner2",
  });
  await setDoc(doc(db, "garages/garageA/invoices/INV1"), {
    id: "INV1", clientId: "c1", status: "Unpaid",
    lineItems: [], laborCost: 0, taxRate: 0.18,
    whatsappPaid: {state: "sent", attempts: 1},
  });
  await setDoc(doc(db, "garages/garageA/whatsappLogs/log1"), {outcome: "sent"});
});

const owner1 = testEnv.authenticatedContext("owner1").firestore();
const tech1 = testEnv.authenticatedContext("tech1").firestore();
const owner2 = testEnv.authenticatedContext("owner2").firestore();
const boss1 = testEnv.authenticatedContext("boss1").firestore();
const anon = testEnv.unauthenticatedContext().firestore();

const results = [];
async function check(name, promise) {
  try {
    await promise;
    results.push(["PASS", name]);
  } catch (e) {
    results.push(["FAIL", `${name} :: ${e.message}`]);
  }
}

// --- The attacks that must be blocked -----------------------------------
await check("anonymous cannot read a garage",
  assertFails(getDoc(doc(anon, "garages/garageA"))));

await check("staff cannot raise their own message limit",
  assertFails(updateDoc(doc(owner1, "garages/garageA"),
    {whatsappMessagesLimit: 999999})));

await check("staff cannot reset their used counter",
  assertFails(updateDoc(doc(owner1, "garages/garageA"),
    {whatsappMessagesUsed: 0})));

await check("staff cannot hijack the WhatsApp session id",
  assertFails(updateDoc(doc(owner1, "garages/garageA"),
    {whatsappSessionId: "stolen-session"})));

await check("staff cannot clear an invoice delivery record (replay guard)",
  assertFails(updateDoc(doc(owner1, "garages/garageA/invoices/INV1"),
    {whatsappPaid: {state: "pending"}})));

await check("staff cannot create an invoice pre-seeded with a delivery record",
  assertFails(setDoc(doc(owner1, "garages/garageA/invoices/INV_NEW"),
    {id: "INV_NEW", status: "Unpaid", whatsappPaid: {state: "sent"}})));

await check("another garage's owner cannot read garage A",
  assertFails(getDoc(doc(owner2, "garages/garageA"))));

await check("another garage's owner cannot read garage A invoices",
  assertFails(getDoc(doc(owner2, "garages/garageA/invoices/INV1"))));

await check("nobody can write the audit log from a client",
  assertFails(addDoc(collection(owner1, "garages/garageA/whatsappLogs"),
    {outcome: "forged"})));

await check("technician cannot read the audit log",
  assertFails(getDoc(doc(tech1, "garages/garageA/whatsappLogs/log1"))));

await check("user cannot escalate their own role",
  assertFails(updateDoc(doc(owner1, "users/owner1"), {role: "BOSS"})));

await check("user cannot move themselves to another garage",
  assertFails(updateDoc(doc(owner1, "users/owner1"), {garageId: "garageB"})));

await check("system/vmState is not client readable",
  assertFails(getDoc(doc(owner1, "system/vmState"))));

await check("technician cannot delete an invoice",
  assertFails(deleteDoc(doc(tech1, "garages/garageA/invoices/INV1"))));

// --- The legitimate work that must still succeed -------------------------
await check("owner reads their own garage",
  assertSucceeds(getDoc(doc(owner1, "garages/garageA"))));

await check("owner edits garage settings",
  assertSucceeds(updateDoc(doc(owner1, "garages/garageA"),
    {garageName: "A Garage Ltd", taxRate: 0.18})));

await check("technician creates a job card",
  assertSucceeds(setDoc(doc(tech1, "garages/garageA/jobs/J1"),
    {id: "J1", status: "Pending", vehicleId: "v1"})));

await check("staff creates an invoice",
  assertSucceeds(setDoc(doc(owner1, "garages/garageA/invoices/INV2"),
    {id: "INV2", clientId: "c1", status: "Unpaid", lineItems: [],
      laborCost: 0, taxRate: 0.18})));

await check("staff marks an invoice paid",
  assertSucceeds(updateDoc(doc(owner1, "garages/garageA/invoices/INV1"),
    {status: "Paid"})));

await check("manager reads the audit log",
  assertSucceeds(getDoc(doc(owner1, "garages/garageA/whatsappLogs/log1"))));

await check("BOSS reads any garage",
  assertSucceeds(getDoc(doc(boss1, "garages/garageB"))));

await check("staff reads clients",
  assertSucceeds(getDoc(doc(owner1, "garages/garageA/clients/c1"))));

// Archive record chunks live one level deeper than the collection wildcard
// reaches, so they need their own rule — without it, closing a month fails.
await check("manager writes an archive record chunk",
  assertSucceeds(setDoc(
    doc(owner1, "garages/garageA/archives/arch1/records/jobs_0000"),
    {kind: "jobs", index: 0, rows: []})));

await check("staff reads an archive record chunk",
  assertSucceeds(getDoc(
    doc(tech1, "garages/garageA/archives/arch1/records/jobs_0000"))));

await check("another garage cannot read archive record chunks",
  assertFails(getDoc(
    doc(owner2, "garages/garageA/archives/arch1/records/jobs_0000"))));

await check("technician cannot write an archive record chunk",
  assertFails(setDoc(
    doc(tech1, "garages/garageA/archives/arch1/records/jobs_0001"),
    {kind: "jobs", index: 1, rows: []})));

await testEnv.cleanup();

const failed = results.filter(([s]) => s === "FAIL");
for (const [status, name] of results) {
  console.log(`${status === "PASS" ? "  ok  " : " FAIL "} ${name}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
