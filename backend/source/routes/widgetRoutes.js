import express from "express";
import { getConfig, updateConfig } from "../controllers/widgetController.js";

const router = express.Router();

router.get("/config", getConfig);
router.post("/config", updateConfig);

export default router;
