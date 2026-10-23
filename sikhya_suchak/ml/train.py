"""
ml/train.py — Sikhya Suchak ML Pipeline
=========================================
Main training script. Run this once to:
  1. Load + preprocess the dataset
  2. Train 5 models
  3. Evaluate and compare all models
  4. Save the best model as best_model.pkl

Usage:
    cd sikhya_suchak
    python ml/train.py

Output files (in ml/models/):
    best_model.pkl
    scaler.pkl
    label_encoder.pkl
    model_metrics.json

Output plots (in ml/plots/):
    cm_*.png         — confusion matrices
    roc_*.png        — ROC curves
    feat_*.png       — feature importance
    comparison.png   — model comparison bar chart
"""

import os
import json
import numpy as np
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC

# XGBoost is optional — gracefully skip if not installed
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("[train] XGBoost not found. Skipping. Install with: pip install xgboost")

from ml.dataset import prepare_data
from ml.evaluate import (
    evaluate_model,
    cross_validate_model,
    plot_confusion_matrix,
    plot_roc_curve,
    plot_feature_importance,
    print_comparison_table,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
PLOTS_DIR  = os.path.join(BASE_DIR, "ml", "plots")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(PLOTS_DIR,  exist_ok=True)


# ── Model definitions ─────────────────────────────────────────────────────────
def get_models():
    """
    Returns a dict of model name → sklearn estimator.
    Hyperparameters are tuned for this dataset size (~395 rows, 9 features).
    """
    models = {
        "Decision Tree": DecisionTreeClassifier(
            max_depth=6,
            min_samples_split=5,
            min_samples_leaf=3,
            random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        ),
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            random_state=42
        ),
        "SVM": SVC(
            kernel="rbf",
            C=1.0,
            gamma="scale",
            probability=True,   # needed for ROC-AUC
            random_state=42
        ),
    }

    if XGBOOST_AVAILABLE:
        models["XGBoost"] = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="mlogloss",
            random_state=42,
            verbosity=0
        )

    return models


# ── Main training function ────────────────────────────────────────────────────
def train():
    print("\n" + "="*60)
    print("  SIKHYA SUCHAK — ML TRAINING PIPELINE")
    print("="*60)

    # ── 1. Prepare data ───────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test, feature_names, class_names = prepare_data()
    print(f"\n[train] Features : {feature_names}")
    print(f"[train] Classes  : {class_names}")

    # ── 2. Train and evaluate all models ─────────────────────────────────────
    models      = get_models()
    all_metrics = []
    trained     = {}

    for model_name, model in models.items():
        print(f"\n[train] ── Training: {model_name} ──")

        # Train
        model.fit(X_train, y_train)
        trained[model_name] = model

        # Cross-validation (on training set)
        cv_score = cross_validate_model(model_name, model, X_train, y_train, cv=5)

        # Evaluation metrics
        metrics = evaluate_model(model_name, model, X_test, y_test, class_names)
        metrics["cv_score"] = cv_score
        all_metrics.append(metrics)

        # Plots
        plot_confusion_matrix(model_name, model, X_test, y_test, class_names)
        plot_roc_curve(model_name, model, X_test, y_test, class_names)
        plot_feature_importance(model_name, model, feature_names)

    # ── 3. Compare models ─────────────────────────────────────────────────────
    comparison_df = print_comparison_table(all_metrics)

    # ── 4. Select best model (by F1 score) ───────────────────────────────────
    best_name  = comparison_df.iloc[0]["Model"]
    best_model = trained[best_name]

    print(f"\n[train] ★ Best Model: {best_name}")
    print(f"[train]   F1 Score : {comparison_df.iloc[0]['F1%']}%")
    print(f"[train]   Accuracy : {comparison_df.iloc[0]['Accuracy%']}%")

    # ── 5. Save best model ────────────────────────────────────────────────────
    model_path = os.path.join(MODELS_DIR, "best_model.pkl")
    joblib.dump(best_model, model_path)
    print(f"\n[train] ✓ Saved best model → {model_path}")

    # ── 6. Save metrics as JSON (used by FastAPI /model-metrics endpoint) ─────
    metrics_out = []
    for m in all_metrics:
        metrics_out.append({
            "name":      m["name"],
            "accuracy":  m["accuracy"],
            "precision": m["precision"],
            "recall":    m["recall"],
            "f1":        m["f1"],
            "roc_auc":   m["roc_auc"],
            "cv_score":  m["cv_score"],
        })

    meta = {
        "best_model": best_name,
        "feature_names": feature_names,
        "class_names": class_names,
        "models": metrics_out,
    }

    meta_path = os.path.join(MODELS_DIR, "model_metrics.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"[train] ✓ Saved metrics → {meta_path}")

    # ── 7. Comparison bar chart ───────────────────────────────────────────────
    _plot_comparison(all_metrics)

    print("\n" + "="*60)
    print("  TRAINING COMPLETE")
    print(f"  Best Model : {best_name}")
    print(f"  Models dir : {MODELS_DIR}")
    print(f"  Plots dir  : {PLOTS_DIR}")
    print("="*60 + "\n")

    return best_model, best_name, meta


# ── Comparison bar chart ──────────────────────────────────────────────────────
def _plot_comparison(all_metrics: list):
    """
    Saves a bar chart comparing all models across 4 metrics.
    """
    names     = [m["name"] for m in all_metrics]
    accuracy  = [m["accuracy"] for m in all_metrics]
    precision = [m["precision"] for m in all_metrics]
    recall    = [m["recall"] for m in all_metrics]
    f1        = [m["f1"] for m in all_metrics]

    x    = np.arange(len(names))
    w    = 0.2
    fig, ax = plt.subplots(figsize=(10, 6))

    ax.bar(x - 1.5*w, accuracy,  w, label="Accuracy",  color="#3B82F6")
    ax.bar(x - 0.5*w, precision, w, label="Precision", color="#22C55E")
    ax.bar(x + 0.5*w, recall,    w, label="Recall",    color="#F59E0B")
    ax.bar(x + 1.5*w, f1,        w, label="F1 Score",  color="#EF4444")

    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=15, ha="right")
    ax.set_ylabel("Score (%)")
    ax.set_title("Model Comparison — Sikhya Suchak")
    ax.legend()
    ax.set_ylim(0, 110)
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()

    path = os.path.join(PLOTS_DIR, "comparison.png")
    plt.savefig(path, dpi=120)
    plt.close()
    print(f"[train] ✓ Comparison chart → {path}")


if __name__ == "__main__":
    train()
