import { SignJWT, jwtVerify } from "jose";
import { privateKey, publicKey } from "./jose.js";
import type { JWTPayload } from "jose";
import crypto from "crypto";

export const generateAccessToken = async (
  payload: JWTPayload,
): Promise<string> => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .setIssuer("http://localhost:8080") // REQUIRED for OIDC
    .setAudience(payload.client_id as string) // REQUIRED
    .sign(privateKey);
};

export const verifyAccessToken = async (token: string) => {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
      issuer: "http://localhost:8080",
      algorithms: ["RS256"], // Explicitly require RS256
    });
    return { payload, protectedHeader, valid: true };
  } catch (error) {
    return { valid: false, error };
  }
};

export const generateRefreshToken = (): {
  token: string;
  hashedToken: string;
} => {
  const token = crypto.randomBytes(64).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashedToken };
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateAuthCode = (): { code: string; hashedCode: string } => {
  const code = crypto.randomBytes(32).toString("hex");
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  return { code, hashedCode };
};

export const hashAuthCode = (code: string): string => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

export const generatePKCEChallenge = (codeVerifier: string): string => {
  const hash = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return hash;
};

export const verifyPKCE = (
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean => {
  if (method !== "S256") {
    return false;
  }

  const computedChallenge = generatePKCEChallenge(codeVerifier);
  return computedChallenge === codeChallenge;
};

export const generateCodeVerifier = (): string => {
  return crypto.randomBytes(48).toString("base64url");
};

export const generateIdToken = async (payload: {
  sub: string; // user ID
  aud: string; // client ID
  nonce?: string; // from authorization request
  email?: string;
  is_verified?: boolean;
  name?: string;
}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.is_verified ?? false,
    name: payload.name,
    auth_time: now, // Time of authentication
    nonce: payload.nonce,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now)
    .setExpirationTime("1h")
    .setIssuer("http://localhost:8080")
    .setAudience(payload.aud)
    .setJti(crypto.randomBytes(16).toString("hex"))
    .sign(privateKey);
};

export const generateEmailVerificationToken = (): {
  token: string;
  hashedToken: string;
} => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  return { token, hashedToken };
};
