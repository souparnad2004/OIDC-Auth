import { db } from "../../common/db/index.js";
import { ApiError } from "../../common/utils/apiError.js";
import { generateAuthCode, hashAuthCode, verifyPKCE, generateAccessToken, generateIdToken, generateRefreshToken, verifyAccessToken } from "../../common/utils/jwt.js";
import { authorizationCodes, clients, consents, refreshTokens } from "../../common/db/schema.js";
import { and, eq } from "drizzle-orm";
import { exportJWK } from "jose";
import { publicKey } from "../../common/utils/jose.js";
import crypto from "crypto"
import bcrypt from "bcryptjs";

export async function authorize({
  sessionId,
  clientId,
  redirectUri,
  scopes,
  codeChallenge,
  codeChallengeMethod,
}: {
  sessionId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
}) {
  const session = await db.query.sessions.findFirst({
    where: (s, { eq, and, gt }) =>
      and(eq(s.session_id, sessionId), gt(s.expires_at, new Date())),
  });

  if (!session) return { error: "NOT_LOGGED_IN" };

  const client = await db.query.clients.findFirst({
    where: (c, { eq }) => eq(c.client_id, clientId),
  });

  if (!client) throw ApiError.badRequest("Client not found");

  if (!client.redirect_uris.includes(redirectUri)) {
    throw ApiError.badRequest("Invalid uri");
  }

  if (!scopes.includes("openid")) {
    throw ApiError.badRequest("openid scope is required");
  }
  const { code, hashedCode } = generateAuthCode();

  await db.insert(authorizationCodes).values({
    client_id: client.client_id,
    code: hashedCode,
    user_id: session.user_id,
    redirect_uri: redirectUri,
    scopes: scopes.join(" "),
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    code_challenge: codeChallenge ?? null,
    code_challenge_method: codeChallengeMethod ?? null,
    used: false,
  });

  const consent = await concent({
    userId: session.user_id,
    clientId,
    scopes
  })
  

  return {
    code,
    redirectUri,
  };
}

type ConsentInput = {
  userId: string;
  clientId: string;
  scopes: string[];
};

export async function token({
  code,
  client_id,
  redirect_uri,
  code_verifier,
}: {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_verifier: string;
}) {
  const hashedCode = hashAuthCode(code);

  const authCode = await db.query.authorizationCodes.findFirst({
    where: (c, { eq }) => eq(c.code, hashedCode),
  });

  if (!authCode) throw ApiError.notFound("Invalid_grant");
  if (authCode.used) throw ApiError.badRequest("code already used");

  if (authCode.expires_at < new Date())
    throw ApiError.unauthorized("code expired");

  if (authCode.client_id !== client_id)
    throw ApiError.notFound("Invalid client");
  if (authCode.redirect_uri !== redirect_uri)
    throw ApiError.badRequest("invalid_redirect_uri");

  if (authCode.code_challenge) {
    const validPKCE = verifyPKCE(
      code_verifier,
      authCode.code_challenge,
      authCode.code_challenge_method!,
    );

    if (!validPKCE) throw ApiError.badRequest("Invalid code verifier");
  }

  await db
    .update(authorizationCodes)
    .set({ used: true })
    .where(eq(authorizationCodes.code, authCode.code));

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, authCode.user_id),
  });

  if (!user) throw ApiError.notFound("user_not_found");

  const accessToken = await generateAccessToken({
    sub: user.id,
    client_id,
  });

  const idToken = await generateIdToken({
    sub: user.id,
    aud: client_id,
    email: user.email,
    is_verified: user.is_verified!,
    name: user.name,
    nonce: authCode.nonce ?? "",
  });

  const { token: refreshToken, hashedToken } = generateRefreshToken();

  await db.insert(refreshTokens).values({
    token_hash: hashedToken,
    user_id: user.id,
    client_id,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });

  return {
    access_token: accessToken,
    id_token: idToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: 3600,
  };
}

export async function userInfo(accessToken: string){
  const { valid, payload } = await verifyAccessToken(accessToken);

  if (!valid || !payload) {
    throw new Error("invalid_token");
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, payload.sub as string),
  });

  if (!user) throw new Error("user_not_found");

  return {
    sub: user.id,
    email: user.email,
    email_verified: user.is_verified,
    name: user.name,
  };
};

export async function jwks(){
  const jwk = await exportJWK(publicKey);

  return {
    keys: [
      {
        ...jwk,
        alg: "RS256",
        use: "sig",
        kid: "1",
      },
    ],
  };
};

export async function registration({name, redirectUris, isConfidential}: {name: string; redirectUris: string[]; isConfidential?:boolean}) {
    const client_id = crypto.randomUUID();

    let client_secret: string | undefined;
    let client_secret_hash: string | null = null;

    if(isConfidential) {
        client_secret = crypto.randomBytes(32).toString("hex");
        client_secret_hash = await bcrypt.hash(client_secret, 10);
    }

    const [client] = await db.insert(clients).values({
        client_id,
        name,
        redirect_uris: redirectUris,
        client_secret_hash,
        is_confidential: isConfidential ?? true,
    }).returning();

    if(!client) throw ApiError.badRequest("Client registration failed");

    return {
        client_id: client.client_id,
        client_secret,
        name: client.name,
        redirect_uris: client.redirect_uris,
        is_confidential: client.is_confidential
    }
}


export async function getSession(sessionId: string) {
  if (!sessionId) return null;

  const session = await db.query.sessions.findFirst({
    where: (s, { eq, gt, and }) =>
      and(eq(s.session_id, sessionId), gt(s.expires_at, new Date())),
  });

  return session;
}


export async function issueAuthCodeFromConsent({
  sessionId,
  clientId,
  redirectUri,
  scopes,
}: {
  sessionId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}) {
  const session = await db.query.sessions.findFirst({
    where: (s, { eq, and, gt }) =>
      and(eq(s.session_id, sessionId), gt(s.expires_at, new Date())),
  });

  if (!session) throw ApiError.unauthorized("Session expired");

  const { code, hashedCode } = generateAuthCode();

  await db.insert(authorizationCodes).values({
    code: hashedCode,
    client_id: clientId,
    user_id: session.user_id,
    redirect_uri: redirectUri,
    scopes: scopes.join(" "),
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    used: false,
  });

  return { code };
}


export async function concent({
  userId,
  clientId,
  scopes,
}: {
  userId: string;
  clientId: string;
  scopes: string[];
}) {
  const existing = await db.query.consents.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.user_id, userId), eq(c.client_id, clientId)),
  });

  if (!existing) return false;

  const approvedScopes = existing.scopes.split(" ");

  return scopes.every((scope) => approvedScopes.includes(scope));
}

export async function saveConsent({
  userId,
  clientId,
  scopes,
}: {
  userId: string;
  clientId: string;
  scopes: string[];
}) {
  const existing = await db.query.consents.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.user_id, userId), eq(c.client_id, clientId)),
  });

  if (existing) {
    const existingScopes = existing.scopes.split(" ");

    const merged = Array.from(
      new Set([...existingScopes, ...scopes])
    );

    await db
      .update(consents)
      .set({
        scopes: merged.join(" "),
        granted_at: new Date(),
      })
      .where(
        and(
          eq(consents.user_id, userId),
          eq(consents.client_id, clientId)
        )
      );

    return;
  }

  await db.insert(consents).values({
    user_id: userId,
    client_id: clientId,
    scopes: scopes.join(" "),
    granted_at: new Date(),
  });
}

export async function getAllClients() {
  return await db.select().from(clients);
}