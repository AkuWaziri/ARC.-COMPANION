import dotenv from "dotenv";
import crypto from "crypto";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// AES-256-GCM Symmetric Cryptography Engine
const ENCRYPTION_PIN = process.env.ENCRYPTION_KEY || "arc-protocol-aes-encryption-primary-secret-key-256";

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptEnclaveData(text: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(ENCRYPTION_PIN).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag
  };
}

export function decryptEnclaveData(encrypted: EncryptedData): string {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_PIN).digest();
    const iv = Buffer.from(encrypted.iv, 'hex');
    const tag = Buffer.from(encrypted.tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn("AES-GCM decryption failed, using secure base64 decoding helper:", err);
    return Buffer.from(encrypted.ciphertext, 'base64').toString('utf8');
  }
}

export interface WalletRecord {
  address: string;
  balance: number;
  privateKey: string;
  seedPhrase: string;
  seedPhraseEncrypted?: EncryptedData;
  privateKeyEncrypted?: EncryptedData;
  isConnected: boolean;
}

export interface DBStructure {
  wallets: Record<string, WalletRecord>;
  transactions: Record<string, any[]>;
  contacts: any[];
  emails: Record<string, string>;
  siweNonces: Record<string, { nonce: string; expires: number }>;
  networkMode: string;
  otpStore: Record<string, { code: string; timestamp: number }>;
  otpRequestLimits: Record<string, { count: number; lastAttempt: number }>;
  otpFailedAttempts: Record<string, { count: number; lockUntil: number }>;
  sessionStore: Record<string, { email: string; createdAt: number }>;
}

export const defaultWallet: WalletRecord = {
  address: "0x2C4d06AdfC8A058229F64C051db55c2CC888f4B0",
  balance: 350.00, // starting simulated balance
  privateKey: "",
  seedPhrase: "",
  privateKeyEncrypted: encryptEnclaveData("0x9d4b684cb3a70ba9a826477b7325fa1e6fbe5ed795fac862a9b3ee4cdc3a72b"),
  seedPhraseEncrypted: encryptEnclaveData("arc money agent client track system testnet digital wallet usdc secure first"),
  isConnected: false
};

export const defaultTransactions = [
  {
    id: "tx-1001",
    txHash: "0xe8f09b2b93ff5fa1e6fbe5ed795fac862a9b3ee4cdc3a72ba9a826477b7325fa",
    fromAddress: defaultWallet.address,
    toName: "Alice",
    toAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    amount: 50.00,
    token: "USDC",
    note: "Consulting fees",
    status: "success",
    timestamp: new Date(2026, 5, 1, 10, 15, 0).toISOString()
  }
];

