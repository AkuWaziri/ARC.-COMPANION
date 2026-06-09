import jwt from "jsonwebtoken";
import { 
  applyCorsAndMethod, 
  getInitializedDB, 
  saveDB, 
  getDecryptedWallet, 
  JWT_SECRET 
} from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  const token = (req.query.token as string) || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined);
  if (!token || token.trim() === "" || token === "null" || token === "undefined") {
    return res.status(401).json({ success: false, error: "Authentication token is required." });
  }

  const currentDb = getInitializedDB();

  // Robust JWT check first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.email) {
      const email = decoded.email.trim().toLowerCase();
      const address = decoded.address || (currentDb.emails ? currentDb.emails[email] : null);

      let userWallet = null;
      if (address) {
        const addrKey = address.toLowerCase();
        if (currentDb.wallets[addrKey]) {
          userWallet = getDecryptedWallet(currentDb.wallets[addrKey]);
        }
      }

      console.log(`[JWT Server Audit] Verified token successfully. Claims: em=${email} ad=${address}`);
      return res.status(200).json({
        success: true,
        email,
        address,
        wallet: userWallet,
        claims: decoded
      });
    }
  } catch (err: any) {
    console.warn(`[JWT Server Warning] Token validation check failed (${err.message}). Checking database session fallback...`);
  }

  const session = currentDb.sessionStore ? currentDb.sessionStore[token] : null;
  if (!session) {
    return res.status(401).json({ success: false, error: "Invalid or expired session. Please login again." });
  }

  // Check if session is older than 7 days (604,800,000 ms)
  if (Date.now() - session.createdAt > 604800000) {
    if (currentDb.sessionStore) {
      delete currentDb.sessionStore[token];
      saveDB(currentDb);
    }
    return res.status(401).json({ success: false, error: "Session expired. Please login again." });
  }

  // Session is valid, get the wallet address for this email from the database
  const email = session.email.trim().toLowerCase();
  const address = currentDb.emails ? currentDb.emails[email] : null;

  let userWallet = null;
  if (address) {
    const addrKey = address.toLowerCase();
    if (currentDb.wallets[addrKey]) {
      userWallet = getDecryptedWallet(currentDb.wallets[addrKey]);
    }
  }

  return res.status(200).json({
    success: true,
    email,
    address,
    wallet: userWallet
  });
}
