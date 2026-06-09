import { applyCorsAndMethod, getInitializedDB } from "../../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  const emailParam = req.query.email as string;
  if (!emailParam) {
    return res.status(400).json({ error: "Email parameter is required." });
  }

  const reqEmail = emailParam.trim().toLowerCase();
  const currentDb = getInitializedDB();
  const emails = currentDb.emails || {};
  const foundAddress = emails[reqEmail];

  if (foundAddress) {
    const foundWallet = currentDb.wallets[foundAddress.toLowerCase()];
    if (foundWallet) {
      // SECURITY EXCLUSION: Never return secret credentials! Return info for directory check only.
      const publicWallet = {
        address: foundWallet.address,
        balance: foundWallet.balance,
        isConnected: true
      };
      return res.status(200).json({ found: true, wallet: publicWallet });
    }
  }
  res.status(200).json({ found: false });
}
