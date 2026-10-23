"""
ml/dataset.py — Sikhya Suchak ML Pipeline
==========================================
Handles:
  - Loading the UCI Student Performance dataset
  - Data cleaning and missing value handling
  - Feature engineering
  - Encoding categorical variables
  - Normalization / scaling
  - Train/test split

Dataset: UCI Student Performance Dataset
Source  : https://archive.ics.uci.edu/ml/datasets/Student+Performance
Files   : student-mat.csv (Math) and/or student-por.csv (Portuguese)

The dataset is downloaded automatically if not present.
"""

import os
import urllib.request
import zipfile
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
DATA_URL   = "https://archive.ics.uci.edu/ml/machine-learning-databases/00320/student.zip"
DATA_FILE  = os.path.join(DATA_DIR, "student-mat.csv")

os.makedirs(DATA_DIR,   exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)


# ── Step 1: Download dataset ──────────────────────────────────────────────────
def download_dataset():
    """
    Downloads the UCI Student Performance dataset if not already present.
    Extracts student-mat.csv (Math course data — 395 students, 33 features).
    """
    if os.path.exists(DATA_FILE):
        print("[dataset] Dataset already exists. Skipping download.")
        return

    print("[dataset] Downloading UCI Student Performance dataset...")
    zip_path = os.path.join(DATA_DIR, "student.zip")
    urllib.request.urlretrieve(DATA_URL, zip_path)

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(DATA_DIR)

    # The zip contains student-mat.csv and student-por.csv
    os.remove(zip_path)
    print(f"[dataset] Downloaded and extracted to: {DATA_DIR}")


# ── Step 2: Load and inspect ──────────────────────────────────────────────────
def load_raw():
    """
    Loads the raw CSV and returns a DataFrame.
    UCI file uses semicolons as delimiter.
    """
    download_dataset()
    df = pd.read_csv(DATA_FILE, sep=";")
    print(f"[dataset] Loaded {len(df)} rows, {len(df.columns)} columns.")
    return df


# ── Step 3: EDA summary (printed to console during training) ──────────────────
def print_eda(df: pd.DataFrame):
    """
    Prints basic EDA statistics.
    Call this during training to understand data distribution.
    """
    print("\n" + "="*50)
    print("EDA SUMMARY")
    print("="*50)
    print(f"Shape      : {df.shape}")
    print(f"Columns    : {list(df.columns)}")
    print(f"\nMissing values:\n{df.isnull().sum()}")
    print(f"\nData types:\n{df.dtypes}")
    print(f"\nTarget (G3) distribution:\n{df['G3'].value_counts().sort_index() if 'G3' in df.columns else df['g3'].value_counts().sort_index()}")
    print(f"\nDescriptive stats:\n{df.describe()}")
    print("="*50 + "\n")


