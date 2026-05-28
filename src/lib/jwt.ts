import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const val = process.env.JWT_SECRET;
  if (!val) throw new Error("JWT_SECRET env var is required");
  return new TextEncoder().encode(val);
}

export interface DesktopTokenPayload {
  userId: string;
  email: string;
  name: string;
  plan: string;
  expiresAt: string;
}

const TOKEN_TTL_DAYS = 30;

export function desktopTokenExpiresAt() {
  return new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function issueDesktopToken(payload: Omit<DesktopTokenPayload, "expiresAt">): Promise<string> {
  const exp = desktopTokenExpiresAt();
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    plan: payload.plan,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifyDesktopToken(token: string): Promise<DesktopTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      plan: payload.plan as string,
      expiresAt: new Date((payload.exp ?? 0) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
