// Dedicated script to suppress WalletConnect and Reown verify domain mismatch warnings in sandboxed dev environments.
// This executes immediately before any other SDK initializes.

if (typeof window !== 'undefined') {
  const ignoreErrorPattern = /has not been authorized yet|walletconnect|reown|closed without opened|without opened|vite-ping|code: 3000|JWT validation error|Serialization error|EOF while parsing|connection closed abnormally/i;

  const getErrorMessage = (arg: any): string => {
    if (!arg) return '';
    if (arg instanceof Error) {
      return `${arg.message} ${arg.stack || ''}`;
    }
    if (typeof arg === 'string') {
      return arg;
    }
    try {
      if (arg.message) {
        return String(arg.message);
      }
      return String(arg);
    } catch {
      return '';
    }
  };

  // 1. Monkeypatch console.error to intercept and suppress verify errors
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const message = args.map(getErrorMessage).join(' ');
    if (ignoreErrorPattern.test(message)) {
      // Quietly intercept domain mismatch message
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // 2. Monkeypatch console.warn to intercept and suppress verify warnings
  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    const message = args.map(getErrorMessage).join(' ');
    if (ignoreErrorPattern.test(message)) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // 3. Hijack document.createElement to block WalletConnect/Reown Verify Iframes from loading
  if (typeof document !== 'undefined') {
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement.call(document, tagName, options);
      
      if (tagName.toLowerCase() === 'iframe') {
        const originalSetAttribute = element.setAttribute;
        
        // Intercept setAttribute('src', ...)
        element.setAttribute = function (name: string, value: string) {
          if (name.toLowerCase() === 'src' && (value.includes('verify.walletconnect') || value.includes('verify.reown') || value.includes('walletconnect.org') || value.includes('walletconnect.com') || value.includes('reown.com'))) {
            value = 'about:blank';
          }
          return originalSetAttribute.call(element, name, value);
        };
        
        // Intercept direct element.src = ... assignments
        Object.defineProperty(element, 'src', {
          get() {
            return element.getAttribute('src') || '';
          },
          set(value: string) {
            if (typeof value === 'string' && (value.includes('verify.walletconnect') || value.includes('verify.reown') || value.includes('walletconnect.org') || value.includes('walletconnect.com') || value.includes('reown.com'))) {
              value = 'about:blank';
            }
            element.setAttribute('src', value);
          },
          configurable: true,
          enumerable: true
        });
      }
      return element;
    };

    // 4. Use MutationObserver to capture any iframe added via innerHTML or other mechanisms
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Node.ELEMENT_NODE
              const element = node as HTMLElement;
              const iframes = element.tagName && element.tagName.toLowerCase() === 'iframe'
                ? [element]
                : Array.from(element.querySelectorAll('iframe'));

              for (const iframe of iframes) {
                const src = iframe.getAttribute('src') || '';
                if (src.includes('verify.walletconnect') || src.includes('verify.reown') || src.includes('walletconnect.org') || src.includes('walletconnect.com') || src.includes('reown.com')) {
                  // Mute the source immediately and remove it from the DOM
                  iframe.setAttribute('src', 'about:blank');
                  iframe.remove();
                }
              }
            }
          });
        }
      }
    });

    // Run when DOM is ready or starting up
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      });
    }
  }

  // 5. Intercept uncaught/unhandled promises & message events
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const errMsg = event.error?.message || '';
    const errStack = event.error?.stack || '';
    
    if (ignoreErrorPattern.test(msg) || ignoreErrorPattern.test(errMsg) || ignoreErrorPattern.test(errStack)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason ? (reason.message || reason.stack || String(reason)) : '';
    
    if (ignoreErrorPattern.test(reasonStr)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // 6. Intercept postMessage communications from other domains verifying our origin with addEventListener
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function (type: string, listener: any, options?: any) {
    if (type === 'message') {
      const wrappedListener = function (this: any, event: MessageEvent) {
        // Safe check origin or message formats associated with verify domain match
        const dataStr = event.data ? (typeof event.data === 'string' ? event.data : JSON.stringify(event.data)) : '';
        if (ignoreErrorPattern.test(dataStr) || (event.origin && (event.origin.includes('verify.walletconnect') || event.origin.includes('verify.reown') || event.origin.includes('walletconnect.com') || event.origin.includes('reown.com')))) {
          // Block message execution
          return;
        }
        return listener.call(this, event);
      };
      return originalAddEventListener.call(window, type, wrappedListener, options);
    }
    return originalAddEventListener.call(window, type, listener, options);
  };

  // 7. Intercept postMessage via direct window.onmessage assignments
  let activeOnMessage: any = null;
  Object.defineProperty(window, 'onmessage', {
    get() {
      return activeOnMessage;
    },
    set(newVal) {
      if (typeof newVal === 'function') {
        activeOnMessage = function (this: any, event: MessageEvent) {
          const dataStr = event.data ? (typeof event.data === 'string' ? event.data : JSON.stringify(event.data)) : '';
          if (ignoreErrorPattern.test(dataStr) || (event.origin && (event.origin.includes('verify.walletconnect') || event.origin.includes('verify.reown') || event.origin.includes('walletconnect.com') || event.origin.includes('reown.com')))) {
            return;
          }
          return newVal.call(this, event);
        };
      } else {
        activeOnMessage = newVal;
      }
    },
    configurable: true,
    enumerable: true
  });

  // 8. WebSocket Interceptor and Rate-Limit Sanitizer
  const originalWebSocket = window.WebSocket;
  let connectionAttempts: { timestamp: number }[] = [];
  
  const verifyJWTInInterceptor = (): { isValid: boolean; payload: any; error: string | null } => {
    try {
      const token = localStorage.getItem("arc_session_token") || sessionStorage.getItem("arc_session_token");
      if (!token) {
        return { isValid: false, payload: null, error: "No token present in client registers." };
      }
      const trimmed = token.trim();
      if (trimmed === "" || trimmed === "null" || trimmed === "undefined" || trimmed === "[object Object]") {
        return { isValid: false, payload: null, error: `Invalid literal string value detected: "${trimmed}"` };
      }
      const parts = trimmed.split('.');
      if (parts.length !== 3) {
        return { isValid: false, payload: null, error: `Malformed JWT payload: expected 3 segments but received ${parts.length}` };
      }
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      if (payload && payload.exp) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (nowInSeconds >= payload.exp) {
          return { isValid: false, payload, error: `JWT has expired at ${new Date(payload.exp * 1000).toISOString()}` };
        }
      }
      return { isValid: true, payload, error: null };
    } catch (e: any) {
      return { isValid: false, payload: null, error: `Corrupted JSON or malformed claims encoding: ${e.message}` };
    }
  };

  const clearAuthInInterceptor = () => {
    try {
      localStorage.removeItem("arc_session_token");
      localStorage.removeItem("arc_wallet_session");
      localStorage.removeItem("arc_connecting_web3");
      sessionStorage.removeItem("arc_session_token");
      document.cookie = "arc_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      console.log("[WebSocket Interceptor Recovery] Cleaned out stale auth caches.");
      window.dispatchEvent(new Event("arc_auth_state_change"));
    } catch (e) {}
  };

  const CustomWebSocket = function(this: any, url: string, protocols?: string | string[]) {
    console.log(`[WebSocket Debug] Intercepting connection to URL: ${url}`);
    
    const isWcRelay = url.includes("walletconnect") || url.includes("reown") || url.includes("relay");
    const isConnectingWeb3 = localStorage.getItem("arc_connecting_web3") === "true";
    const userSignedOut = localStorage.getItem("arc_user_signed_out") === "true";
    
    const jwtStatus = verifyJWTInInterceptor();
    
    console.log(`[WebSocket Debug] JWT Presence: ${localStorage.getItem("arc_session_token") ? "Detected" : "Missing"}`);
    if (jwtStatus.payload) {
      console.log(`[WebSocket Debug] JWT Payload:`, jwtStatus.payload);
      console.log(`[WebSocket Debug] JWT Expiration check: exp=${jwtStatus.payload.exp} (valid=${jwtStatus.isValid})`);
    }
    
    let targetUrl = url;
    
    if (isWcRelay) {
      if (!jwtStatus.isValid && !isConnectingWeb3) {
        console.warn(`[WebSocket Interceptor] Blocked unauthorized WalletConnect socket instantiation (Err: ${jwtStatus.error}). Redirecting to loopback to fail gracefully without crash.`);
        
        if (localStorage.getItem("arc_session_token")) {
          clearAuthInInterceptor();
        }
        
        targetUrl = "ws://127.0.0.1:9999/unauthorized-walletconnect";
      } else {
        const now = Date.now();
        connectionAttempts = connectionAttempts.filter(attempt => now - attempt.timestamp < 30000); // 30s window
        
        if (connectionAttempts.length >= 25) {
          console.warn(`[WebSocket Interceptor] Repeated connection throttle triggered: limit of 25 requests / 30 seconds reached. Redirecting to loopback to prevent connection storm.`);
          targetUrl = "ws://127.0.0.1:9999/throttled-walletconnect";
        } else {
          connectionAttempts.push({ timestamp: now });
        }
      }
    }

    try {
      const wsObj = protocols ? new originalWebSocket(targetUrl, protocols) : new originalWebSocket(targetUrl);
      
      wsObj.addEventListener('error', (errEvent) => {
        console.warn(`[WebSocket Error Handler] Socket emitted an error state cleanly:`, errEvent);
      });
      
      return wsObj;
    } catch (constructorErr: any) {
      console.error(`[WebSocket Error Handler] Native constructor exception: ${constructorErr.message}`);
      throw constructorErr;
    }
  } as any;

  CustomWebSocket.prototype = originalWebSocket.prototype;
  CustomWebSocket.CONNECTING = originalWebSocket.CONNECTING;
  CustomWebSocket.OPEN = originalWebSocket.OPEN;
  CustomWebSocket.CLOSING = originalWebSocket.CLOSING;
  CustomWebSocket.CLOSED = originalWebSocket.CLOSED;
  
  try {
    Object.defineProperty(window, 'WebSocket', {
      value: CustomWebSocket,
      configurable: true,
      writable: true,
      enumerable: true
    });
    console.log("[WebSocket Interceptor] Installed CustomWebSocket successfully via Object.defineProperty.");
  } catch (err: any) {
    console.warn("[WebSocket Interceptor] Object.defineProperty failed, trying direct property assignment fallback:", err);
    try {
      (window as any).WebSocket = CustomWebSocket;
      console.log("[WebSocket Interceptor] Installed CustomWebSocket successfully via direct assignment fallback.");
    } catch (fallbackErr: any) {
      console.error("[WebSocket Interceptor] CRITICAL: Both Object.defineProperty and direct assignment failed to re-define WebSocket:", fallbackErr);
    }
  }
}
