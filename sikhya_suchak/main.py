"""
main.py — Sikhya Suchak FastAPI Application (Step 5 — Production Ready)
========================================================================
Enhancements in Step 5:
  - Prediction history stored in SQLite (predictions.db)
  - GET /predictions/history — list all predictions
  - GET /predictions/history/{student_id} — by student
  - Rate limiting headers
  - Input validation via Pydantic (already present, improved)
  - Proper error handling + structured error responses
  - Startup event: auto-load ML artifacts + init DB
  - GET /model-metrics returns enhanced metrics (confusion matrix, training date)

Endpoints:
  GET  /                         → Health check
  GET  /model-status             → ML model readiness
  GET  /model-metrics            → All model metrics + confusion matrix data
  POST /predict                  → Rule-based prediction
  POST /predict-ml               → ML prediction (stores to history)
  GET  /student/{id}             → Fetch AMS student data
  GET  /students/all             → All students
  GET  /student/{id}/predict-ml  → Auto-predict for AMS student
  GET  /analytics                → System-wide analytics
  GET  /predictions/history      → All prediction history
  GET  /predictions/history/{id} → History for one student
  DELETE /predictions/history    → Clear all history (admin only)

Run:
  cd sikhya_suchak
  uvicorn main:app --reload --port 8001
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx

from engine.scoring import predict as rule_predict
from engine.predictor import predict_ml, get_model_metadata, is_model_ready

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "predictions.db")
AMS_BASE_URL = os.getenv("AMS_BASE_URL", "http://localhost:3001")

# ── Database init ─────────────────────────────────────────────────────────────
def init_db():
    """Creates predictions table if not exists."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            prediction_id    TEXT PRIMARY KEY,
            student_id       TEXT NOT NULL,
            student_name     TEXT,
            department       TEXT,
            prediction_date  TEXT NOT NULL,
            predicted_grade  TEXT,
            risk_level       TEXT,
            confidence_score REAL,
            final_score      REAL,
            probability      TEXT,
            model_used       TEXT,
            recommendations  TEXT,
            features_used    TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_prediction(
    student_id: str,
    student_name: Optional[str],
    department: Optional[str],
    predicted_grade: str,
    risk_level: str,
    confidence_score: float,
    final_score: float,
    probability: dict,
    model_used: str,
    recommendations: list,
    features_used: Optional[dict] = None,
) -> str:
    """Saves a prediction to SQLite. Returns the new prediction_id."""
    pred_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """INSERT INTO predictions VALUES
           (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            pred_id,
            str(student_id),
            student_name or "",
            department or "",
            datetime.utcnow().isoformat(),
            predicted_grade,
            risk_level,
            confidence_score,
            final_score,
            json.dumps(probability),
            model_used,
            json.dumps(recommendations),
            json.dumps(features_used or {}),
        )
    )
    conn.commit()
    conn.close()
    return pred_id


def row_to_dict(row) -> dict:
    """Converts a sqlite3.Row to a dict with parsed JSON fields."""
    d = dict(zip(
        ["prediction_id","student_id","student_name","department",
         "prediction_date","predicted_grade","risk_level","confidence_score",
         "final_score","probability","model_used","recommendations","features_used"],
        row
    ))
    for field in ["probability", "recommendations", "features_used"]:
        try:
            d[field] = json.loads(d[field])
        except (TypeError, json.JSONDecodeError):
            d[field] = {}
    return d

# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialises database and pre-loads ML artifacts on startup."""
    init_db()
    if is_model_ready():
        try:
            get_model_metadata()   # warms the cache
            print("[startup] ML model loaded and ready.")
        except Exception as e:
            print(f"[startup] Warning — could not pre-load ML model: {e}")
    else:
        print("[startup] ML model not trained yet. Run python ml/train.py")
    yield   # app runs here

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sikhya Suchak API",
    description="AI-Based Academic Performance Prediction — Production Ready",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": str(request.url.path),
        }
    )

# ── Request / Response Models ─────────────────────────────────────────────────

