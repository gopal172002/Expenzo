const TOKEN_KEY = "allpay_token";

let cachedToken: string | null | undefined;

export function getAuthToken(): string | null {
  if (cachedToken === undefined) {
    cachedToken = localStorage.getItem(TOKEN_KEY);
  }
  return cachedToken;
}

export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}
