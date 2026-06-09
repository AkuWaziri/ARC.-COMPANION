import { applyCorsAndMethod } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;
  res.status(200).json({ status: "ok" });
}
