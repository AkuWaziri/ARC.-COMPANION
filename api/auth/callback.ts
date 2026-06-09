import { ethers } from "ethers";
import { 
  applyCorsAndMethod, 
  getInitializedDB, 
  saveDB, 
  getRedirectUri, 
  signUserToken, 
  decryptEnclaveData,
  WalletRecord
} from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  let email = req.query.email as string;
  const code = req.query.code as string;
  let isNew = false;
  let fullWallet = null;

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  // If authentic redirect via Google Accounts client authorization, let's exchange it!
  if (code && !email && client_id && client_secret) {
    try {
      const redirect_uri = getRedirectUri(req);
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id,
          client_secret,
          redirect_uri,
          grant_type: "authorization_code"
        })
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userinfoRes.ok) {
          const profile = await userinfoRes.json();
          email = profile.email;
        }
      }
    } catch (e) {
      console.error("Real Google OAuth code exchange failed:", e);
    }
  }

  if (!email) {
    email = "google-developer@gmail.com";
  }

  const cleanEmail = email.trim().toLowerCase();
  let sessionToken = "";

  const currentDb = getInitializedDB();
  currentDb.emails = currentDb.emails || {};
  let linkedAddress = currentDb.emails[cleanEmail];

  if (!linkedAddress) {
    isNew = true;
    const randomWallet = ethers.Wallet.createRandom();
    const generatedWallet: WalletRecord = {
      address: randomWallet.address,
      balance: 150.00,
      privateKey: randomWallet.privateKey,
      seedPhrase: randomWallet.mnemonic ? randomWallet.mnemonic.phrase : "",
      isConnected: true
    };
    const addrKey = randomWallet.address.toLowerCase();
    currentDb.wallets[addrKey] = generatedWallet;
    currentDb.emails[cleanEmail] = randomWallet.address;
    currentDb.transactions[addrKey] = [];
    saveDB(currentDb);
    linkedAddress = randomWallet.address;
  }

  // Sign token
  sessionToken = signUserToken(cleanEmail, linkedAddress || "");

  if (linkedAddress) {
    const persisted = currentDb.wallets[linkedAddress.toLowerCase()];
    if (persisted) {
      const decPhrase = persisted.seedPhraseEncrypted 
        ? decryptEnclaveData(persisted.seedPhraseEncrypted) 
        : persisted.seedPhrase;
      const decKey = persisted.privateKeyEncrypted 
        ? decryptEnclaveData(persisted.privateKeyEncrypted) 
        : persisted.privateKey;

      fullWallet = {
        address: persisted.address,
        balance: persisted.balance,
        seedPhrase: decPhrase,
        privateKey: decKey,
        isConnected: true
      };
    }
  }

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(`
    <!doctype html>
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: -apple-system, sans-serif;
            text-align: center;
            background: #f8fafc;
            color: #1e293b;
            padding: 40px;
          }
          .spinner {
            border: 4px solid rgba(0,0,0,.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #0b57d0;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-bottom: 20px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Securely restoring account profile...</h2>
        <p>This dialogue window will close automatically.</p>
        
        <script>
          const authData = {
            type: "OAUTH_AUTH_SUCCESS",
            email: ${JSON.stringify(cleanEmail)},
            sessionToken: ${JSON.stringify(sessionToken)},
            wallet: ${JSON.stringify(fullWallet)},
            isNew: ${isNew}
          };

          // Communication to parent iframe or window
          if (window.opener) {
            window.opener.postMessage(authData, "*");
            setTimeout(() => {
              window.close();
            }, 600);
          } else {
            // Callback fallback inside same tab
            localStorage.setItem("arc_oauth_success", JSON.stringify(authData));
            window.location.href = "/";
          }
        </script>
      </body>
    </html>
  `);
}
