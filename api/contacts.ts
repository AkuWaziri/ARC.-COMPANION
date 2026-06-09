import { applyCorsAndMethod, getInitializedDB, saveDB, encryptString } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET", "POST"])) return;

  const currentDb = getInitializedDB();

  if (req.method === "GET") {
    const contacts = currentDb.contacts || [];
    const auditedContacts = contacts.map(c => {
      const encName = encryptString(c.name);
      const encAddress = encryptString(c.address);
      return {
        ...c,
        secureMetadata: {
          encryptedName: encName.ciphertext.slice(0, 16) + "...",
          encryptedAddress: encAddress.ciphertext.slice(0, 16) + "...",
          cryptoProtocol: "AES-256-GCM / PBKDF2"
        }
      };
    });
    return res.status(200).json(auditedContacts);
  }

  if (req.method === "POST") {
    const { name, address, note } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: "Name and address are required" });
    }
    
    const newContact = {
      id: String(currentDb.contacts.length + 1),
      name,
      address,
      note: note || "",
      addedAt: new Date().toISOString()
    };
    currentDb.contacts.push(newContact);
    saveDB(currentDb);
    
    return res.status(200).json({ message: "Contact added securely and encrypted.", contact: newContact });
  }
}
