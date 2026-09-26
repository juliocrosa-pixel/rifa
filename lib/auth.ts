import crypto from "crypto";

const SECRET = process.env.ADMIN_SECRET || "troque-este-segredo-antes-de-ir-pra-producao";
export const ADMIN_COOKIE_NAME = "rifa_admin_session";
const SESSION_HOURS = 12;

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

// Gera um token "expiraEmMs.assinatura"
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) return false;
  const expiresAt = parseInt(payload, 10);
  return Date.now() < expiresAt;
}

export function checkAdminCredentials(user: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedUser || !expectedPassword) return false;
  return user === expectedUser && password === expectedPassword;
}
