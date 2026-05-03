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
      origin: async function (origin, callback) {
        if (!origin) return callback(null, true);

        const clients = await getAllClients(); // or cache this

        const allowed = clients.some((client) =>
          client.allowed_origins?.includes(origin),
        );

        if (allowed) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
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
