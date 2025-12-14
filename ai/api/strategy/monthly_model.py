import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

def load_monthly_demand_model():
    model_path = BASE_DIR / "models" / "monthly_demand_model.pkl"
    return joblib.load(model_path)
