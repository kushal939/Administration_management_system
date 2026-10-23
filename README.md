# Sikhya Suchak
## AI-Based Academic Performance Prediction and Early Warning System Using Machine Learning

> **Part of:** EK-Mikha Administration Management System (AMS)  
> **Version:** 3.0.0 | **Status:** Production Ready

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation Guide](#installation-guide)
6. [Running the System](#running-the-system)
7. [ML Model Training](#ml-model-training)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Developer Guide](#developer-guide)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Sikhya Suchak** ("Learning Indicator" in Sanskrit) is an AI-powered academic performance prediction module integrated into the EK-Mikha Administration Management System.

### Key Features
- 🤖 **ML-Based Grade Prediction** — 5 models trained (Decision Tree, Random Forest, Logistic Regression, SVM, XGBoost)
- 🎯 **Risk Classification** — Low / Medium / High risk with confidence scores
- 📊 **Real-Time Analytics** — Department comparison, attendance trends, risk distribution
- 📜 **Prediction History** — Every prediction stored in SQLite with full audit trail
- 📥 **Export** — CSV export, print-ready reports
- 🔐 **Role-Based Views** — Student, Teacher, Admin dashboards

### Technology Stack
| Layer | Technology |
|-------|-----------|
| ML Backend | Python 3.11, FastAPI 0.111, scikit-learn 1.4, XGBoost 2.0 |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Chart.js 4 |
| AMS Backend | Node.js, Express, SQLite |
| Database | SQLite (predictions.db) |
| ML Dataset | UCI Student Performance Dataset (395 students) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         (Vite + Tailwind + Chart.js)  :5173             │
│  StudentDashboard | TeacherDashboard | AdminDashboard    │
└──────────────┬──────────────┬────────────────────────────┘
               │ port 8001    │ port 3001
               ▼              ▼
┌──────────────────┐   ┌──────────────────────────────┐
│ FastAPI ML API   │   │ Node.js AMS Backend           │
│ (Sikhya Suchak)  │◄──│ Express + SQLite              │
│ predictions.db   │   │ Students, Marks, Attendance   │
└──────────────────┘   └──────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  ML Model Files  │
│  best_model.pkl  │
│  scaler.pkl      │
│  label_enc.pkl   │
│  model_metrics   │
└──────────────────┘
```

---

## Project Structure

```
Administration_management_system/
├── frontend/                        ← React app (Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   └── sikhyasuchak/       ← All ML UI components
│   │   │       ├── api.js           ← FastAPI client
│   │   │       ├── StudentDashboard.jsx
│   │   │       ├── TeacherDashboard.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── StudentPredictionHistory.jsx
│   │   │       ├── PredictionCard.jsx
│   │   │       ├── PredictionModal.jsx
│   │   │       ├── RiskBadge.jsx
│   │   │       ├── ConfidenceGauge.jsx
│   │   │       ├── ScoreBar.jsx
│   │   │       ├── PerformanceTrendChart.jsx
│   │   │       ├── RiskPieChart.jsx
│   │   │       └── AnalyticsCards.jsx
│   │   └── pages/
│   │       └── SikhyaSuchak.jsx    ← Page wrapper / routing
│   └── package.json
│
├── backend/                         ← Node.js AMS backend (port 3001)
│   ├── routes/
│   ├── database.js
│   └── package.json
│
└── sikhya_suchak/                   ← Python FastAPI ML backend (port 8001)
    ├── main.py                      ← FastAPI application (all endpoints)
    ├── requirements.txt
    ├── test_api.py                  ← Complete API test suite
    ├── TESTING_DOCUMENTATION.md    ← 78 test cases
    ├── predictions.db               ← SQLite prediction history (auto-created)
    ├── engine/
    │   ├── predictor.py             ← ML inference (cached, thread-safe)
    │   ├── scoring.py               ← Rule-based scoring engine
    │   ├── recommender.py           ← Smart recommendation generator
    │   └── feature_builder.py       ← AMS data → ML feature vector
    └── ml/
        ├── train.py                 ← Full training pipeline
        ├── dataset.py               ← UCI dataset download + feature engineering
        ├── evaluate.py              ← Model evaluation + plots
        ├── models/                  ← Generated after training
        │   ├── best_model.pkl
        │   ├── scaler.pkl
        │   ├── label_encoder.pkl
        │   └── model_metrics.json
        ├── plots/                   ← Generated after training
        │   ├── cm_*.png
        │   ├── roc_*.png
        │   └── feat_*.png
        └── data/
            └── student-mat.csv      ← UCI dataset (auto-downloaded)
```

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | ≥ 18.x | `node --version` |
| npm | ≥ 9.x | `npm --version` |
| Python | ≥ 3.10 | `python --version` |
| pip | latest | `pip --version` |

---

## Installation Guide

### Step 1 — Clone / Download
```bash
# If using Git:
git clone <repo-url>
cd Administration_management_system
```

### Step 2 — Install AMS Backend (Node.js)
```bash
cd backend
npm install
```

### Step 3 — Install Frontend (React)
```bash
cd frontend
npm install
```

### Step 4 — Install ML Backend (Python)
```bash
cd sikhya_suchak
pip install -r requirements.txt
```

> **Windows users:** Use `pip install -r requirements.txt` in a virtual environment:
> ```bash
> python -m venv venv
> venv\Scripts\activate
> pip install -r requirements.txt
> ```

### Step 5 — Train the ML Model (one-time)
```bash
cd sikhya_suchak
python ml/train.py
```
This downloads the UCI dataset (~50KB), trains 5 models, and saves `best_model.pkl`.  
Expected output: `★ Best Model: Random Forest` (or similar based on F1 score).  
Time: ~2–3 minutes on a standard laptop.

---

## Running the System

You need **3 terminals** running simultaneously:

### Terminal 1 — AMS Node.js Backend
```bash
cd backend
node server.js
# Runs on http://localhost:3001
```

### Terminal 2 — Sikhya Suchak FastAPI
```bash
cd sikhya_suchak
uvicorn main:app --reload --port 8001
# API docs at http://localhost:8001/docs
```

### Terminal 3 — React Frontend
```bash
cd frontend
npm run dev
# App at http://localhost:5173
```

Then open **http://localhost:5173** and log in.

---

## ML Model Training

```bash
cd sikhya_suchak
python ml/train.py
```

### What it does:
1. Downloads UCI Student Performance dataset (`student-mat.csv`) automatically
2. Engineers 9 features from 33 raw columns
3. Trains 5 models: Decision Tree, Random Forest, Logistic Regression, SVM, XGBoost
4. Evaluates all with accuracy, precision, recall, F1, ROC-AUC, 5-fold cross-validation
5. Saves best model (by F1 score) as `ml/models/best_model.pkl`
6. Saves evaluation metrics to `ml/models/model_metrics.json`
7. Saves confusion matrix, ROC curve, and feature importance plots to `ml/plots/`

### Output files:
```
sikhya_suchak/ml/models/
  best_model.pkl         ← Trained classifier
  scaler.pkl             ← StandardScaler
  label_encoder.pkl      ← LabelEncoder (low/medium/high)
  model_metrics.json     ← All model metrics

sikhya_suchak/ml/plots/
  cm_random_forest.png   ← Confusion matrix
  roc_random_forest.png  ← ROC curves
  feat_random_forest.png ← Feature importance
  comparison.png         ← Model comparison bar chart
```

---

## Environment Variables

Create a `.env` file in `sikhya_suchak/` (optional — defaults shown):

```env
# AMS Node.js backend URL
AMS_BASE_URL=http://localhost:3001

# FastAPI port (set in uvicorn command, not here)
# uvicorn main:app --port 8001
```

For production, set `AMS_BASE_URL` to the deployed AMS backend URL.

---

## API Reference

### Base URL: `http://localhost:8001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check + ml_ready status |
| GET | `/model-status` | ML model readiness |
| GET | `/model-metrics` | All model metrics, prediction count |
| POST | `/predict` | Rule-based prediction (3 inputs) |
| POST | `/predict-ml` | ML prediction (9 inputs, saved to DB) |
| GET | `/students/all` | All students from AMS |
| GET | `/student/{id}` | One student's aggregated data |
| GET | `/student/{id}/predict-ml` | Auto-predict using real AMS data |
| GET | `/analytics` | System-wide risk analytics |
| GET | `/predictions/history` | All prediction history (paginated) |
| GET | `/predictions/history/{id}` | History for one student |
| DELETE | `/predictions/history` | Clear history (?confirm=true) |

Full interactive docs: **http://localhost:8001/docs**

---

## Developer Guide

### Adding a new feature to the ML model

1. Edit `ml/dataset.py` — add the new column to `FEATURE_COLUMNS`
2. Edit `engine/predictor.py` — add it to `FEATURE_ORDER`
3. Edit `engine/feature_builder.py` — compute the feature from AMS data
4. Edit `main.py` — add it to `MLPredictRequest`
5. Re-train: `python ml/train.py`

### Adding a new API endpoint

1. Add the route function in `main.py`
2. Add a test case in `test_api.py`
3. Export a new `fetchXxx()` function in `frontend/src/components/sikhyasuchak/api.js`

### Frontend component structure

All ML-related components live in:
```
src/components/sikhyasuchak/
```
The page wrapper (`src/pages/SikhyaSuchak.jsx`) handles:
- Role-based view routing (student / teacher / admin)
- API health check on mount
- Toast notifications
- Offline warning banner

---

## Deployment

### Production Build — React Frontend
```bash
cd frontend
npm run build
# Output: frontend/dist/  (deploy to Nginx/Apache/Vercel)
```

### Production — FastAPI
```bash
cd sikhya_suchak
# Install production server
pip install gunicorn

# Run with Gunicorn + Uvicorn workers
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

### Docker (optional)
```dockerfile
# sikhya_suchak/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python ml/train.py
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Files to include in deployment
```
sikhya_suchak/
  main.py
  requirements.txt
  engine/          (all .py files)
  ml/models/       (all .pkl + .json files — generated by train.py)
  predictions.db   (auto-created on first run)
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `API Offline` shown in UI | Start FastAPI: `uvicorn main:app --reload --port 8001` |
| `ML model not trained` (503 errors) | Run `python ml/train.py` from `sikhya_suchak/` |
| `Could not load students` (502 errors) | Start AMS Node backend: `node server.js` in `backend/` |
| `pip install` fails on Windows | Use `pip install --only-binary :all: scikit-learn` |
| XGBoost not found | `pip install xgboost` — it's optional, other 4 models still train |
| CORS errors in browser | Check FastAPI has `allow_origins=["*"]` in CORS middleware |
| Port 8001 already in use | Kill existing process or change port: `uvicorn main:app --port 8002` |
| Predictions not saving | Check `predictions.db` write permissions in `sikhya_suchak/` |

---

## License

This project is developed for academic purposes as part of a university final year project.

**Project:** Sikhya Suchak — AI-Based Academic Performance Prediction System  
**Institution:** [Your University Name]  
**Academic Year:** 2025–2026
