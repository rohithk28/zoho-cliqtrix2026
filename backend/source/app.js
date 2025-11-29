import express from "express";
import cors from "cors";
import qs from "qs";
import axios from "axios";   // <-- ADD THIS

import botRoutes from "./routes/botRoutes.js";
import widgetRoutes from "./routes/widgetRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";
import dbRoutes from "./routes/dbRoutes.js";

const app = express();

// ===============================================================
// BASIC PARSERS
// ===============================================================
app.use(cors());
app.use(express.urlencoded({ extended: false }));  // needed for Zoho
app.use(express.json());

// ===============================================================
// ZOHO BODY NORMALIZER — MUST RUN BEFORE ROUTES
// Converts metrics[cpu] → metrics: { cpu: 55 }
// ===============================================================
app.use((req, res, next) => {
  try {
    let raw = req.body;

    if (
      req.method === "POST" &&
      req.headers["content-type"] &&
      req.headers["content-type"].includes("application/x-www-form-urlencoded")
    ) {
      console.log("🔧 Zoho x-www-form-urlencoded detected → parsing...");
      raw = qs.parse(req.body);
    }

    let clean = {};
    let metrics = {};

    for (const key in raw) {
      if (key.startsWith("metrics[")) {
        const inner = key.substring(8, key.length - 1);
        metrics[inner] = Number(raw[key]);
      } else {
        clean[key] = raw[key];
      }
    }

    if (Object.keys(metrics).length > 0) {
      clean.metrics = metrics;
      console.log("📌 Normalized Metrics:", metrics);
    }

    req.body = clean;
  } catch (err) {
    console.error("❌ Zoho parsing error:", err);
  }

  next();
});

// ===============================================================
// ROUTES (Middlewares above MUST run first)
// ===============================================================
app.use("/api/bot", botRoutes);
app.use("/api/widget", widgetRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/db", dbRoutes);

app.get("/", (req, res) => {
  res.send({ status: "Backend running successfully" });
});


// ===============================================================
// 🔥 ADD THIS — DIRECT /predict ROUTE FOR ZOHO SMALL CARD
// ===============================================================
app.post("/predict", async (req, res) => {
  try {
    console.log("Node → ML /predict payload:", req.body);

    // Convert Zoho strings → numbers
    const payload = {
      resource_id: req.body.resource_id,
      metrics: {
        cpu: Number(req.body.metrics.cpu),
        memory: Number(req.body.metrics.memory),
        disk: Number(req.body.metrics.disk)
      }
    };

    console.log("FINAL PAYLOAD TO ML:", payload);

    const response = await axios.post(
      "http://ml:8000/predict",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("ML → Node /predict response:", response.data);

    res.json(response.data);

  } catch (error) {
    console.error("❌ ML /predict error:", error.message);
    res.status(500).json({
      error: "ML service unreachable",
      detail: error.message,
    });
  }
});


export default app;
