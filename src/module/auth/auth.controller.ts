
import { ApiError } from "../../common/utils/apiError.js";
import { ApiResponse } from "../../common/utils/Response.js";
import * as authService from "./auth.service.js"
import type { Request, Response } from "express"

export const register = async(req: Request, res: Response) => {
    const user = await authService.register(req.body);
    return ApiResponse.created(res, user, "Registered successfully");
}

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    throw ApiError.badRequest("Verification token is required");
  }

  const result = await authService.verifyEmail(token);

  return ApiResponse.success(res, result, result.message);
};

export const login = async (req: Request, res: Response) => {
  const session = await authService.login(req.body);

  res.cookie("session_id", session?.session_id, {
    httpOnly: true,
    secure: false, 
    sameSite: "lax",
    expires: session?.expires_at,
  });

  return ApiResponse.success(res, session, "Login successful");
};

export const logout = async (req: Request, res: Response) => {
  const sessionId = req.cookies.session_id;

  if (!sessionId) throw ApiError.badRequest("No session");

  await authService.logout(sessionId);

  res.clearCookie("session_id");

  return ApiResponse.success(res, null, "Logged out");
};


