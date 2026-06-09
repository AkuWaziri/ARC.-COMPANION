import { applyCorsAndMethod, getRedirectUri } from "../../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  const client_id = process.env.GOOGLE_CLIENT_ID;
  if (client_id) {
    const redirect_uri = encodeURIComponent(getRedirectUri(req));
    const scopes = encodeURIComponent("https://www.googleapis.com/auth/userinfo.email");
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scopes}&state=google-state`;
    return res.status(200).json({ url: oauthUrl, sandbox: false });
  } else {
    // If client credentials are not defined, fallback beautifully to interactive secure visual sandbox OAuth selector
    return res.status(200).json({ url: `/api/auth/google/sandbox`, sandbox: true });
  }
}
