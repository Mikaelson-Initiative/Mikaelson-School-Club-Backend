import * as admin from "firebase-admin";
import { env } from "./env";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin;
}

export async function verifyFirebaseToken(token: string) {
  try {
    const app = getFirebaseAdmin();
    return await app.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

