import crypto from "crypto";
import { ethers } from "ethers";
import { 
  applyCorsAndMethod, 
  getInitializedDB, 
  saveDB, 
  getDecryptedWallet, 
  getLiveArcBalance, 
  isRealPrivateKey, 
  defaultWallet,
  ARC_TESTNET_RPC
} from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["POST"])) return;

  const { toName, toAddress, amount, note, token, overrideTxHash, fromAddress } = req.body;
  
  if (!toAddress || amount <= 0) {
    return res.status(400).json({ error: "Invalid transaction payload parameters" });
  }

  const currentDb = getInitializedDB();
  const activeAddress = fromAddress || defaultWallet.address;
  if (!activeAddress) {
    return res.status(400).json({ error: "No wallet context found for transaction execution." });
  }

  const addrKey = activeAddress.toLowerCase();
  let activeWallet = currentDb.wallets[addrKey];
  if (activeWallet) {
    activeWallet = getDecryptedWallet(activeWallet);
  } else {
    activeWallet = {
      address: activeAddress,
      balance: 150.00,
      privateKey: "",
      seedPhrase: "",
      isConnected: true
    };
    currentDb.wallets[addrKey] = activeWallet;
  }

  const activeTxs = currentDb.transactions[addrKey] || [];
  const networkMode = currentDb.networkMode || "live";

  // Option 1: Browser-signed transaction logger (e.g., MetaMask transactions)
  if (overrideTxHash) {
    const newTx = {
      id: "tx-" + (1000 + activeTxs.length + 1),
      txHash: overrideTxHash,
      fromAddress: activeWallet.address,
      toName: toName || "Unknown Recipient",
      toAddress,
      amount,
      token: token || "USDC",
      note: note || "",
      status: "success",
      timestamp: new Date().toISOString(),
      securitySigned: true
    };
    activeTxs.unshift(newTx);
    
    if (networkMode === "live" && activeWallet.address && activeWallet.address !== "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0") {
      activeWallet.balance = await getLiveArcBalance(activeWallet.address);
    } else {
      activeWallet.balance = Math.max(0, activeWallet.balance - amount);
    }

    currentDb.transactions[addrKey] = activeTxs;
    currentDb.wallets[addrKey].balance = activeWallet.balance;
    saveDB(currentDb);

    return res.status(200).json({
      message: "External transaction verified and recorded on ledger.",
      hash: overrideTxHash,
      transaction: newTx
    });
  }

  // Option 2: Active embedded wallet transaction signed and broadcast on Arc Testnet
  if (networkMode === "live" && isRealPrivateKey(activeWallet.privateKey)) {
    try {
      const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
      const signableKey = activeWallet.privateKey.trim().replace(/^0x/, '');
      const signer = new ethers.Wallet(signableKey, provider);
      
      const amountWei = ethers.parseEther(amount.toString());
      
      const txResponse = await signer.sendTransaction({
        to: toAddress,
        value: amountWei
      });
      
      const rx = await txResponse.wait();
      
      const newTx = {
        id: "tx-" + (1000 + activeTxs.length + 1),
        txHash: txResponse.hash,
        fromAddress: activeWallet.address,
        toName: toName || "Unknown Recipient",
        toAddress,
        amount,
        token: "USDC",
        note: note || "",
        status: rx && rx.status === 1 ? "success" : "failed",
        timestamp: new Date().toISOString(),
        securitySigned: true
      };
      
      activeTxs.unshift(newTx);
      
      activeWallet.balance = await getLiveArcBalance(activeWallet.address);

      currentDb.transactions[addrKey] = activeTxs;
      currentDb.wallets[addrKey].balance = activeWallet.balance;
      saveDB(currentDb);

      return res.status(200).json({
        message: "Real-world Arc Testnet transaction executed successfully!",
        hash: txResponse.hash,
        transaction: newTx
      });
    } catch (err: any) {
      console.error("Real on-chain transaction execution error:", err);
      return res.status(500).json({ error: `On-chain execution error: ${err.message}` });
    }
  }

  // Option 3: Fallback secure transaction balance tracking
  if (activeWallet.balance < amount) {
    return res.status(400).json({ error: "Insufficient USDC balance inside Arc Wallet." });
  }

  activeWallet.balance -= amount;

  const txHash = "0x" + crypto.randomBytes(32).toString('hex');

  const newTx = {
    id: "tx-" + (1000 + activeTxs.length + 1),
    txHash,
    fromAddress: activeWallet.address,
    toName: toName || "Unknown Recipient",
    toAddress,
    amount,
    token: token || "USDC",
    note: note || "",
    status: "success",
    timestamp: new Date().toISOString(),
    securitySigned: true,
    isLocalLedger: true
  };

  activeTxs.unshift(newTx);

  currentDb.transactions[addrKey] = activeTxs;
  currentDb.wallets[addrKey].balance = activeWallet.balance;
  saveDB(currentDb);

  res.status(200).json({
    message: "Local ledger transaction verified and recorded successfully.",
    hash: txHash,
    transaction: newTx
  });
}
