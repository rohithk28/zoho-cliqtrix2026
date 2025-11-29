from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, pickle, numpy as np

# -----------------------------
# MODEL PATH CONFIG
# -----------------------------
MODEL_DIR = os.environ.get("MODEL_DIR", "models")
TTF_MODEL_PATH = os.path.join(MODEL_DIR, "ttf_model.pkl")
ANOM_MODEL_PATH = os.path.join(MODEL_DIR, "model_binary.sav")
ANOM_SCALER_PATH = os.path.join(MODEL_DIR, "scaler_bin.pkl")

app = FastAPI(title="Predictive Monitoring ML (TTF + Anomaly)")


# -----------------------------
# INPUT SCHEMA
# -----------------------------
class Metrics(BaseModel):
    cpu: float
    memory: float = 0.0
    disk: float = 0.0
    latency: float = 0.0
    requests: float = 0.0
    errors: int = 0
    cpu_lag_1: float = None
    cpu_lag_5: float = None
    cpu_lag_15: float = None


# -----------------------------
# LAZY LOAD MODELS
# -----------------------------
_tt = None
_anom = None
_anom_scaler = None


def load_ttf():
    """Lazy-load TTF model"""
    global _tt
    if _tt is None:
        if not os.path.exists(TTF_MODEL_PATH):
            raise FileNotFoundError(f"TTF model not found: {TTF_MODEL_PATH}")
        with open(TTF_MODEL_PATH, "rb") as f:
            _tt = pickle.load(f)
    return _tt


def load_anom():
    """Lazy-load anomaly model"""
    global _anom, _anom_scaler
    if _anom is None:
        if os.path.exists(ANOM_MODEL_PATH):
            try:
                import joblib
                _anom = joblib.load(ANOM_MODEL_PATH)
                if os.path.exists(ANOM_SCALER_PATH):
                    _anom_scaler = joblib.load(ANOM_SCALER_PATH)
            except:
                _anom = None
    return _anom, _anom_scaler


# -----------------------------
# HEALTH CHECK
# -----------------------------
@app.get("/health")
def health():
    ok = os.path.exists(TTF_MODEL_PATH)
    return {"status": "ok" if ok else "model_missing", "model_path": TTF_MODEL_PATH}


# -----------------------------
# PREDICTION ENDPOINT
# -----------------------------
@app.post("/predict")
def predict(m: Metrics):

    # ------- Extract metrics -------
    cpu = float(m.cpu)
    cpu_lag_1 = float(m.cpu_lag_1) if m.cpu_lag_1 is not None else cpu
    cpu_lag_5 = float(m.cpu_lag_5) if m.cpu_lag_5 is not None else cpu
    cpu_lag_15 = float(m.cpu_lag_15) if m.cpu_lag_15 is not None else cpu

    mem = float(m.memory)
    disk = float(m.disk)
    lat = float(m.latency)
    req = float(m.requests)
    err = int(m.errors)

    # ------- Build Feature Vector -------
    features = np.array([[
        cpu, cpu_lag_1, cpu_lag_5, cpu_lag_15,
        0, 0,            # rolling mean + std placeholder
        mem, disk, lat, req, err
    ]], dtype=float)

    # Rolling stats
    features[0, 4] = (cpu + cpu_lag_1 + cpu_lag_5) / 3.0
    features[0, 5] = np.std([cpu, cpu_lag_1, cpu_lag_5])

    # ------- Load TTF model -------
    try:
        ttf_model = load_ttf()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    pred_hours = float(ttf_model.predict(features)[0])  # Very small values like 0.06

    # ------- Anomaly detection -------
    anomaly_score, anomaly_label = None, None
    anom_model, anom_scaler = load_anom()

    if anom_model is not None:
        arr = np.array([[cpu, mem, disk, lat, req, err]], dtype=float)

        # scale if scaler exists
        if anom_scaler is not None:
            try:
                arr = anom_scaler.transform(arr)
            except:
                pass

        try:
            if hasattr(anom_model, "decision_function"):
                anomaly_score = float(anom_model.decision_function(arr)[0])
            label = anom_model.predict(arr)[0]

            # 1 or -1 = anomaly
            anomaly_label = int(label == 1 or label == -1)

        except:
            anomaly_label = None

    # -----------------------------
    # NEW RISK ENGINE (HYBRID)
    # -----------------------------
    # This gives DIFFERENT OUTPUTS for different inputs.
    # Combines: anomaly + TTF + CPU level.

    if anomaly_label == 1:
        risk = "high"
        action = "Restart server immediately"

    elif cpu >= 90:
        risk = "high"
        action = "Critical CPU load — restart soon"

    elif pred_hours <= 0.05:
        risk = "high"
        action = "Restart server now"

    elif pred_hours <= 0.15:
        risk = "medium"
        action = "Monitor closely"

    elif pred_hours <= 0.3:
        risk = "low"
        action = "System healthy"

    elif cpu <= 20:
        risk = "very_low"
        action = "System idle — no issues"

    else:
        risk = "low"
        action = "All good"

    # -----------------------------
    # FINAL RESPONSE
    # -----------------------------
    return {
        "predicted_hours_to_failure": round(pred_hours, 4),
        "anomaly_score": anomaly_score,
        "anomaly_label": anomaly_label,
        "current_cpu": cpu,
        "risk_level": risk,
        "recommended_action": action
    }
