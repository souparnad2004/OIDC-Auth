import { Router } from "express";
import * as oidcController from "./oidc.controller.js";

const router = Router();

router.get("/authorize", oidcController.authorize);

router.post("/token", oidcController.token);

router.get("/userinfo", oidcController.userInfo);

router.post("/registration", oidcController.registerClient);
router.get("/registration", oidcController.getRegister);

router.get("/jwks", oidcController.jwks);

router.get("/.well-known/openid-configuration", oidcController.configuration);

router.get("/login", (req, res) => {
  res.sendFile("login.html", {
    root: process.cwd() + "/public",
  });
});

router.get("/consent", oidcController.getConsentPage);

router.post("/consent", oidcController.postConsent);

export default router;