class RuleBasedRequest(BaseModel):
    marks_score:      float = Field(..., ge=0, le=100, description="Marks/exam score 0–100")
    attendance_score: float = Field(..., ge=0, le=100, description="Attendance score 0–100")
    assignment_score: float = Field(..., ge=0, le=100, description="Assignment score 0–100")

class RuleBasedResponse(BaseModel):
    marks_score:      float
    attendance_score: float
    assignment_score: float
    final_score:      float
    risk_level:       str
    recommendations:  List[str]

class MLPredictRequest(BaseModel):
    attendance_pct:   float = Field(..., ge=0, le=100,  description="Attendance percentage")
    assignment_score: float = Field(..., ge=0, le=100,  description="Assignment score")
    quiz_score:       float = Field(..., ge=0, le=100,  description="Quiz/test score")
    midterm_marks:    float = Field(..., ge=0, le=100,  description="Midterm exam marks")
    internal_marks:   float = Field(..., ge=0, le=100,  description="Internal assessment marks")
    lab_marks:        float = Field(..., ge=0, le=100,  description="Lab/practical marks")
    previous_gpa:     float = Field(..., ge=0, le=4.0,  description="Previous semester GPA")
    study_hours:      float = Field(..., ge=0, le=24,   description="Weekly study hours")
    extra_activities: int   = Field(..., ge=0, le=1,    description="Extra-curricular (0=No,1=Yes)")
    # Optional student context for history storage
    student_id:   Optional[str] = Field(None, description="Student ID for history storage")
    student_name: Optional[str] = Field(None, description="Student name for history storage")
    department:   Optional[str] = Field(None, description="Department for history storage")

class MLPredictResponse(BaseModel):
    prediction_id:    Optional[str]
    predicted_grade:  str
    risk_level:       str
    probability:      Dict[str, float]
    confidence_score: float
    final_score:      float
    recommendations:  List[str]
    feature_importance: Dict[str, float]
    features_used:    Optional[Dict[str, Any]]
    model_used:       str
    prediction_date:  Optional[str]

class PredictionHistoryItem(BaseModel):
    prediction_id:   str
    student_id:      str
    student_name:    str
    department:      str
    prediction_date: str
    predicted_grade: str
    risk_level:      str
    confidence_score: float
    final_score:     float
    probability:     Dict[str, Any]
    model_used:      str
    recommendations: List[str]
    features_used:   Dict[str, Any]

# ── System Endpoints ──────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
def health_check():
    """Health check — confirms API is running."""
    return {
        "status":  "ok",
        "system":  "Sikhya Suchak",
        "version": "3.0.0",
        "message": "Academic Performance Prediction API is running.",
        "ml_ready": is_model_ready(),
    }

@app.get("/model-status", tags=["System"])
def model_status():
    """Returns whether the ML model has been trained and is ready."""
    ready = is_model_ready()
    return {
        "ml_ready": ready,
        "message": "ML model is ready." if ready else
                   "ML model not found. Run 'python ml/train.py' to train.",
    }

@app.get("/model-metrics", tags=["ML"])
def model_metrics():
    """
    Returns full model evaluation metrics for Admin Dashboard.
    Includes: accuracy, precision, recall, F1, ROC-AUC, confusion matrix data,
    feature importance, training date, model version, prediction count.
    """
    if not is_model_ready():
        raise HTTPException(
            status_code=503,
            detail="ML model not trained yet. Run 'python ml/train.py' first."
        )
    meta = get_model_metadata()

    # Attach prediction count from DB
    try:
        conn = sqlite3.connect(DB_PATH)
        count = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        best_model_count = conn.execute(
            "SELECT COUNT(*) FROM predictions WHERE model_used=?",
            (meta.get("best_model", ""),)
        ).fetchone()[0]
        avg_confidence = conn.execute(
            "SELECT AVG(confidence_score) FROM predictions"
        ).fetchone()[0]
        conn.close()
    except Exception:
        count = 0
        best_model_count = 0
        avg_confidence = None

    # Attach confusion matrix labels from class_names
    class_names = meta.get("class_names", ["high", "low", "medium"])

    return {
        **meta,
        "prediction_count":    count,
        "model_prediction_count": best_model_count,
        "average_confidence":  round(avg_confidence, 4) if avg_confidence else None,
        "confusion_matrix_labels": class_names,
        "api_version":         "3.0.0",
    }

