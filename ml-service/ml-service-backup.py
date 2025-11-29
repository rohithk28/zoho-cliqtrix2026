from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict

app = FastAPI()

class Payload(BaseModel):
    data: Dict[str, Any]

@app.post("/predict")
async def predict(payload: Payload):
    # This is a mock prediction for now
    return {
        "status": "ok",
        "received_input": payload.data,
        "prediction": "sample_prediction"
    }
