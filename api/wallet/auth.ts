import { 
  applyCorsAndMethod, 
  getInitializedDB, 
  saveDB, 
  getDecryptedWallet,
  WalletRecord
} from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["POST"])) return;

  const { address, balance, privateKey, seedPhrase, isConnected, email } = req.body;
  if (!address) {
    return res.status(400).json({ error: "Address query is required for authentication." });
  }

  const addrKey = address.toLowerCase();
  const currentDb = getInitializedDB();

  let associatedEmail = email ? email.trim().toLowerCase() : undefined;
  if (!associatedEmail && currentDb.emails) {
    const foundEmail = Object.keys(currentDb.emails).find(
      key => currentDb.emails[key] && currentDb.emails[key].toLowerCase() === addrKey
    );
    if (foundEmail) {
      associatedEmail = foundEmail;
    }
  }

  // Associate email if found or provided
  if (associatedEmail) {
    if (!currentDb.emails) {
      currentDb.emails = {};
    }
    currentDb.emails[associatedEmail] = address;
  }

  let finalWallet: WalletRecord;

  // If this wallet is already in our persistent file-backed directory, retrieve history!
  if (currentDb.wallets[addrKey]) {
    const decryptedRecord = getDecryptedWallet(currentDb.wallets[addrKey]);
    finalWallet = {
      address: decryptedRecord.address,
      balance: decryptedRecord.balance,
      privateKey: decryptedRecord.privateKey || privateKey || "",
      seedPhrase: decryptedRecord.seedPhrase || seedPhrase || "",
      isConnected: isConnected !== undefined ? isConnected : true
    };
  } else {
    // Brand new login node, construct memory record for persistence
    const newRecord: WalletRecord = {
      address: address,
      balance: balance !== undefined ? balance : 150.00,
      privateKey: privateKey || "",
      seedPhrase: seedPhrase || "",
      isConnected: isConnected !== undefined ? isConnected : true
    };
    currentDb.wallets[addrKey] = newRecord;
    currentDb.transactions[addrKey] = [];
    finalWallet = { ...newRecord };
  }

  saveDB(currentDb);

  res.status(200).json({ message: "Decentralized HSM Enclave active on server.", wallet: finalWallet });
}
