import { applyCorsAndMethod, getInitializedDB, defaultWallet } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  const currentDb = getInitializedDB();
  const addressParam = (req.query.address as string) || defaultWallet.address;
  
  if (addressParam) {
    const addrKey = addressParam.toLowerCase();
    const list = currentDb.transactions[addrKey] || [];
    return res.status(200).json(list);
  }

  res.status(200).json([]);
}
