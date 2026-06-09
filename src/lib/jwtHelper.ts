export interface DecodedJWT {
  email: string;
  address: string;
  exp: number;
}

export function verifyStoredJWT(): { isValid: boolean; payload: DecodedJWT | null; error: string | null } {
  let token: string | null = null;
  
  try {
    if (typeof window !== 'undefined') {
      token = localStorage.getItem("arc_session_token");
      if (!token) {
        token = sessionStorage.getItem("arc_session_token");
      }
      
      // Attempt cookie fallback parsing
      if (!token && typeof document !== 'undefined') {
        const match = document.cookie.match(/(^|;\s*)arc_session_token\s*=\s*([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[2]);
        }
      }
    }
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Storage access exception: ${err.message}` };
  }

  if (!token) {
    return { isValid: false, payload: null, error: "No token present in client registers." };
  }

  const trimmed = token.trim();
  if (trimmed === "") {
    return { isValid: false, payload: null, error: "Token is empty." };
  }

  // Catch literal strings signifying unset/broken JSON serialize values
  if (trimmed === "null" || trimmed === "undefined" || trimmed === "[object Object]") {
    return { isValid: false, payload: null, error: `Invalid literal value: "${trimmed}"` };
  }

  // Verify JWT structure
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { isValid: false, payload: null, error: `Malformed JWT format (segments count: ${parts.length})` };
  }

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload) as DecodedJWT;
    
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, payload: null, error: "JWT payload parsed as invalid non-object structure." };
    }

    if (!payload.email) {
      return { isValid: false, payload: null, error: "JWT claims are missing required 'email' attribute." };
    }

    // Verify expiration parameter
    if (payload.exp) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (nowInSeconds >= payload.exp) {
        return { isValid: false, payload, error: `JWT has expired at ${new Date(payload.exp * 1000).toISOString()}` };
      }
    }

    return { isValid: true, payload, error: null };
  } catch (e: any) {
    return { isValid: false, payload: null, error: `Corrupted JWT claims deserialize failure: ${e.message}` };
  }
}

export function clearCachedAuth() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("arc_session_token");
      localStorage.removeItem("arc_wallet_session");
      localStorage.removeItem("arc_connecting_web3");
      sessionStorage.removeItem("arc_session_token");
      
      if (typeof document !== 'undefined') {
        document.cookie = "arc_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      }
      console.log("[JWT Recovery Engine] Purged client active credentials stores.");
      
      // Dispatch authentic change event to inform and bootstrap active frame redirects
      window.dispatchEvent(new Event("arc_auth_state_change"));
    }
  } catch (err) {
    console.warn("[JWT Security] Could not safely clean credentials: ", err);
  }
}
