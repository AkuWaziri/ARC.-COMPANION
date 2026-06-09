import { applyCorsAndMethod, getInitializedDB, getLiveArcBalance, saveDB } from "../../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  const currentDb = getInitializedDB();
  const addressParam = req.query.address as string;
  if (!addressParam) {
    return res.status(400).json({ error: "Address parameter is required." });
  }

  const address = addressParam.toLowerCase();
  const targetWallet = currentDb.wallets[address];
  let balance = 150.00;
  const networkMode = currentDb.networkMode || "live";

  if (targetWallet) {
    if (networkMode === "live" && targetWallet.address && targetWallet.address !== "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0") {
      try {
        balance = await getLiveArcBalance(targetWallet.address);
        targetWallet.balance = balance;
        currentDb.wallets[address].balance = balance;
        saveDB(currentDb);
      } catch (err) {
        balance = targetWallet.balance;
      }
    } else {
      balance = targetWallet.balance;
    }
  } else {
    if (networkMode === "live" && address.startsWith("0x")) {
      try {
        balance = await getLiveArcBalance(address);
      } catch (err) {
        // use default
      }
    }
  }
  res.status(200).json({ balance });
}