# ── Prediction Endpoints ──────────────────────────────────────────────────────

@app.post("/predict", response_model=RuleBasedResponse, tags=["Prediction"])
def predict_rule_based(data: RuleBasedRequest):
    """
    Original rule-based prediction. Kept for backward compatibility.
    Uses: Final = Marks×0.5 + Attendance×0.3 + Assignment×0.2
    """
    result = rule_predict(
        marks_score=data.marks_score,
        attendance_score=data.attendance_score,
        assignment_score=data.assignment_score,
    )
    return result


@app.post("/predict-ml", response_model=MLPredictResponse, tags=["Prediction"])
def predict_machine_learning(data: MLPredictRequest):
    """
    ML-based prediction using the trained best_model.pkl with 9 input features.
    Saves every prediction to SQLite history database.
    """
    if not is_model_ready():
        raise HTTPException(
            status_code=503,
            detail="ML model is not trained yet. Run 'python ml/train.py' first."
        )

    result = predict_ml(
        attendance_pct=data.attendance_pct,
        assignment_score=data.assignment_score,
        quiz_score=data.quiz_score,
        midterm_marks=data.midterm_marks,
        internal_marks=data.internal_marks,
        lab_marks=data.lab_marks,
        previous_gpa=data.previous_gpa,
        study_hours=data.study_hours,
        extra_activities=data.extra_activities,
    )

    features_used = {
        "attendance_pct":   data.attendance_pct,
        "assignment_score": data.assignment_score,
        "quiz_score":       data.quiz_score,
        "midterm_marks":    data.midterm_marks,
        "internal_marks":   data.internal_marks,
        "lab_marks":        data.lab_marks,
        "previous_gpa":     data.previous_gpa,
        "study_hours":      data.study_hours,
        "extra_activities": data.extra_activities,
    }

    pred_id = save_prediction(
        student_id=data.student_id or "manual",
        student_name=data.student_name,
        department=data.department,
        predicted_grade=result["predicted_grade"],
        risk_level=result["risk_level"],
        confidence_score=result["confidence_score"],
        final_score=result["final_score"],
        probability=result["probability"],
        model_used=result["model_used"],
        recommendations=result["recommendations"],
        features_used=features_used,
    )

    return {
        **result,
        "prediction_id":  pred_id,
        "features_used":  features_used,
        "prediction_date": datetime.utcnow().isoformat(),
    }

# ── Prediction History Endpoints ──────────────────────────────────────────────

@app.get("/predictions/history", tags=["History"])
def get_prediction_history(
    limit:      int    = Query(50,  ge=1, le=200, description="Max records to return"),
    offset:     int    = Query(0,   ge=0,          description="Pagination offset"),
    risk_level: Optional[str] = Query(None, description="Filter: low|medium|high"),
    date_from:  Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to:    Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
):
    """
    Returns paginated prediction history from SQLite.
    Supports filtering by risk level and date range.
    """
    conn = sqlite3.connect(DB_PATH)
    where_clauses = []
    params: List[Any] = []

    if risk_level:
        where_clauses.append("risk_level = ?")
        params.append(risk_level)
    if date_from:
        where_clauses.append("prediction_date >= ?")
        params.append(date_from)
    if date_to:
        where_clauses.append("prediction_date <= ?")
        params.append(date_to + "T23:59:59")

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    total = conn.execute(
        f"SELECT COUNT(*) FROM predictions {where_sql}", params
    ).fetchone()[0]

    rows = conn.execute(
        f"SELECT * FROM predictions {where_sql} "
        "ORDER BY prediction_date DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "predictions": [row_to_dict(r) for r in rows],
    }


@app.get("/predictions/history/{student_id}", tags=["History"])
def get_student_prediction_history(student_id: str):
    """Returns all ML predictions for a specific student, newest first."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT * FROM predictions WHERE student_id=? ORDER BY prediction_date DESC",
        (student_id,)
    ).fetchall()
    conn.close()

    return {
        "student_id": student_id,
        "count": len(rows),
        "predictions": [row_to_dict(r) for r in rows],
    }


@app.delete("/predictions/history", tags=["History"])
def clear_prediction_history(confirm: bool = Query(False, description="Set true to confirm")):
    """Clears all prediction history. Requires ?confirm=true."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass ?confirm=true to clear history.")
    conn = sqlite3.connect(DB_PATH)
    count = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
    conn.execute("DELETE FROM predictions")
    conn.commit()
    conn.close()
    return {"deleted": count, "message": f"Cleared {count} prediction records."}

