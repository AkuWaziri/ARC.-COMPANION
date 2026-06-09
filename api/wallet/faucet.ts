import { applyCorsAndMethod, getInitializedDB, defaultWallet, saveDB } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["POST"])) return;

  const currentDb = getInitializedDB();
  const addressParam = req.body.address || defaultWallet.address;
  if (!addressParam) {
    return res.status(400).json({ error: "No wallet address specified for faucet." });
  }

  const addrKey = addressParam.toLowerCase();
  let targetWallet = currentDb.wallets[addrKey];

  if (targetWallet) {
    targetWallet.balance += 100;
  } else {
    targetWallet = {
      address: addressParam,
      balance: 150 + 100, // 150 starting + 100 faucet
      privateKey: "",
      seedPhrase: "",
      isConnected: true
    };
    currentDb.wallets[addrKey] = targetWallet;
  }

  saveDB(currentDb);
  
  res.status(200).json({ message: "100 Test USDC minted successfully.", newBalance: targetWallet.balance });
}
