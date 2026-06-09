import { ethers } from "ethers";
import { 
  applyCorsAndMethod, 
  getInitializedDB, 
  saveDB, 
  getDecryptedWallet, 
  signUserToken,
  WalletRecord
} from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["POST"])) return;

  const { phrase, email } = req.body;
  if (!phrase) {
    return res.status(400).json({ error: "Security recovery phrase or private key is required." });
  }

  try {
    const cleanPhrase = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    let restored: any;
    const isPrivateKey = /^(0x)?[0-9a-fA-F]{64}$/.test(cleanPhrase);

    if (isPrivateKey) {
      const pKey = cleanPhrase.startsWith("0x") ? cleanPhrase : "0x" + cleanPhrase;
      restored = new ethers.Wallet(pKey);
    } else {
      restored = ethers.Wallet.fromPhrase(cleanPhrase);
    }

    const address = restored.address;
    const addrKey = address.toLowerCase();

    const currentDb = getInitializedDB();
    currentDb.emails = currentDb.emails || {};

    const userEmail = email ? email.trim().toLowerCase() : `restored-${addrKey.slice(2, 8)}@arc.network`;

    let walletRecord = currentDb.wallets[addrKey];
    if (walletRecord) {
      walletRecord = getDecryptedWallet(walletRecord);
    } else {
      walletRecord = {
        address,
        balance: 150.00,
        privateKey: restored.privateKey,
        seedPhrase: isPrivateKey ? "Imported Private Key" : cleanPhrase,
        isConnected: true
      };
      currentDb.wallets[addrKey] = walletRecord;
      currentDb.transactions[addrKey] = [];
    }

    currentDb.emails[userEmail] = address;
    saveDB(currentDb);

    const token = signUserToken(userEmail, address);

    res.status(200).json({
      success: true,
      email: userEmail,
      wallet: walletRecord,
      token
    });
  } catch (err: any) {
    console.error("Mnemonic seed restore failed:", err);
    res.status(400).json({ error: `Invalid recovery credentials: ${err.message}` });
  }
}