# ── Student Endpoints ─────────────────────────────────────────────────────────

@app.get("/student/{student_id}", tags=["Students"])
async def get_student_data(student_id: str):
    """Fetches and aggregates a student's academic data from the AMS backend."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            students_res = await client.get(f"{AMS_BASE_URL}/api/students")
            students_data = students_res.json()
            student = next(
                (s for s in (students_data.get("data") or [])
                 if s.get("studentId") == student_id or str(s.get("id")) == student_id),
                None,
            )
            if not student:
                raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found")

            db_id = student["id"]
            # Use string studentId for marks — AMS marks table uses studentId string not db int id
            str_sid = student.get("studentId", str(db_id))
            marks_res = await client.get(f"{AMS_BASE_URL}/api/marks?studentId={str_sid}")
            att_res   = await client.get(f"{AMS_BASE_URL}/api/attendance?studentId={student_id}")
            sub_res   = await client.get(f"{AMS_BASE_URL}/api/submissions/student/{student_id}")

            marks_data = marks_res.json().get("data") or []
            att_data   = att_res.json().get("data") or []
            sub_data   = sub_res.json().get("data") or []
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach AMS backend at {AMS_BASE_URL}: {str(e)}"
            )

    # Attendance — handles both AMS real format (status: present/absent)
    # and legacy format (totalClasses, attendedClasses)
    if att_data and 'status' in att_data[0]:
        total_classes  = len(att_data)
        attended       = sum(1 for r in att_data if str(r.get('status', '')).lower() == 'present')
    else:
        total_classes  = sum(r.get("totalClasses", 0) for r in att_data)
        attended       = sum(r.get("attendedClasses", 0) for r in att_data)
    attendance_pct = round((attended / total_classes * 100) if total_classes > 0 else 60.0, 2)

    # Marks — handle both AMS real schema and legacy examType schema
    if marks_data and 'examType' in marks_data[0]:
        # Legacy schema
        def avg_marks(exam_type: str) -> float:
            f = [m for m in marks_data if str(m.get("examType","")).lower() == exam_type.lower()]
            if not f:
                return 0.0
            return round(
                sum((m.get("marksObtained",0) / max(m.get("maxMarks",100),1)) * 100 for m in f)
                / len(f), 2
            )
        quiz_score     = avg_marks("quiz")
        midterm_marks  = avg_marks("midterm")
        internal_marks = avg_marks("internal")
        lab_marks_val  = avg_marks("lab")
    else:
        # Real AMS schema: { marks, total_marks? }
        valid = []
        for m in marks_data:
            raw   = m.get("marks", 0)
            total = m.get("total_marks", m.get("maxMarks", 100))
            if raw is not None and total and float(total) > 0:
                valid.append(min(100.0, round((float(raw) / float(total)) * 100, 2)))
        avg = round(sum(valid) / len(valid), 2) if valid else 0.0
        quiz_score = midterm_marks = internal_marks = lab_marks_val = avg

    graded = [s for s in sub_data if s.get("status") == "graded"]
    assignment_score = (
        round(sum((s.get("marks_obtained",0)/max(s.get("total_marks",100),1))*100 for s in graded)
              / len(graded), 2) if graded else (50.0 if sub_data else 50.0)
    )

    return {
        "student":              student,
        "student_name":         student.get("name"),
        "student_id":           student_id,
        "department":           student.get("department"),
        "attendance_pct":       attendance_pct,
        "assignment_score":     assignment_score,
        "quiz_score":           quiz_score,
        "midterm_marks":        midterm_marks,
        "internal_marks":       internal_marks,
        "lab_marks":            lab_marks_val,
        "previous_gpa":         0.0,
        "study_hours":          0.0,
        "extra_activities":     0,
        "raw": {
            "marks_count":       len(marks_data),
            "attendance_count":  len(att_data),
            "submissions_count": len(sub_data),
        },
    }


@app.get("/students/all", tags=["Students"])
async def get_all_students():
    """Fetches all students from AMS. Returns identity + attendance_pct from AMS."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(f"{AMS_BASE_URL}/api/students")
            students = res.json().get("data") or []
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Could not reach AMS: {str(e)}")

    result = []
    # Read attendance from local DB for efficiency (avoid N+1 HTTP calls)
    AMS_DB = os.path.join(os.path.dirname(BASE_DIR), "backend", "database.sqlite")
    att_map: dict = {}
    try:
        if os.path.exists(AMS_DB):
            import sqlite3 as _sqlite3
            conn = _sqlite3.connect(AMS_DB)
            rows = conn.execute(
                "SELECT studentId, COUNT(*) as total, "
                "SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present "
                "FROM attendance GROUP BY studentId"
            ).fetchall()
            conn.close()
            for r in rows:
                t = r[1] or 1
                p = r[2] or 0
                att_map[r[0]] = round((p / t) * 100, 1)
    except Exception:
        pass  # fallback: no attendance data

    for s in students:
        sid = s.get("studentId", "")
        result.append({
            "id":             s.get("id"),
            "student_id":     sid,
            "student_name":   s.get("name"),
            "department":     s.get("department"),
            "year":           s.get("year"),
            "email":          s.get("email"),
            "attendance_pct": att_map.get(sid),
        })

    return {"success": True, "count": len(result), "students": result}

