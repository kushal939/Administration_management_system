"""
engine/feature_builder.py — Sikhya Suchak  (Step 5 — Fixed for AMS real schema)
==================================================================================
Converts raw AMS database records into the 9-feature vector the ML model expects.

AMS REAL SCHEMAS:
  Attendance record: { studentId, course, date, status: "present"|"absent" }
  Marks record:      { studentId, course, marks, total_marks? }   ← OR legacy format
  Submission record: { studentId, status, marks_obtained, total_marks }

LEGACY EXPECTED SCHEMAS (kept for backward compat):
  Attendance: { totalClasses, attendedClasses }
  Marks:      { examType, marksObtained, maxMarks }
"""

from typing import List, Dict, Any


def build_features_from_ams(
    marks: List[Dict[str, Any]],
    attendance: List[Dict[str, Any]],
    submissions: List[Dict[str, Any]],
    previous_gpa: float = 0.0,
    study_hours: float = 0.0,
    extra_activities: int = 0,
) -> Dict[str, float]:
    """
    Builds the 9 ML input features from raw AMS data.
    Handles both the real AMS schema and the legacy expected schema.
    Returns sensible neutral defaults when data is missing.
    """

    # ── Attendance ────────────────────────────────────────────────────────────
    # Real AMS: array of { status: "present"|"absent" } rows per class
    # Legacy:   array of { totalClasses, attendedClasses } aggregates
    attendance_pct = 0.0

    if attendance:
        first = attendance[0]

        if 'status' in first:
            # REAL AMS format: count present/absent rows
            total    = len(attendance)
            present  = sum(1 for r in attendance
                          if str(r.get('status', '')).lower() == 'present')
            attendance_pct = round((present / total) * 100, 2) if total > 0 else 60.0

        elif 'totalClasses' in first or 'attendedClasses' in first:
            # Legacy aggregated format
            total_cls  = sum(r.get('totalClasses', 0)    for r in attendance)
            attended   = sum(r.get('attendedClasses', 0) for r in attendance)
            attendance_pct = round((attended / total_cls) * 100, 2) if total_cls > 0 else 60.0

        else:
            attendance_pct = 60.0   # neutral default
    else:
        attendance_pct = 60.0       # no data → neutral

    # ── Marks ─────────────────────────────────────────────────────────────────
    # Real AMS: { studentId, course, marks, total_marks? }  — no examType
    # Legacy:   { examType, marksObtained, maxMarks }
    midterm_marks  = 0.0
    internal_marks = 0.0
    lab_marks      = 0.0
    quiz_score     = 0.0
    all_scores     = []

    if marks:
        first = marks[0]

        if 'examType' in first:
            # Legacy format with examType
            def avg_by_type(exam_type: str) -> float:
                filtered = [m for m in marks
                            if str(m.get('examType', '')).lower() == exam_type.lower()]
                if not filtered:
                    return 0.0
                scores = [
                    (m.get('marksObtained', 0) / max(m.get('maxMarks', 100), 1)) * 100
                    for m in filtered
                ]
                return round(sum(scores) / len(scores), 2)

            midterm_marks  = avg_by_type('midterm')
            internal_marks = avg_by_type('internal')
            lab_marks      = avg_by_type('lab')
            quiz_score     = avg_by_type('quiz')

        else:
            # Real AMS schema: { studentId, course, marks }
            # 'marks' is already a score (e.g. 75 out of 100)
            valid_scores = []
            for m in marks:
                raw   = m.get('marks', 0)
                # total_marks may not exist in AMS — assume out of 100
                total = m.get('total_marks', m.get('maxMarks', 100))
                if raw is not None:
                    try:
                        pct = (float(raw) / float(total)) * 100 if float(total) > 0 else float(raw)
                        valid_scores.append(min(100.0, round(pct, 2)))
                    except (TypeError, ValueError):
                        continue

            if valid_scores:
                avg = round(sum(valid_scores) / len(valid_scores), 2)
                midterm_marks  = avg
                internal_marks = avg
                lab_marks      = avg
                quiz_score     = avg

    # ── Assignment score ──────────────────────────────────────────────────────
    graded = [s for s in submissions if s.get('status') == 'graded']
    if graded:
        assignment_score = round(
            sum(
                (float(s.get('marks_obtained', 0)) /
                 max(float(s.get('total_marks', 100)), 1)) * 100
                for s in graded
            ) / len(graded), 2
        )
    elif submissions:
        assignment_score = 50.0   # submitted but not graded → neutral
    else:
        assignment_score = 50.0   # no submission data → neutral default

    return {
        'attendance_pct':   float(min(100.0, max(0.0, attendance_pct))),
        'assignment_score': float(min(100.0, max(0.0, assignment_score))),
        'quiz_score':       float(min(100.0, max(0.0, quiz_score))),
        'midterm_marks':    float(min(100.0, max(0.0, midterm_marks))),
        'internal_marks':   float(min(100.0, max(0.0, internal_marks))),
        'lab_marks':        float(min(100.0, max(0.0, lab_marks))),
        'previous_gpa':     float(min(4.0, max(0.0, previous_gpa))),
        'study_hours':      float(min(24.0, max(0.0, study_hours))),
        'extra_activities': int(extra_activities),
    }


def validate_features(features: Dict[str, float]) -> Dict[str, float]:
    """
    Clamps all feature values to their valid ranges.
    Prevents out-of-range values from causing errors in the scaler.
    """
    ranges = {
        'attendance_pct':   (0.0, 100.0),
        'assignment_score': (0.0, 100.0),
        'quiz_score':       (0.0, 100.0),
        'midterm_marks':    (0.0, 100.0),
        'internal_marks':   (0.0, 100.0),
        'lab_marks':        (0.0, 100.0),
        'previous_gpa':     (0.0, 4.0),
        'study_hours':      (0.0, 24.0),
        'extra_activities': (0,   1),
    }
    validated = {}
    for key, (lo, hi) in ranges.items():
        val = features.get(key, 0.0)
        validated[key] = max(lo, min(hi, float(val)))
    return validated
