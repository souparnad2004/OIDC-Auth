import express, { urlencoded } from "express";
import { notFound } from "./common/middleware/notFound.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import authRouter from "./module/auth/auth.route.js";
import cookieParser from "cookie-parser";
import oidcRouter from "./module/oidc/oidc.route.js";
import wellKnownRouter from "./module/oidc/well-known.route.js";
import path from "path";
import cors from "cors";
import { getAllClients } from "./module/oidc/oidc.service.js";

export const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: "https://oidc-auth-pfvc.onrender.com/",
      credentials: true
    }),
  );

  app.use(express.static(path.resolve(process.cwd(), "public")));
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/oauth", oidcRouter);
  app.use("/.well-known", wellKnownRouter);
  app.use("/api/auth", authRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
