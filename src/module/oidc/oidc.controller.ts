import { ApiError } from "../../common/utils/apiError.js";
import type { Request, Response } from "express";
import * as oidcService from "./oidc.service.js";
import path from "path";

export const authorize = async (req: Request, res: Response) => {
  const sessionId = req.cookies.session_id;

  const { client_id, redirect_uri, scope, state } = req.query;

  if (!client_id || !redirect_uri || !scope) {
    throw ApiError.badRequest("Missing required params");
  }

  if (!sessionId) {
    return res.redirect(
      `/login.html?returnTo=${encodeURIComponent(req.originalUrl)}`,
    );
  }

  const scopes = (scope as string).split(" ");

  const session = await oidcService.getSession(sessionId);

  if (!session) {
    return res.redirect(
      `/login.html?returnTo=${encodeURIComponent(req.originalUrl)}`,
    );
  }

  const hasConsent = await oidcService.concent({
    userId: session.user_id,
    clientId: client_id as string,
    scopes,
  });

  if (!hasConsent) {
    return res.redirect(
      `/consent.html?client=${client_id}&scope=${scope}&redirect_uri=${redirect_uri}&state=${state || ""}`,
    );
  }

  const { code } = await oidcService.issueAuthCodeFromConsent({
    sessionId,
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    scopes,
  });

  const redirectUrl = new URL(redirect_uri as string);
  redirectUrl.searchParams.set("code", code);

  if (state) {
    redirectUrl.searchParams.set("state", state as string);
  }

  return res.redirect(redirectUrl.toString());
};

export const getConsentPage = async (req: Request, res: Response) => {
  const sessionId = req.cookies.session_id;

  if (!sessionId) {
    return res.redirect("/login.html");
  }

  const session = await oidcService.getSession(sessionId);

  if (!session) {
    return res.redirect("/login.html");
  }

  return res.sendFile(path.resolve(process.cwd(), "public", "consent.html"));
};

export const postConsent = async (req: Request, res: Response) => {
  const sessionId = req.cookies.session_id;

  if (!sessionId) {
    return res.redirect("/login.html");
  }

  const { client_id, scope, redirect_uri, state, decision } = req.body;

  if (decision === "deny") {
    return res.redirect(`${redirect_uri}?error=access_denied`);
  }
  if (!scope) {
    throw ApiError.badRequest("Scope missing from consent request");
  }
  const scopes = scope.split(" ");

  const session = await oidcService.getSession(sessionId);

  if (!session) {
    return res.redirect("/login.html");
  }

  await oidcService.saveConsent({
    userId: session.user_id,
    clientId: client_id,
    scopes,
  });

  const { code } = await oidcService.issueAuthCodeFromConsent({
    sessionId,
    clientId: client_id,
    redirectUri: redirect_uri,
    scopes,
  });

  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);

  if (state) {
    url.searchParams.set("state", state);
  }

  return res.redirect(url.toString());
};

export const token = async (req: Request, res: Response) => {
  const { code, client_id, redirect_uri, code_verifier, grant_type } = req.body;

  if (grant_type !== "authorization_code") {
    throw ApiError.badRequest("Unsupported grant type");
  }

  const tokens = await oidcService.token({
    code,
    client_id,
    redirect_uri,
    code_verifier,
  });

  res.cookie("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/oauth/token",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const { refresh_token, ...safeTokens } = tokens;

  return res.json(safeTokens);
};

export const userInfo = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing token");
  }

  const accessToken = authHeader.split(" ")[1];

  if (!accessToken) throw ApiError.unauthorized("Token not found");

  const data = await oidcService.userInfo(accessToken);

  return res.json(data);
};

export const jwks = async (req: Request, res: Response) => {
  const data = await oidcService.jwks();
  return res.json(data);
};

const ISSUER = process.env.ISSUER;

export const configuration = (req: Request, res: Response) => {
  res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/api/oauth/authorize`,
    token_endpoint: `${ISSUER}/api/oauth/token`,
    userinfo_endpoint: `${ISSUER}/api/oauth/userinfo`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    code_challenge_methods_supported: ["S256"],
    claims_supported: ["sub", "email", "email_verified", "name"],
  });
};

export const registerClient = async (req: Request, res: Response) => {
  const { name, redirect_uris, is_confidential } = req.body;

  if (!name) {
    throw ApiError.badRequest("Client name required");
  }

  if (!redirect_uris || !Array.isArray(redirect_uris)) {
    throw ApiError.badRequest("redirect_uris must be an array");
  }

  const client = await oidcService.registration({
    name,
    redirectUris: redirect_uris,
    isConfidential: is_confidential,
  });

  return res.status(201).json(client);
};

export const getRegister = (req: Request, res: Response) => {
  return res.redirect("/clientRegistration.html");
};
