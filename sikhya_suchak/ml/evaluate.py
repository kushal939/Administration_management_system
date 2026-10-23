"""
ml/evaluate.py — Sikhya Suchak ML Pipeline
===========================================
Handles model evaluation:
  - Accuracy, Precision, Recall, F1-score
  - Confusion Matrix
  - ROC-AUC (multi-class, one-vs-rest)
  - Cross-validation
  - Comparison table across all models
  - Saves evaluation plots to ml/plots/
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend (no display needed)
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
    roc_auc_score, roc_curve, auc
)
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import label_binarize

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLOTS_DIR = os.path.join(BASE_DIR, "ml", "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)


# ── Single model evaluation ───────────────────────────────────────────────────
def evaluate_model(name: str, model, X_test, y_test, class_names: list) -> dict:
    """
    Evaluates a single trained model and returns a metrics dictionary.

    Args:
        name        : Model name string (e.g., "Random Forest")
        model       : Trained sklearn model
        X_test      : Scaled test features
        y_test      : True labels (integers)
        class_names : List of class label strings ['high', 'low', 'medium']

    Returns:
        dict with accuracy, precision, recall, f1, roc_auc, report
    """
    y_pred = model.predict(X_test)

    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall    = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1        = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    # ROC-AUC (one-vs-rest for multiclass)
    roc_auc = None
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_test)
        n_classes = len(class_names)
        if n_classes == 2:
            roc_auc = roc_auc_score(y_test, y_prob[:, 1])
        else:
            y_bin = label_binarize(y_test, classes=list(range(n_classes)))
            roc_auc = roc_auc_score(y_bin, y_prob, multi_class="ovr", average="weighted")

    report = classification_report(y_test, y_pred, target_names=class_names)

    metrics = {
        "name":      name,
        "accuracy":  round(accuracy * 100, 2),
        "precision": round(precision * 100, 2),
        "recall":    round(recall * 100, 2),
        "f1":        round(f1 * 100, 2),
        "roc_auc":   round(roc_auc * 100, 2) if roc_auc is not None else "N/A",
        "report":    report,
    }

    print(f"\n{'='*50}")
    print(f"Model: {name}")
    print(f"  Accuracy  : {metrics['accuracy']}%")
    print(f"  Precision : {metrics['precision']}%")
    print(f"  Recall    : {metrics['recall']}%")
    print(f"  F1 Score  : {metrics['f1']}%")
    print(f"  ROC-AUC   : {metrics['roc_auc']}")
    print(f"\nClassification Report:\n{report}")

    return metrics


# ── Cross-validation ──────────────────────────────────────────────────────────
def cross_validate_model(name: str, model, X_train, y_train, cv: int = 5) -> float:
    """
    Runs k-fold cross-validation and returns mean accuracy.
    Uses the training set only (no data leakage).
    """
    scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy")
    mean_cv = round(scores.mean() * 100, 2)
    std_cv  = round(scores.std() * 100, 2)
    print(f"  CV ({cv}-fold): {mean_cv}% ± {std_cv}%")
    return mean_cv


# ── Confusion Matrix plot ─────────────────────────────────────────────────────
def plot_confusion_matrix(name: str, model, X_test, y_test, class_names: list):
    """
    Saves a heatmap of the confusion matrix to ml/plots/.
    """
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)

    plt.figure(figsize=(6, 5))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=class_names, yticklabels=class_names
    )
    plt.title(f"Confusion Matrix — {name}")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()

    fname = os.path.join(PLOTS_DIR, f"cm_{name.lower().replace(' ', '_')}.png")
    plt.savefig(fname, dpi=120)
    plt.close()
    print(f"  [plot] Confusion matrix saved: {fname}")


# ── ROC Curve plot ────────────────────────────────────────────────────────────
def plot_roc_curve(name: str, model, X_test, y_test, class_names: list):
    """
    Saves ROC curves (one-vs-rest for each class) to ml/plots/.
    Only runs if model supports predict_proba.
    """
    if not hasattr(model, "predict_proba"):
        print(f"  [plot] ROC skipped for {name} (no predict_proba)")
        return

    n_classes = len(class_names)
    y_prob = model.predict_proba(X_test)
    y_bin  = label_binarize(y_test, classes=list(range(n_classes)))

    plt.figure(figsize=(7, 5))
    colors = ["#EF4444", "#22C55E", "#F59E0B"]  # high, low, medium

    for i, (cls, color) in enumerate(zip(class_names, colors)):
        if n_classes == 2 and i == 1:
            break
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_prob[:, i])
        roc_auc_val = auc(fpr, tpr)
        plt.plot(fpr, tpr, color=color, lw=2,
                 label=f"{cls} (AUC = {roc_auc_val:.2f})")

    plt.plot([0, 1], [0, 1], "k--", lw=1)
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title(f"ROC Curve — {name}")
    plt.legend(loc="lower right")
    plt.tight_layout()

    fname = os.path.join(PLOTS_DIR, f"roc_{name.lower().replace(' ', '_')}.png")
    plt.savefig(fname, dpi=120)
    plt.close()
    print(f"  [plot] ROC curve saved: {fname}")


# ── Feature importance plot ───────────────────────────────────────────────────
def plot_feature_importance(name: str, model, feature_names: list):
    """
    Saves feature importance bar chart for tree-based models.
    """
    if not hasattr(model, "feature_importances_"):
        print(f"  [plot] Feature importance skipped for {name}")
        return

    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    sorted_features = [feature_names[i] for i in indices]
    sorted_importance = importances[indices]

    plt.figure(figsize=(8, 5))
    sns.barplot(x=sorted_importance, y=sorted_features, palette="Blues_r")
    plt.title(f"Feature Importance — {name}")
    plt.xlabel("Importance Score")
    plt.tight_layout()

    fname = os.path.join(PLOTS_DIR, f"feat_{name.lower().replace(' ', '_')}.png")
    plt.savefig(fname, dpi=120)
    plt.close()
    print(f"  [plot] Feature importance saved: {fname}")


# ── Comparison table ──────────────────────────────────────────────────────────
def print_comparison_table(all_metrics: list):
    """
    Prints a formatted comparison table of all models.
    """
    print("\n" + "="*70)
    print("MODEL COMPARISON TABLE")
    print("="*70)
    df = pd.DataFrame(all_metrics)[["name", "accuracy", "precision", "recall", "f1", "roc_auc"]]
    df.columns = ["Model", "Accuracy%", "Precision%", "Recall%", "F1%", "ROC-AUC%"]
    df = df.sort_values("F1%", ascending=False).reset_index(drop=True)
    print(df.to_string(index=False))
    print("="*70)
    best = df.iloc[0]["Model"]
    print(f"\n★ Best Model (by F1): {best}")
    return df
