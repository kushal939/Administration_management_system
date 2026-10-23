# Sikhya Suchak — Rule-Based Scoring Engine
# Phase 1, Step 4
# Ready for FastAPI integration

from typing import TypedDict


# ─────────────────────────────────────────────
# Types
# ─────────────────────────────────────────────

class PredictionResult(TypedDict):
    marks_score:       float
    attendance_score:  float
    assignment_score:  float
    final_score:       float
    risk_level:        str
    recommendations:   list[str]


# ─────────────────────────────────────────────
# 1. Score Calculation
# ─────────────────────────────────────────────

def calculate_final_score(
    marks_score: float,
    attendance_score: float,
    assignment_score: float
) -> float:
    """
    Weighted composite score:
      marks      → 50%
      attendance → 30%
      assignment → 20%
    """
    return round(
        (marks_score * 0.50) +
        (attendance_score * 0.30) +
        (assignment_score * 0.20),
        2
    )


# ─────────────────────────────────────────────
# 2. Risk Level
# ─────────────────────────────────────────────

def get_risk_level(final_score: float) -> str:
    """
    >= 75  → low
    >= 50  → medium
    <  50  → high
    """
    if final_score >= 75:
        return "low"
    elif final_score >= 50:
        return "medium"
    else:
        return "high"


# ─────────────────────────────────────────────
# 3. Recommendation Engine
# ─────────────────────────────────────────────

def generate_recommendations(
    marks_score: float,
    attendance_score: float,
    assignment_score: float
) -> list[str]:
    """
    Rule-based recommendations. Each rule is independent.
    Thresholds: low < 50, medium 50–74, good >= 75
    """
    recommendations = []

    # Attendance rules
    if attendance_score < 50:
        recommendations.append(
            "Attendance is critically low (below 50%). Immediate improvement required to avoid academic penalty."
        )
    elif attendance_score < 75:
        recommendations.append(
            "Attendance is below 75%. Regular class participation is strongly advised."
        )

    # Marks rules
    if marks_score < 50:
        recommendations.append(
            "Exam performance is poor. Student should seek extra help and revise core topics."
        )
    elif marks_score < 75:
        recommendations.append(
            "Exam scores are average. Focused revision on weak subjects is recommended."
        )

    # Assignment rules
    if assignment_score < 50:
        recommendations.append(
            "Assignment completion rate is very low. Submitting pending work can significantly improve the score."
        )
    elif assignment_score < 75:
        recommendations.append(
            "Assignment performance needs improvement. Consistent submission and quality work is advised."
        )

    # All good
    if not recommendations:
        recommendations.append(
            "Student is performing well across all areas. Keep up the consistency."
        )

    return recommendations


# ─────────────────────────────────────────────
# 4. Main Prediction Function
# ─────────────────────────────────────────────

def predict(
    marks_score: float,
    attendance_score: float,
    assignment_score: float
) -> PredictionResult:
    """
    Entry point for the scoring engine.

    Args:
        marks_score:      0–100, based on exam results
        attendance_score: 0–100, based on classes attended
        assignment_score: 0–100, based on submission + quality

    Returns:
        PredictionResult dict with scores, risk level, and recommendations
    """
    final_score = calculate_final_score(marks_score, attendance_score, assignment_score)
    risk_level  = get_risk_level(final_score)
    recommendations = generate_recommendations(marks_score, attendance_score, assignment_score)

    return PredictionResult(
        marks_score=round(marks_score, 2),
        attendance_score=round(attendance_score, 2),
        assignment_score=round(assignment_score, 2),
        final_score=final_score,
        risk_level=risk_level,
        recommendations=recommendations
    )


# ─────────────────────────────────────────────
# Quick test (remove before production)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # Aarav — strong student
    aarav = predict(87.5, 94.7, 93.3)
    print("Aarav:", aarav)

    # Priya — at-risk student
    priya = predict(37.5, 50.0, 36.7)
    print("Priya:", priya)
