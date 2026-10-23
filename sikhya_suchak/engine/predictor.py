"""
engine/predictor.py — Sikhya Suchak ML Inference Engine (Step 5)
=================================================================
Loads trained model artifacts ONCE at startup (lazy-load on first call).
Step 5 optimizations:
  - Module-level artifact cache (loaded once, reused forever)
  - Thread-safe lazy loading
  - Prediction result normalisation
  - Feature importance caching (computed once per session)

Artifacts (from ml/models/):
  best_model.pkl     — trained classifier
  scaler.pkl         — StandardScaler
  label_encoder.pkl  — LabelEncoder
  model_metrics.json — metadata (best_model name, feature_names, etc.)
"""

import os
import json
import threading
import numpy as np
import joblib
from typing import Optional
from engine.recommender import generate_smart_recommendations

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")

MODEL_PATH   = os.path.join(MODELS_DIR, "best_model.pkl")
SCALER_PATH  = os.path.join(MODELS_DIR, "scaler.pkl")
LE_PATH      = os.path.join(MODELS_DIR, "label_encoder.pkl")
METRICS_PATH = os.path.join(MODELS_DIR, "model_metrics.json")

# ── Thread-safe singleton artifact cache ─────────────────────────────────────
_lock    = threading.Lock()
_model   = None
_scaler  = None
_le      = None
_meta    = None
_feat_imp_cache: Optional[dict] = None   # cached feature importance


def _load_artifacts():
    """Loads all artifacts once. Thread-safe via module-level lock."""
    global _model, _scaler, _le, _meta, _feat_imp_cache

    with _lock:
        if _model is not None:
            return   # already loaded by another thread

        for path, label in [
            (MODEL_PATH,   "best_model.pkl"),
            (SCALER_PATH,  "scaler.pkl"),
            (LE_PATH,      "label_encoder.pkl"),
            (METRICS_PATH, "model_metrics.json"),
        ]:
            if not os.path.exists(path):
                raise FileNotFoundError(
                    f"[predictor] '{label}' not found. "
                    "Run 'python ml/train.py' to train the model."
                )

        _model  = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        _le     = joblib.load(LE_PATH)

        with open(METRICS_PATH) as f:
            _meta = json.load(f)

        # Pre-compute feature importance once
        _feat_imp_cache = _compute_feature_importance(_model)

        print(f"[predictor] Loaded model: {_meta.get('best_model', '?')}")


def is_model_ready() -> bool:
    """True if all 4 artifact files exist on disk."""
    return all(os.path.exists(p) for p in [MODEL_PATH, SCALER_PATH, LE_PATH, METRICS_PATH])


# ── Feature definitions ───────────────────────────────────────────────────────
FEATURE_ORDER = [
    "attendance_pct",
    "assignment_score",
    "quiz_score",
    "midterm_marks",
    "internal_marks",
    "lab_marks",
    "previous_gpa",
    "study_hours",
    "extra_activities",
]


# ── Feature importance (computed once, cached) ────────────────────────────────
def _compute_feature_importance(model) -> dict:
    if hasattr(model, "feature_importances_"):
        imps = model.feature_importances_
        total = imps.sum() or 1.0
        return {f: round(float(v / total), 4) for f, v in zip(FEATURE_ORDER, imps)}
    elif hasattr(model, "coef_"):
        coefs = np.abs(model.coef_).mean(axis=0)
        total = coefs.sum() or 1.0
        return {f: round(float(c / total), 4) for f, c in zip(FEATURE_ORDER, coefs)}
    else:
        n = len(FEATURE_ORDER)
        return {f: round(1.0 / n, 4) for f in FEATURE_ORDER}


# ── Grade + score helpers ─────────────────────────────────────────────────────
def _risk_to_letter_grade(risk_level: str, final_score: float) -> str:
    if risk_level == "low":
        if final_score >= 90: return "A+"
        elif final_score >= 80: return "A"
        return "B+"
    elif risk_level == "medium":
        return "B" if final_score >= 65 else "C"
    else:
        return "D" if final_score >= 45 else "F"


def _compute_final_score(features: dict) -> float:
    score = (
        features.get("midterm_marks",    0) * 0.25 +
        features.get("internal_marks",   0) * 0.20 +
        features.get("attendance_pct",   0) * 0.20 +
        features.get("assignment_score", 0) * 0.15 +
        features.get("quiz_score",       0) * 0.10 +
        features.get("lab_marks",        0) * 0.10
    )
    return round(min(score, 100.0), 2)


# ── Main prediction function ──────────────────────────────────────────────────
def predict_ml(
    attendance_pct:   float,
    assignment_score: float,
    quiz_score:       float,
    midterm_marks:    float,
    internal_marks:   float,
    lab_marks:        float,
    previous_gpa:     float,
    study_hours:      float,
    extra_activities: int,
) -> dict:
    """
    ML inference entry point called by FastAPI.
    Lazy-loads artifacts on first call; subsequent calls reuse cached objects.
    """
    if _model is None:
        _load_artifacts()

    features = {
        "attendance_pct":    float(attendance_pct),
        "assignment_score":  float(assignment_score),
        "quiz_score":        float(quiz_score),
        "midterm_marks":     float(midterm_marks),
        "internal_marks":    float(internal_marks),
        "lab_marks":         float(lab_marks),
        "previous_gpa":      float(previous_gpa),
        "study_hours":       float(study_hours),
        "extra_activities":  int(extra_activities),
    }

    # Build + scale feature vector
    x_raw    = np.array([[features[f] for f in FEATURE_ORDER]], dtype=float)
    x_scaled = _scaler.transform(x_raw)

    # Predict
    y_int      = _model.predict(x_scaled)[0]
    risk_level = _le.inverse_transform([y_int])[0]

    # Probabilities
    probabilities   = {}
    confidence_score = 0.8
    if hasattr(_model, "predict_proba"):
        proba       = _model.predict_proba(x_scaled)[0]
        class_names = list(_le.classes_)
        probabilities   = {c: round(float(p), 4) for c, p in zip(class_names, proba)}
        confidence_score = round(float(proba.max()), 4)
    else:
        probabilities   = {
            "low":    1.0 if risk_level == "low"    else 0.1,
            "medium": 1.0 if risk_level == "medium" else 0.1,
            "high":   1.0 if risk_level == "high"   else 0.1,
        }
        confidence_score = 0.75

    final_score     = _compute_final_score(features)
    predicted_grade = _risk_to_letter_grade(risk_level, final_score)
    recommendations = generate_smart_recommendations(features, risk_level)

    # Use cached feature importance
    feature_importance = _feat_imp_cache or _compute_feature_importance(_model)

    return {
        "predicted_grade":   predicted_grade,
        "risk_level":        risk_level,
        "probability":       probabilities,
        "confidence_score":  confidence_score,
        "final_score":       final_score,
        "recommendations":   recommendations,
        "feature_importance": feature_importance,
        "model_used":        _meta.get("best_model", "Unknown") if _meta else "Unknown",
    }


def get_model_metadata() -> dict:
    """Returns raw metadata dict for /model-metrics endpoint."""
    if _meta is None:
        _load_artifacts()
    return _meta