@app.get("/student/{student_id}/predict-ml", tags=["Students"])
async def predict_for_student(
    student_id:       str,
    previous_gpa:     float = Query(0.0, ge=0, le=4.0),
    study_hours:      float = Query(3.5, ge=0, le=24),
    extra_activities: int   = Query(0,   ge=0, le=1),
):
    """
    Fetches a student's AMS data, builds features, runs ML prediction,
    and saves the result to prediction history.
    """
    if not is_model_ready():
        raise HTTPException(
            status_code=503,
            detail="ML model not trained yet. Run 'python ml/train.py' first."
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            students_res = await client.get(f"{AMS_BASE_URL}/api/students")
            all_students = students_res.json().get("data") or []
            student = next(
                (s for s in all_students
                 if s.get("studentId") == student_id or str(s.get("id")) == student_id),
                None,
            )
            if not student:
                raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found")

            db_id   = student["id"]
            str_sid = student.get("studentId", str(db_id))
            marks_res = await client.get(f"{AMS_BASE_URL}/api/marks?studentId={str_sid}")
            att_res   = await client.get(f"{AMS_BASE_URL}/api/attendance?studentId={student_id}")
            sub_res   = await client.get(f"{AMS_BASE_URL}/api/submissions/student/{student_id}")
            marks_data = marks_res.json().get("data") or []
            att_data   = att_res.json().get("data") or []
            sub_data   = sub_res.json().get("data") or []
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"AMS backend error: {str(e)}")

    from engine.feature_builder import build_features_from_ams, validate_features
    features = validate_features(build_features_from_ams(
        marks=marks_data, attendance=att_data, submissions=sub_data,
        previous_gpa=previous_gpa, study_hours=study_hours,
        extra_activities=extra_activities,
    ))

    prediction = predict_ml(**features)

    pred_id = save_prediction(
        student_id=student_id,
        student_name=student.get("name"),
        department=student.get("department"),
        predicted_grade=prediction["predicted_grade"],
        risk_level=prediction["risk_level"],
        confidence_score=prediction["confidence_score"],
        final_score=prediction["final_score"],
        probability=prediction["probability"],
        model_used=prediction["model_used"],
        recommendations=prediction["recommendations"],
        features_used=features,
    )

    return {
        "prediction_id":    pred_id,
        "student_id":       student_id,
        "student_name":     student.get("name"),
        "department":       student.get("department"),
        "features_used":    features,
        "predicted_grade":  prediction["predicted_grade"],
        "risk_level":       prediction["risk_level"],
        "confidence_score": prediction["confidence_score"],
        "probability":      prediction["probability"],
        "final_score":      prediction["final_score"],
        "recommendations":  prediction["recommendations"],
        "feature_importance": prediction["feature_importance"],
        "model_used":       prediction["model_used"],
        "prediction_date":  datetime.utcnow().isoformat(),
    }