# ── Step 4: Feature engineering ───────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps UCI dataset columns to Sikhya Suchak feature names.

    UCI → Sikhya Suchak mapping:
      G1 (Period 1 grade)      → internal_marks   (0–20, scaled to 0–100)
      G2 (Period 2 grade)      → midterm_marks     (0–20, scaled to 0–100)
      absences                 → attendance_pct    (inverse: higher absences = lower attendance)
      studytime                → study_hours       (1–4 scale → mapped to hours)
      activities (yes/no)      → extra_activities  (1/0)
      failures                 → disciplinary      (number of past failures)
      G3 (Final grade)         → target (0–20 → mapped to risk level)
      famrel, Medu, Fedu       → derived: support_index
      freetime + goout         → social_score
      health                   → health_score
    """
    df = df.copy()

    # Normalise all column names to lowercase so the code works
    # regardless of how the CSV was exported (Walc vs walc, G1 vs g1, etc.)
    df.columns = df.columns.str.lower()

    # Scale grades from 0–20 to 0–100
    df["internal_marks"]  = df["g1"] * 5
    df["midterm_marks"]   = df["g2"] * 5
    df["final_grade_raw"] = df["g3"] * 5  # used for target creation

    # Attendance: absences → attendance percentage
    max_abs = max(df["absences"].max(), 1)
    df["attendance_pct"] = (1 - df["absences"] / max_abs) * 100
    df["attendance_pct"] = df["attendance_pct"].clip(0, 100).round(2)

    # Study hours mapping
    study_map = {1: 1.5, 2: 3.5, 3: 7.5, 4: 12.0}
    df["study_hours"] = df["studytime"].map(study_map).fillna(3.5)

    # Extra activities: yes/no → 1/0
    df["extra_activities"] = (df["activities"] == "yes").astype(int)

    # Assignment score proxy
    df["assignment_score"] = (
        (df["studytime"] / 4 * 60) +
        ((5 - df["walc"]) / 4 * 40)
    ).clip(0, 100).round(2)

    # Quiz score proxy
    df["quiz_score"] = (
        (df["famrel"] / 5 * 50) +
        (df["health"] / 5 * 50)
    ).clip(0, 100).round(2)

    # Previous GPA proxy
    df["previous_gpa"] = (df["g1"] / 20 * 4.0).round(2)

    # Lab marks proxy
    df["lab_marks"] = ((df["g1"] + df["g2"]) / 40 * 100).round(2)

    # ── Target variable ────────────────────────────────────────────────────────
    def grade_to_risk(g3):
        if g3 >= 15:
            return "low"
        elif g3 >= 10:
            return "medium"
        else:
            return "high"

    df["risk_level"] = df["g3"].apply(grade_to_risk)

    def grade_to_letter(g3):
        if g3 >= 18:   return "A+"
        elif g3 >= 15: return "A"
        elif g3 >= 13: return "B+"
        elif g3 >= 10: return "B"
        elif g3 >= 8:  return "C"
        elif g3 >= 5:  return "D"
        else:          return "F"

    df["letter_grade"] = df["g3"].apply(grade_to_letter)

    return df


# ── Step 5: Select final features ─────────────────────────────────────────────
# These 9 features are the exact inputs Sikhya Suchak will accept
FEATURE_COLUMNS = [
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

TARGET_COLUMN = "risk_level"


# ── Step 6: Clean data ────────────────────────────────────────────────────────
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Drops rows where G3 = 0 (student withdrew, not a valid academic result)
    - Handles any remaining missing values
    - Removes duplicates
    """
    original_len = len(df)

    # Drop rows where final grade is 0 (withdrawal / missing exam)
    # Column names were lowercased in engineer_features, so use 'g3'
    g3_col = "g3" if "g3" in df.columns else "G3"
    df = df[df[g3_col] > 0].copy()

    # Drop duplicates
    df = df.drop_duplicates()

    # Fill any remaining NaN with median for numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    print(f"[dataset] Cleaned: {original_len} → {len(df)} rows "
          f"(dropped {original_len - len(df)} rows)")
    return df


# ── Step 7: Full preprocessing pipeline ──────────────────────────────────────
def prepare_data():
    """
    Full pipeline:
      1. Load raw CSV
      2. Print EDA
      3. Engineer features
      4. Clean data
      5. Extract X (features) and y (target)
      6. Encode target label
      7. Scale features
      8. Train/test split
      9. Save scaler and label encoder

    Returns:
        X_train, X_test, y_train, y_test, feature_names, class_names
    """
    # 1. Load
    df_raw = load_raw()

    # 2. EDA
    print_eda(df_raw)

    # 3. Feature engineering
    df = engineer_features(df_raw)

    # 4. Clean
    df = clean_data(df)

    # 5. Extract features and target
    X = df[FEATURE_COLUMNS].values
    y_raw = df[TARGET_COLUMN].values  # string labels: 'low', 'medium', 'high'

    print(f"[dataset] Feature matrix: {X.shape}")
    print(f"[dataset] Target distribution: {pd.Series(y_raw).value_counts().to_dict()}")

    # 6. Encode target labels to integers
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    class_names = list(le.classes_)
    print(f"[dataset] Classes (encoded): {dict(zip(class_names, le.transform(class_names)))}")

    # 7. Scale features (StandardScaler: mean=0, std=1)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 8. Train/test split (80% train, 20% test, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )
    print(f"[dataset] Train: {len(X_train)} samples | Test: {len(X_test)} samples")

    # 9. Save scaler and label encoder
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(le,     os.path.join(MODELS_DIR, "label_encoder.pkl"))
    print(f"[dataset] Saved scaler.pkl and label_encoder.pkl to {MODELS_DIR}")

    return X_train, X_test, y_train, y_test, FEATURE_COLUMNS, class_names


if __name__ == "__main__":
    prepare_data()
