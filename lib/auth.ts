// Login do painel admin. Usa a Web Crypto API (crypto.subtle), que funciona tanto no
// middleware da Vercel (Edge) quanto nas rotas normais (Node).

const SECRET = process.env.ADMIN_SECRET || "troque-este-segredo-antes-de-ir-pra-producao";
export const ADMIN_COOKIE_NAME = "rifa_admin_session";
const SESSION_HOURS = 12;

const encoder = new TextEncoder();

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Gera um token "expiraEmMs.assinatura"
export async function createSessionToken(): Promise<string> {
  const payload = `${Date.now() + SESSION_HOURS * 60 * 60 * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  if (!safeEqual(expected, signature)) return false;
  return Date.now() < parseInt(payload, 10);
}

export function checkAdminCredentials(user: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedUser || !expectedPassword) return false;
  return safeEqual(user, expectedUser) && safeEqual(password, expectedPassword);
}