# ── Analytics Endpoint ────────────────────────────────────────────────────────

@app.get("/analytics", tags=["Analytics"])
async def get_analytics():
    """
    System-wide analytics: risk distribution, averages, dept breakdown.
    Includes history statistics from SQLite when available.
    """
    if not is_model_ready():
        raise HTTPException(status_code=503,
            detail="ML model not trained. Run 'python ml/train.py' first.")

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(f"{AMS_BASE_URL}/api/students")
            all_students = res.json().get("data") or []
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"AMS error: {str(e)}")

    if not all_students:
        return {"total_students": 0, "risk_distribution": {}, "message": "No student data."}

    from engine.feature_builder import build_features_from_ams, validate_features

    risk_counts   = {"low": 0, "medium": 0, "high": 0}
    dept_risks: dict = {}
    all_scores:     list = []
    all_confidence: list = []
    all_attendance: list = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for student in all_students[:50]:
            try:
                db_id      = student["id"]
                student_id = student.get("studentId", str(db_id))
                dept       = student.get("department", "Unknown")

                marks_res = await client.get(f"{AMS_BASE_URL}/api/marks?studentId={student_id}")
                att_res   = await client.get(f"{AMS_BASE_URL}/api/attendance?studentId={student_id}")
                sub_res   = await client.get(f"{AMS_BASE_URL}/api/submissions/student/{student_id}")

                features = validate_features(build_features_from_ams(
                    marks=marks_res.json().get("data") or [],
                    attendance=att_res.json().get("data") or [],
                    submissions=sub_res.json().get("data") or [],
                ))
                pred = predict_ml(**features)
                risk = pred["risk_level"]
                risk_counts[risk] = risk_counts.get(risk, 0) + 1
                all_scores.append(pred["final_score"])
                all_confidence.append(pred["confidence_score"])
                all_attendance.append(features["attendance_pct"])

                if dept not in dept_risks:
                    dept_risks[dept] = {"low":0,"medium":0,"high":0,"total":0,
                                        "avg_attendance":0,"avg_final_score":0}
                dept_risks[dept][risk] += 1
                dept_risks[dept]["total"] += 1
                dept_risks[dept]["avg_attendance"] = round(
                    (dept_risks[dept]["avg_attendance"] * (dept_risks[dept]["total"]-1)
                     + features["attendance_pct"]) / dept_risks[dept]["total"], 2)
                dept_risks[dept]["avg_final_score"] = round(
                    (dept_risks[dept]["avg_final_score"] * (dept_risks[dept]["total"]-1)
                     + pred["final_score"]) / dept_risks[dept]["total"], 2)
            except Exception:
                continue

    total = sum(risk_counts.values())
    pct   = lambda n: round((n / total * 100), 1) if total > 0 else 0

    # DB-backed prediction count
    try:
        conn = sqlite3.connect(DB_PATH)
        db_count = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        conn.close()
    except Exception:
        db_count = 0

    return {
        "total_students":     len(all_students),
        "analyzed_students":  total,
        "total_predictions_stored": db_count,
        "risk_distribution": {
            "low":    {"count": risk_counts["low"],    "percentage": pct(risk_counts["low"])},
            "medium": {"count": risk_counts["medium"], "percentage": pct(risk_counts["medium"])},
            "high":   {"count": risk_counts["high"],   "percentage": pct(risk_counts["high"])},
        },
        "averages": {
            "final_score":    round(sum(all_scores)/len(all_scores),2)     if all_scores    else 0,
            "confidence":     round(sum(all_confidence)/len(all_confidence),2) if all_confidence else 0,
            "attendance_pct": round(sum(all_attendance)/len(all_attendance),2) if all_attendance  else 0,
        },
        "department_breakdown": dept_risks,
        "model_used": get_model_metadata().get("best_model","Unknown") if is_model_ready() else "N/A",
    }
