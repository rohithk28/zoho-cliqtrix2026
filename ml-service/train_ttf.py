import os
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor

DATA_PATH = "/app/data/synthetic_cloud_dataset.csv"
MODEL_PATH = "/app/models/ttf_model.pkl"

print("📌 Loading dataset:", DATA_PATH)
df = pd.read_csv(DATA_PATH)

# Ensure timestamp exists
if "timestamp" not in df.columns:
    df["timestamp"] = pd.date_range(end=datetime.now(), periods=len(df), freq="min")

df["timestamp"] = pd.to_datetime(df["timestamp"])
df = df.sort_values("timestamp").reset_index(drop=True)

# ---------------------------------------------------------------------
# Feature Engineering
# ---------------------------------------------------------------------
df["cpu_lag_1"] = df["cpu"].shift(1).fillna(df["cpu"])
df["cpu_lag_5"] = df["cpu"].shift(5).fillna(df["cpu"])
df["cpu_lag_15"] = df["cpu"].shift(15).fillna(df["cpu"])

df["cpu_roll_mean_60"] = df["cpu"].rolling(60, min_periods=1).mean()
df["cpu_roll_std_60"] = df["cpu"].rolling(60, min_periods=1).std().fillna(0)

# ---------------------------------------------------------------------
# Synthetic Failure Logic
# ---------------------------------------------------------------------
fail = []

CPU_JUMP = 30       # Sudden spike
LAT_HIGH = df["latency"].mean() + df["latency"].std()
ERR_HIGH = df["errors"].quantile(0.85)

for i in range(len(df)):
    flag = 0
    if i > 5:
        if df.at[i, "cpu"] > df.at[i - 5, "cpu"] + CPU_JUMP:
            flag = 1
        if df.at[i, "latency"] > LAT_HIGH:
            flag = 1
        if df.at[i, "errors"] > ERR_HIGH:
            flag = 1
    fail.append(flag)

df["failure"] = fail

# Compute hours_to_failure (TTF)
ttf = []
failure_indices = list(df.index[df["failure"] == 1])

for i in range(len(df)):
    future = [f for f in failure_indices if f > i]
    if len(future) == 0:
        ttf.append(np.nan)
    else:
        next_fail = future[0]
        delta_hours = (df.at[next_fail, "timestamp"] - df.at[i, "timestamp"]).total_seconds() / 3600
        ttf.append(delta_hours)

df["hours_to_failure"] = ttf

# Keep rows with valid TTF <= 24 hours
df_train = df.dropna(subset=["hours_to_failure"])
df_train = df_train[df_train["hours_to_failure"] <= 24]

print("Training samples:", len(df_train))
if len(df_train) == 0:
    raise Exception("❌ No valid training rows. Synthetic rules may be too strict.")

# ---------------------------------------------------------------------
# Train TTF Model
# ---------------------------------------------------------------------
features = [
    "cpu", "cpu_lag_1", "cpu_lag_5", "cpu_lag_15",
    "cpu_roll_mean_60", "cpu_roll_std_60",
    "memory", "disk", "latency", "requests", "errors"
]

X = df_train[features].values
y = df_train["hours_to_failure"].values

print("Training RandomForestRegressor...")
model = RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)
model.fit(X, y)

# Save model
with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

print("🎉 Model training complete!")
print("Model saved to:", MODEL_PATH)
