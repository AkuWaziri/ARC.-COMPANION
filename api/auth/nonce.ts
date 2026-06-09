import crypto from "crypto";
import { applyCorsAndMethod, getInitializedDB, saveDB } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  // Prevent browser & proxy caching of nonces
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 min validity

  try {
    const currentDb = getInitializedDB();
    if (!currentDb.siweNonces) {
      currentDb.siweNonces = {};
    }
    // Clean expired nonces to avoid db bloat
    const now = Date.now();
    for (const key in currentDb.siweNonces) {
      if (currentDb.siweNonces[key].expires < now) {
        delete currentDb.siweNonces[key];
      }
    }
    currentDb.siweNonces[nonce] = { nonce, expires: expiresAt };
    saveDB(currentDb);
  } catch (err) {
    console.warn("Failed to persist nonce to DB:", err);
  }

  res.status(200).json({ success: true, nonce });
}
