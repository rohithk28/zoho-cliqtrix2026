import express from "express";
import { handleBotWebhook } from "../controllers/botController.js";

const router = express.Router();

router.post("/webhook", handleBotWebhook);

export default router;
