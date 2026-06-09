import { 
  applyCorsAndMethod, 
  getInitializedDB, 
  saveDB, 
  isOtpBruteForceLocked, 
  handleFailedOtpAttempt, 
  resetFailedOtpAttempts, 
  signUserToken, 
  decryptEnclaveData 
} from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["POST"])) return;

  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and confirmation code are required." });
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim().replace(/[-\s]/g, "");
  
  // Brute force lockout check
  if (isOtpBruteForceLocked(cleanEmail)) {
    return res.status(423).json({ 
      error: "Account validation is locked. Please wait 15 minutes." 
    });
  }

  const currentDb = getInitializedDB();
  const record = currentDb.otpStore[cleanEmail];
  
  if (!record) {
    return res.status(400).json({ error: "No active cryptographic verification session found for this email." });
  }

  // 10-minute expiry validation
  if (Date.now() - record.timestamp > 600000) {
    delete currentDb.otpStore[cleanEmail];
    saveDB(currentDb);
    return res.status(410).json({ error: "The verification code has expired (10-minute validity threshold). Please request a new PIN." });
  }
  
  if (record.code !== cleanCode) {
    const attempts = handleFailedOtpAttempt(cleanEmail);
    const movesLeft = 5 - attempts.count;
    const warnSuffix = movesLeft > 0 
      ? ` Only ${movesLeft} attempts remaining before account lock.`
      : " Excessive invalid OTP submits. Authentication is now locked.";
    return res.status(401).json({ error: "The verification PIN entered is invalid." + warnSuffix });
  }
  
  // Success! Clean active limits
  delete currentDb.otpStore[cleanEmail];
  saveDB(currentDb);
  
  resetFailedOtpAttempts(cleanEmail);
  
  const emails = currentDb.emails || {};
  const linkedAddress = emails[cleanEmail] || "";
  const sessionToken = signUserToken(cleanEmail, linkedAddress);

  let restoredWalletState = null;
  
  if (linkedAddress) {
    const persisted = currentDb.wallets[linkedAddress.toLowerCase()];
    if (persisted) {
      // Decrypt credentials
      const decPhrase = persisted.seedPhraseEncrypted 
        ? decryptEnclaveData(persisted.seedPhraseEncrypted) 
        : persisted.seedPhrase;
      const decKey = persisted.privateKeyEncrypted 
        ? decryptEnclaveData(persisted.privateKeyEncrypted) 
        : persisted.privateKey;
        
      restoredWalletState = {
        address: persisted.address,
        balance: persisted.balance,
        seedPhrase: decPhrase,
        privateKey: decKey,
        isConnected: true
      };
    }
  }

  res.status(200).json({ 
    success: true, 
    sessionToken,
    wallet: restoredWalletState,
    message: "Decentralized email identity verified successfully." 
  });
}
