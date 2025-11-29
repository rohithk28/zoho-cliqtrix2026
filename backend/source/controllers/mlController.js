import apiClient from "../utils/apiClient.js";
import pool from "../config/db.js";

/* -------------------------------------------------
   1. PREDICTION  (FULLY FIXED)
---------------------------------------------------*/
/* -------------------------------------------------
   1. PREDICTION  (FULLY FIXED FOR FASTAPI MODEL)
---------------------------------------------------*/
export const getPrediction = async (req, res) => {
  try {
    console.log("RAW incoming body:", req.body);

    const { resource_id } = req.body;

    // ================================
    // METRICS NORMALIZATION
    // ================================
    let metrics = {};

    if (req.body.metrics && typeof req.body.metrics === "object") {
      metrics = req.body.metrics;
    } else {
      Object.keys(req.body).forEach(key => {
        if (key.startsWith("metrics[")) {
          const cleanKey = key.substring(8, key.length - 1);
          metrics[cleanKey] = Number(req.body[key]);
        }
      });
    }

    console.log("📌 Normalized metrics:", metrics);

    if (!metrics.cpu) {
      return res.status(400).json({
        error: "CPU is required for prediction",
        received: metrics
      });
    }

    // ================================
    // ✔ BUILD FULL PAYLOAD FOR FASTAPI
    // ================================
    const payload = {
      cpu: metrics.cpu,
      memory: metrics.memory || 0,
      disk: metrics.disk || 0,
      latency: metrics.latency || 0,
      requests: metrics.requests || 0,
      errors: metrics.errors || 0,

      // Lag values default to CPU if not sent
      cpu_lag_1: metrics.cpu_lag_1 || metrics.cpu,
      cpu_lag_5: metrics.cpu_lag_5 || metrics.cpu,
      cpu_lag_15: metrics.cpu_lag_15 || metrics.cpu,
    };

    console.log("🔥 FINAL PAYLOAD SENT TO PYTHON:", payload);

    // ================================
    // SEND TO PYTHON ML SERVICE
    // ================================
    const response = await apiClient.post("/predict", payload);
    const result = response.data;

    console.log("📥 ML Result:", result);

    // ================================
    // SAVE TO DATABASE
    // ================================
    await pool.query(
      `INSERT INTO predictions(resource_id, metrics, severity, score, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        resource_id,
        payload,
        result.risk_level || "unknown",
        result.predicted_hours_to_failure || null,
        {
          anomaly_score: result.anomaly_score || null,
          action: result.recommended_action || null
        }
      ]
    );

    // ================================
    // RETURN TO WIDGET
    // ================================
    res.json({
      source: "python-ml-service",
      result
    });

  } catch (error) {
    console.error("❌ ML Service Error:", error);
    res.status(500).json({
      error: "ML service unreachable",
      detail: error.message
    });
  }
};




/* -------------------------------------------------
   2. HISTORY  (KEPT AS-IS, ONLY MINOR CLEANUP)
---------------------------------------------------*/
export const getHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM predictions ORDER BY created_at DESC LIMIT 50`
    );

    const rows = result.rows.map(r => ({
      timestamp: r.created_at,
      cpu: r.metrics?.cpu || 0,
      memory: r.metrics?.memory || 0,
      risk_level: r.severity || "unknown",
      predicted_hours_to_failure: r.score || null
    }));

    const cpuTrend = rows.map(r => ({
      label: r.timestamp,
      value: r.cpu
    }));

    res.json({
      history_rows: rows,
      cpu_trend: cpuTrend
    });

  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ error: "Unable to fetch history" });
  }
};



/* -------------------------------------------------
   3. METRICS (unchanged)
---------------------------------------------------*/
export const getMetrics = async (req, res) => {
  try {
    res.json({
      metrics: [
        { key: "cpu_usage", type: "percentage" },
        { key: "ram_usage", type: "percentage" },
        { key: "disk_read", type: "iops" },
        { key: "disk_write", type: "iops" },
        { key: "network_in", type: "kbps" },
        { key: "network_out", type: "kbps" }
      ]
    });
  } catch (error) {
    console.error("Metrics Error:", error);
    res.status(500).json({ error: "Unable to fetch metrics" });
  }
};



/* -------------------------------------------------
   4. STATUS  (unchanged)
---------------------------------------------------*/
export const getStatus = async (req, res) => {
  try {
    let mlHealth = "ok";

    try {
      const health = await apiClient.get("/health");
      mlHealth = health.data?.status || "ok";
    } catch (_) {
      mlHealth = "unreachable";
    }

    const latest = await pool.query(
      `SELECT * FROM predictions ORDER BY created_at DESC LIMIT 1`
    );

    let metrics = {};
    let prediction = {};

    if (latest.rows.length > 0) {
      const row = latest.rows[0];
      metrics = row.metrics || {};
      prediction = {
        risk_level: row.severity,
        predicted_hours_to_failure: row.score,
        anomaly_score: row.details?.anomaly_score,
        recommended_action: row.details?.action
      };
    }

    res.json({
      node_backend: "ok",
      ml_service: mlHealth,
      metrics,
      prediction
    });

  } catch (error) {
    console.error("Status Error:", error);
    res.status(500).json({ error: "Unable to fetch status" });
  }
};



/* -------------------------------------------------
   5. ALERT  (unchanged)
---------------------------------------------------*/
export const sendAlert = async (req, res) => {
  try {
    console.log("Alert received:", req.body);
    res.json({ message: "Alert processed" });
  } catch (error) {
    console.error("Alert Error:", error);
    res.status(500).json({ error: "Could not send alert" });
  }
};
