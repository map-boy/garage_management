import {defineSecret} from "firebase-functions/params";

/**
 * Every secret is declared exactly once here so that each function can
 * declare the precise set it needs. Over-declaring secrets on a function
 * slows cold starts and widens blast radius if one leaks, so the groups
 * below are deliberately narrow.
 */
export const openwaApiKey = defineSecret("OPENWA_API_KEY");
export const openwaUrl = defineSecret("OPENWA_URL");
export const azureAppId = defineSecret("AZURE_APP_ID");
export const azurePassword = defineSecret("AZURE_PASSWORD");
export const azureTenant = defineSecret("AZURE_TENANT");
export const azureSubscriptionId = defineSecret("AZURE_SUBSCRIPTION_ID");

/** Secrets needed to talk to the OpenWA HTTP API. */
export const OPENWA_SECRETS = [openwaApiKey, openwaUrl];

/** Secrets needed to start/stop the Azure VM that hosts OpenWA. */
export const AZURE_SECRETS = [
  azureAppId,
  azurePassword,
  azureTenant,
  azureSubscriptionId,
];

/** Secrets needed by anything that both wakes the VM and sends a message. */
export const WHATSAPP_SECRETS = [...OPENWA_SECRETS, ...AZURE_SECRETS];
