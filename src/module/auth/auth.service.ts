import { db } from "../../common/db/index.js";
import {
  emailVerificationTokens,
  sessions,
  users,
} from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/apiError.js";
import { comparePassword, hashPassword } from "../../common/utils/hash.js";
import {
  generateEmailVerificationToken,
} from "../../common/utils/jwt.js";
import { sendMail } from "../../common/utils/mail.js";
import crypto from "crypto";
import { eq} from "drizzle-orm";

export async function register({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });
  if (existing) throw ApiError.conflict("Email already exists");

  const { token, hashedToken } = generateEmailVerificationToken();

  const [user] = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        name,
        email,
        password_hash: await hashPassword(password),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerified: users.is_verified,
      });

    if (!newUser) throw ApiError.badRequest("User creation failed");

    await tx.insert(emailVerificationTokens).values({
      userId: newUser.id,
      verificationToken: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return [newUser];
  });

  if (!user) throw ApiError.badRequest("User creation failed");

  const verifyUrl = `http://localhost:4000/api/auth/verify-email?token=${token}`;

  await sendMail(
    email,
    "Verify your email",
    `<h2>Verify your email</h2>
    <p>Click below:</p>
    <a href="${verifyUrl}">Verify Email`,
  );

  return user;
}

export async function verifyEmail(token: string) {
  if (!token) throw ApiError.notFound("Token not found");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const tokenData = await db.query.emailVerificationTokens.findFirst({
    where: (t, { eq, and, gt }) =>
      and(eq(t.verificationToken, hashedToken), gt(t.expiresAt, new Date())),
  });

  if (!tokenData) throw ApiError.badRequest("Token is invalid or expired");

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, tokenData.userId),
  });

  if (user?.is_verified) {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.verificationToken, hashedToken));

    throw ApiError.badRequest("Email already verified");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        is_verified: true,
        updated_at: new Date(),
      })
      .where(eq(users.id, tokenData.userId));

    await tx
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.verificationToken, hashedToken));
  });

  return {
    success: true,
    message: "Email verified successfully",
  };
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (!user) throw ApiError.notFound("User not found");

  const passwordMatch = await comparePassword(user.password_hash.trim(), password);

  if (!passwordMatch) throw ApiError.badRequest("Password is incorrect");

  const [session] = await db
    .insert(sessions)
    .values({
      session_id: crypto.randomUUID(),
      user_id: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();

  return session;
}

export async function logout(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.session_id, sessionId),
  });

  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  await db.delete(sessions).where(eq(sessions.session_id, sessionId));

  return {
    success: true,
  };
}

