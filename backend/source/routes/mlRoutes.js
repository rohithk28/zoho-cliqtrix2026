import express from "express";
import {
  getPrediction,
  getHistory,
  getMetrics,
  getStatus,
  sendAlert
} from "../controllers/mlController.js";

const router = express.Router();

// ML Prediction
router.post("/predict", getPrediction);

// History of predictions
router.get("/history", getHistory);

// Return available metrics
router.get("/metrics", getMetrics);

// Health & status
router.get("/status", getStatus);

// Bot alerts or system alerts
router.post("/alerts", sendAlert);

export default router;
