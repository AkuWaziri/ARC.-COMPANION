import { applyCorsAndMethod, getInitializedDB, getDecryptedWallet, getLiveArcBalance, defaultWallet, saveDB } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  const currentDb = getInitializedDB();
  const defaultKey = defaultWallet.address.toLowerCase();
  const fallbackWallet = currentDb.wallets[defaultKey] ? getDecryptedWallet(currentDb.wallets[defaultKey]) : defaultWallet;

  const addressParam = (req.query.address as string);
  if (!addressParam) {
    return res.status(200).json(fallbackWallet);
  }

  const addrKey = addressParam.toLowerCase();
  let targetWallet = currentDb.wallets[addrKey] ? getDecryptedWallet(currentDb.wallets[addrKey]) : fallbackWallet;

  const networkMode = currentDb.networkMode || "live";

  if (networkMode === "live" && targetWallet && targetWallet.address && targetWallet.address !== "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0") {
    const liveBal = await getLiveArcBalance(targetWallet.address);
    targetWallet.balance = liveBal;
    
    if (currentDb.wallets[addrKey]) {
      currentDb.wallets[addrKey].balance = liveBal;
      saveDB(currentDb);
    }
  }
  res.status(200).json(targetWallet);
}