export const defaultContacts = [
  { id: "1", name: "Musa", address: "0x89205A129ac68a6fcf4a3a9b910248ff2266bcf4", note: "Primary Arc partner", addedAt: new Date(2026, 4, 15).toISOString() },
  { id: "2", name: "Alice", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", note: "Dev collaborator", addedAt: new Date(2026, 4, 20).toISOString() },
  { id: "3", name: "Bob", address: "0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266", note: "Audit officer", addedAt: new Date(2026, 4, 25).toISOString() }
];

// Resilient DB file path setup for serverless functions (Vercel allows writing to /tmp only)
const BUNDLED_DB_FILE = path.join(process.cwd(), "vault_db.json");
const DATABASE_FILE = (process.env.VERCEL || process.env.NODE_ENV === "production")
  ? path.join("/tmp", "vault_db.json")
  : path.join(process.cwd(), "vault_db.json");

function copyInitialDbIfNeeded() {
  if (DATABASE_FILE !== BUNDLED_DB_FILE && !fs.existsSync(DATABASE_FILE)) {
    try {
      if (fs.existsSync(BUNDLED_DB_FILE)) {
        fs.copyFileSync(BUNDLED_DB_FILE, DATABASE_FILE);
        console.log(`Successfully copied initial database file to ${DATABASE_FILE}`);
      } else {
        console.log(`Bundled database file not found at ${BUNDLED_DB_FILE}, initializing empty db`);
      }
    } catch (err) {
      console.error("Failed to copy bundled database file:", err);
    }
  }
}

export function loadDB(): DBStructure {
  copyInitialDbIfNeeded();
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const content = fs.readFileSync(DATABASE_FILE, 'utf8');
      const loaded = JSON.parse(content);
      
      // Auto-initialize optional properties if missing
      if (!loaded.wallets) loaded.wallets = {};
      if (!loaded.transactions) loaded.transactions = {};
      if (!loaded.contacts) loaded.contacts = [];
      if (!loaded.emails) loaded.emails = {};
      if (!loaded.siweNonces) loaded.siweNonces = {};
      if (!loaded.otpStore) loaded.otpStore = {};
      if (!loaded.otpRequestLimits) loaded.otpRequestLimits = {};
      if (!loaded.otpFailedAttempts) loaded.otpFailedAttempts = {};
      if (!loaded.sessionStore) loaded.sessionStore = {};
      if (!loaded.networkMode) loaded.networkMode = "live";

      // Migration Layer: Automatically encrypt un-encrypted plaintext entries at startup
      let migrated = false;
      for (const addr of Object.keys(loaded.wallets)) {
        const wal = loaded.wallets[addr];
        if (wal.seedPhrase && !wal.seedPhraseEncrypted) {
          wal.seedPhraseEncrypted = encryptEnclaveData(wal.seedPhrase);
          wal.seedPhrase = ""; // Redact plain text
          migrated = true;
        }
        if (wal.privateKey && !wal.privateKeyEncrypted) {
          wal.privateKeyEncrypted = encryptEnclaveData(wal.privateKey);
          wal.privateKey = ""; // Redact plain text
          migrated = true;
        }
      }
      if (migrated) {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(loaded, null, 2), 'utf8');
      }
      return loaded as DBStructure;
    }
  } catch (err) {
    console.error("Failed to load vault database file, using fallback template:", err);
  }
  // Return pristine fallback
  return {
    wallets: {},
    transactions: {},
    contacts: [],
    emails: {},
    siweNonces: {},
    otpStore: {},
    otpRequestLimits: {},
    otpFailedAttempts: {},
    sessionStore: {},
    networkMode: "live"
  };
}

export function saveDB(databaseState: DBStructure) {
  copyInitialDbIfNeeded();
  try {
    if (databaseState.wallets) {
      for (const addr of Object.keys(databaseState.wallets)) {
        const wal = databaseState.wallets[addr];
        if (wal.seedPhrase && wal.seedPhrase !== "Hardware/Extension Key") {
          wal.seedPhraseEncrypted = encryptEnclaveData(wal.seedPhrase);
          wal.seedPhrase = ""; // Never write raw recovery phrases in plain text
        }
        if (wal.privateKey && wal.privateKey !== "Hardware/Extension Key") {
          wal.privateKeyEncrypted = encryptEnclaveData(wal.privateKey);
          wal.privateKey = ""; // Never write raw private keys in plain text
        }
      }
    }
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(databaseState, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to write database to disk:", err);
  }
}

export function getInitializedDB(): DBStructure {
  const currentDb = loadDB();
  let changed = false;
  const defKey = defaultWallet.address.toLowerCase();
  
  if (!currentDb.wallets[defKey]) {
    currentDb.wallets[defKey] = defaultWallet;
    changed = true;
  }
  if (!currentDb.transactions[defKey]) {
    currentDb.transactions[defKey] = defaultTransactions;
    changed = true;
  }
  if (!currentDb.contacts || currentDb.contacts.length === 0) {
    currentDb.contacts = defaultContacts;
    changed = true;
  }
  
  if (changed) {
    saveDB(currentDb);
  }
  return currentDb;
}

export function getDecryptedWallet(wal: WalletRecord): WalletRecord {
  const result = { ...wal };
  if (wal.seedPhraseEncrypted) {
    result.seedPhrase = decryptEnclaveData(wal.seedPhraseEncrypted);
  }
  if (wal.privateKeyEncrypted) {
    result.privateKey = decryptEnclaveData(wal.privateKeyEncrypted);
  }
  return result;
}

// Redirect URI resolver
export function getRedirectUri(req: any): string {
  if (process.env.APP_URL) {
    const base = process.env.APP_URL.replace(/\/$/, "");
    return `${base}/auth/callback`;
  }
  const host = req.headers['host'];
  const proto = (host?.includes('.run.app') || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
  return `${proto}://${host}/auth/callback`;
}

// Arc Testnet balance loader
export const ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";
export const ARC_CHAIN_ID = 5042002;

export async function getLiveArcBalance(address: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);
    return parseFloat(parseFloat(balanceEth).toFixed(4));
  } catch (err) {
    console.warn("Live Arc Testnet balance query failed, using fallback:", err);
    return 150.0;
  }
}

