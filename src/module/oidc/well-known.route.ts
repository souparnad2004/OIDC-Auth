import { Router } from "express";
import * as oidcController from "./oidc.controller.js";

const router = Router();

router.get("/openid-configuration", oidcController.configuration);
router.get("/jwks.json", oidcController.jwks);

export default router;