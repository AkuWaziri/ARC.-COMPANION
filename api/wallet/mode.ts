import { applyCorsAndMethod, getInitializedDB, saveDB } from "../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET", "POST"])) return;

  const currentDb = getInitializedDB();

  if (req.method === "POST") {
    const { mode } = req.body;
    if (mode === "live" || mode === "simulated") {
      currentDb.networkMode = mode;
      saveDB(currentDb);
    }
  }

  res.status(200).json({ mode: currentDb.networkMode || "live" });
}