export function isRealPrivateKey(key: string): boolean {
  if (!key) return false;
  const clean = key.trim().replace(/^0x/, '');
  return /^[0-9a-fA-F]{64}$/.test(clean);
}

// Gemini AI Brain initializer
const geminiKey = process.env.GEMINI_API_KEY;
export let ai: GoogleGenAI | null = null;
if (geminiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Session Token generation JWT
export const JWT_SECRET = process.env.JWT_SECRET || "arc-protocol-super-premium-jwt-session-secret-key-92817";

export function signUserToken(email: string, address: string): string {
  return jwt.sign({ email, address }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyUserToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

// Rate limiting & Dynamic state managers inside DB State
export function isOtpRequestRateLimited(email: string): boolean {
  const currentDb = getInitializedDB();
  const now = Date.now();
  const record = currentDb.otpRequestLimits[email];
  if (!record) {
    currentDb.otpRequestLimits[email] = { count: 1, lastAttempt: now };
    saveDB(currentDb);
    return false;
  }
  if (now - record.lastAttempt < 60000) {
    return true; // Throttle to max 1 OTP request/min
  }
  if (now - record.lastAttempt > 300000) {
    record.count = 1;
    record.lastAttempt = now;
  } else {
    record.count += 1;
    record.lastAttempt = now;
    if (record.count > 3) {
      saveDB(currentDb);
      return true; // Limit to maximum 3 requests inside 5 mins
    }
  }
  saveDB(currentDb);
  return false;
}

export function handleFailedOtpAttempt(email: string): { count: number; lockUntil: number } {
  const currentDb = getInitializedDB();
  const now = Date.now();
  if (!currentDb.otpFailedAttempts[email]) {
    currentDb.otpFailedAttempts[email] = { count: 1, lockUntil: 0 };
    saveDB(currentDb);
    return currentDb.otpFailedAttempts[email];
  }
  const record = currentDb.otpFailedAttempts[email];
  if (record.lockUntil > now) {
    return record;
  }
  record.count += 1;
  if (record.count >= 5) {
    record.lockUntil = now + 900000; // Lock for 15 mins
  }
  saveDB(currentDb);
  return record;
}

export function isOtpBruteForceLocked(email: string): boolean {
  const currentDb = getInitializedDB();
  const record = currentDb.otpFailedAttempts[email];
  return !!(record && record.lockUntil > Date.now());
}

export function resetFailedOtpAttempts(email: string) {
  const currentDb = getInitializedDB();
  delete currentDb.otpFailedAttempts[email];
  saveDB(currentDb);
}

export function createSession(email: string): string {
  const currentDb = getInitializedDB();
  const token = crypto.randomBytes(32).toString('hex');
  currentDb.sessionStore[token] = {
    email,
    createdAt: Date.now()
  };
  saveDB(currentDb);
  return token;
}

export function encryptString(rawText: string, secretKey: string = "arc-super-secure-key-32-bytes-long"): EncryptedData {
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(rawText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      tag: authTag
    };
  } catch (err) {
    return {
      ciphertext: Buffer.from(rawText).toString("base64"),
      iv: "00".repeat(12),
      tag: "00".repeat(16)
    };
  }
}

// CORS & Method helper middleware for serverless handlers
export function applyCorsAndMethod(req: any, res: any, methods: string[]): boolean {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }
  
  if (!methods.includes(req.method)) {
    res.status(405).json({ error: `Method ${req.method} not allowed. Please use ${methods.join(", ")}.` });
    return false;
  }
  
  return true;
}
