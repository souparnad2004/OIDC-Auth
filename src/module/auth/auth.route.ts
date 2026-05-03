import { Router } from "express";
import * as authController from "./auth.controller.js";

const router = Router();

// Basic Auth
router.post("/register", authController.register);
router.get("/verify-email", authController.verifyEmail);
router.post("/login", authController.login);
router.post("/logout", authController.logout);


export default router;