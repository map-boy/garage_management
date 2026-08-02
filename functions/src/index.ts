import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ maxInstances: 10 });

const atApiKey = defineSecret("AFRICASTALKING_API_KEY");
const atUsername = defineSecret("AFRICASTALKING_USERNAME");

export const sendReminderSms = onCall(
  { secrets: [atApiKey, atUsername] },
  async (request) => {
    const { phoneNumber, message, reminderId } = request.data;

    if (!phoneNumber || !message) {
      throw new HttpsError(
        "invalid-argument",
        "phoneNumber and message are required"
      );
    }

    const AfricasTalking = require("africastalking");
    const at = AfricasTalking({
      apiKey: atApiKey.value(),
      username: atUsername.value(),
    });
    const sms = at.SMS;

    try {
      const result = await sms.send({
        to: [phoneNumber],
        message,
      });

      logger.info("SMS sent", { phoneNumber, reminderId, result });

      if (reminderId) {
        await admin.firestore().collection("reminders").doc(reminderId).update({
          smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true, result };
    } catch (error: any) {
      logger.error("SMS send failed", error);
      throw new HttpsError("internal", error.message || "SMS send failed");
    }
  }
);