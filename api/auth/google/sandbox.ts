import { applyCorsAndMethod } from "../../_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["GET"])) return;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(`
    <!doctype html>
    <html>
      <head>
        <title>Google Accounts - Arc Portal Sandbox Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f4f9;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: #1f1f1f;
          }
          .google-box {
            background-color: #ffffff;
            border-radius: 28px;
            padding: 40px;
            width: 360px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            text-align: center;
            border: 1px solid #e3e3e3;
          }
          .g-logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            letter-spacing: -0.5px;
          }
          .blue { color: #4285F4; }
          .red { color: #EA4335; }
          .yellow { color: #FBBC05; }
          .green { color: #34A853; }
          
          h2 {
            font-size: 24px;
            font-weight: 400;
            margin: 16px 0 8px 0;
            color: #1f1f1f;
          }
          p {
            font-size: 14px;
            color: #444746;
            margin-bottom: 32px;
            line-height: 1.5;
          }
          .input-group {
            margin-bottom: 24px;
            text-align: left;
          }
          label {
            font-size: 11px;
            font-weight: 700;
            color: #444746;
            text-transform: uppercase;
            display: block;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          input {
            width: 100%;
            padding: 12px;
            border: 1px solid #747775;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
          }
          input:focus {
            border-color: #0b57d0;
            border-width: 2px;
            padding: 11px;
          }
          .btn-login {
            background-color: #0b57d0;
            color: #ffffff;
            font-weight: 500;
            font-size: 14px;
            padding: 12px 24px;
            border-radius: 100px;
            border: none;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.15s;
          }
          .btn-login:hover {
            background-color: #0842a0;
          }
          .footer-text {
            font-size: 11px;
            color: #747775;
            margin-top: 32px;
          }
        </style>
      </head>
      <body>
        <div class="google-box">
          <div class="g-logo">
            <span class="blue">G</span><span class="red">o</span><span class="yellow">o</span><span class="blue">g</span><span class="green">l</span><span class="red">e</span>
          </div>
          <h2>Sign in</h2>
          <p>to continue to Arc Companion Wallet</p>
          
          <form action="/api/auth/callback" method="GET">
            <div class="input-group">
              <label>Gmail Address</label>
              <input type="email" name="email" required placeholder="name@gmail.com" value="developer@gmail.com">
            </div>
            <button type="submit" class="btn-login">Next</button>
          </form>
          
          <div class="footer-text">
            Secured inside Google Sandboxed OAuth Sandbox Enclave
          </div>
        </div>
      </body>
    </html>
  `);
}
