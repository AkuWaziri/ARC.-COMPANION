import { Type } from "@google/genai";
import { applyCorsAndMethod, getInitializedDB, ai } from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (!applyCorsAndMethod(req, res, ["POST"])) return;

  const currentDb = getInitializedDB();
  const activeContacts = currentDb.contacts || [];

  let defaultParsed: {
    action: string;
    amount: number;
    token: string;
    recipient: string;
    recipientAddress?: string;
    note: string;
    responseMessage: string;
    isOfflineFallback?: boolean;
  } = {
    action: "unknown",
    amount: 0,
    token: "USDC",
    recipient: "",
    recipientAddress: undefined,
    note: "",
    responseMessage: "I detected a financial intent but I need more details to form a structured transfer payload.",
    isOfflineFallback: true
  };

  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Query text is required" });
    }

    console.log(`Received natural language command: "${text}"`);

    const cleanText = text.toLowerCase();

    // Extract amount
    const amountMatch = cleanText.match(/(?:send|transfer|give|pay|wire)\s+(\d+(?:\.\d+)?)\s*(?:usdc|dollars|coins)?/i);
    if (amountMatch) {
      defaultParsed.action = "send";
      defaultParsed.amount = parseFloat(amountMatch[1]);
    }

    // Find recipient mapping in the statement
    const recipientMatch = cleanText.match(/to\s+(0x[a-fA-F0-9]{40}|[a-zA-Z0-9_]+)/i);
    if (recipientMatch) {
      const rawRec = recipientMatch[1];
      if (rawRec.startsWith("0x")) {
        defaultParsed.recipient = "External Address";
        defaultParsed.recipientAddress = rawRec;
      } else {
        defaultParsed.recipient = rawRec.charAt(0).toUpperCase() + rawRec.slice(1);
        const matchedContact = activeContacts.find(c => c.name.toLowerCase() === rawRec.toLowerCase());
        if (matchedContact) {
          defaultParsed.recipientAddress = matchedContact.address;
        }
      }
    }

    // Parse note
    const noteMatch = cleanText.match(/(?:for|reason:)\s+([a-zA-Z0-9_\s]+)/i);
    if (noteMatch) {
      defaultParsed.note = noteMatch[1].trim();
    }

    // Extra robust check for 0x address
    const ethAddressMatch = text.match(/0x[a-fA-F0-9]{40}/i);
    if (ethAddressMatch) {
      const extractedAddr = ethAddressMatch[0];
      defaultParsed.recipientAddress = extractedAddr;
      const matchedContact = activeContacts.find(c => c.address.toLowerCase() === extractedAddr.toLowerCase());
      defaultParsed.recipient = matchedContact ? matchedContact.name : "External Address";
      if (defaultParsed.action === "unknown") {
        defaultParsed.action = "send";
      }
    }

    if (defaultParsed.action === "send" && defaultParsed.amount > 0 && defaultParsed.recipient) {
      defaultParsed.responseMessage = `I detected your intent to send ${defaultParsed.amount} ${defaultParsed.token} to ${defaultParsed.recipient}${defaultParsed.note ? ` for "${defaultParsed.note}"` : ""}. Please confirm the wallet payload before signing.`;
    }

    // If Gemini API is online, use it for extremely smart parser capabilities
    if (ai) {
      try {
        const prompt = `You are the brain of "AI Money Agent on Arc". Your purpose is to parse a user's financial intent into structured JSON.
Here is the user statement: "${text}"

Here is the current contact memory mapping:
${JSON.stringify(activeContacts, null, 2)}

Provide your output strictly conformant to the requested JSON response Schema. Do not include markdown codeblock tags around the output, return the pure JSON.
If the recipient matches one of our known memories (like "Musa", "Alice", "Bob"), resolve their address.
Otherwise, specify their recipient name, and if they have no address, the client will ask to bind one.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                action: {
                  type: Type.STRING,
                  description: "The parsed financial action: 'send', 'request', 'balance', 'contact', or 'unknown'."
                },
                amount: {
                  type: Type.NUMBER,
                  description: "The numerical value of the token to transfer. Default to 0 if none specified."
                },
                token: {
                  type: Type.STRING,
                  description: "The currency emblem (e.g. 'USDC'). Always 'USDC' unless another is explicitly parsed."
                },
                recipient: {
                  type: Type.STRING,
                  description: "The readable user name for the transaction or memory."
                },
                recipientAddress: {
                  type: Type.STRING,
                  description: "The 0x address resolved. If a known contact name is supplied, copy their mapped address here. If an explicit 0x address is in the instruction, use that. Otherwise leave blank."
                },
                note: {
                  type: Type.STRING,
                  description: "Optional instruction intent note (e.g., 'lunch', 'rent payment')."
                },
                responseMessage: {
                  type: Type.STRING,
                  description: "A natural-sounding summary confirming your analysis of their wallet command."
                }
              },
              required: ["action", "amount", "token", "recipient", "responseMessage"]
            }
          }
        });

        const parsedGeminiText = response.text || "";
        console.log("Raw Gemini parser output:", parsedGeminiText);
        
        let cleanedJsonText = parsedGeminiText.trim();
        if (cleanedJsonText.startsWith("```")) {
          cleanedJsonText = cleanedJsonText.replace(/^```(?:json)?\n?|```$/gi, "").trim();
        }
        
        const jsonParsed = JSON.parse(cleanedJsonText);
        
        if (!jsonParsed.recipientAddress && jsonParsed.recipient) {
          const found = activeContacts.find(c => c.name.toLowerCase() === jsonParsed.recipient.toLowerCase());
          if (found) {
            jsonParsed.recipientAddress = found.address;
          }
        }

        const explicitAddressMatch = text.match(/0x[a-fA-F0-9]{40}/i);
        if (explicitAddressMatch) {
          const extractedAddr = explicitAddressMatch[0];
          jsonParsed.recipientAddress = extractedAddr;
          if (!jsonParsed.recipient || jsonParsed.recipient === "Unknown" || jsonParsed.recipient.startsWith("0x")) {
            const matchedContact = activeContacts.find(c => c.address.toLowerCase() === extractedAddr.toLowerCase());
            jsonParsed.recipient = matchedContact ? matchedContact.name : "External Address";
          }
          if (jsonParsed.action === "unknown") {
            jsonParsed.action = "send";
          }
        }

        return res.status(200).json(jsonParsed);
      } catch (err: any) {
        console.error("Gemini intent parser query failed:", err);
        return res.status(200).json(defaultParsed);
      }
    } else {
      return res.status(200).json(defaultParsed);
    }
  } catch (outerErr: any) {
    console.error("Outer route error inside /api/parse-intent:", outerErr);
    return res.status(200).json(defaultParsed);
  }
}
