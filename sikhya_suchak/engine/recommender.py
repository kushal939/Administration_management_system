"""
engine/recommender.py — Sikhya Suchak Smart Recommendation Engine
==================================================================
Generates dynamic, feature-weighted recommendations.
NO hardcoded text — every recommendation is generated based on
the actual feature values and their relative weakness.

Logic:
  1. Each feature has a threshold-based scoring rule
  2. Weak features are ranked by severity
  3. Top N recommendations are returned, ordered by priority
  4. Positive reinforcement is added when performance is strong
"""

from typing import Dict, List


# ── Recommendation rules ──────────────────────────────────────────────────────
# Each rule: (feature_key, threshold_critical, threshold_warning, rec_critical, rec_warning, rec_good)
RULES = [
    {
        "feature":   "attendance_pct",
        "critical":  50,
        "warning":   75,
        "rec_critical": (
            "Attendance is critically low at {value:.1f}%. "
            "You are at serious risk of losing exam eligibility. "
            "Contact your teacher immediately and plan to attend all remaining classes."
        ),
        "rec_warning": (
            "Attendance is {value:.1f}%, which is below the required 75%. "
            "Missing even one more class could impact your eligibility. "
            "Prioritize attending every scheduled session."
        ),
        "rec_good": (
            "Excellent attendance at {value:.1f}%. "
            "Maintaining this consistency is a strong predictor of academic success."
        ),
        "priority": 1,
    },
    {
        "feature":   "midterm_marks",
        "critical":  40,
        "warning":   65,
        "rec_critical": (
            "Midterm score of {value:.1f}/100 is very low. "
            "Review the midterm paper with your teacher, identify weak topics, "
            "and create a focused revision plan before the final exam."
        ),
        "rec_warning": (
            "Midterm performance ({value:.1f}/100) needs improvement. "
            "Focus on understanding concepts rather than memorization "
            "and practice past exam papers."
        ),
        "rec_good": (
            "Strong midterm performance ({value:.1f}/100). "
            "Keep this momentum going into the final exam."
        ),
        "priority": 2,
    },
    {
        "feature":   "internal_marks",
        "critical":  40,
        "warning":   65,
        "rec_critical": (
            "Internal assessment marks ({value:.1f}/100) are critically low. "
            "Participate actively in class activities, complete all internal tasks, "
            "and consult your teacher for guidance."
        ),
        "rec_warning": (
            "Internal marks ({value:.1f}/100) are average. "
            "Focus on improving classroom participation and completing "
            "all internal components."
        ),
        "rec_good": None,
        "priority": 3,
    },
    {
        "feature":   "assignment_score",
        "critical":  40,
        "warning":   65,
        "rec_critical": (
            "Assignment score of {value:.1f}/100 suggests many assignments are incomplete. "
            "Submit all pending assignments immediately — "
            "even late submissions are better than zero."
        ),
        "rec_warning": (
            "Assignment performance ({value:.1f}/100) can be improved. "
            "Set deadlines for yourself and complete each assignment thoroughly "
            "before submission."
        ),
        "rec_good": None,
        "priority": 4,
    },
    {
        "feature":   "quiz_score",
        "critical":  40,
        "warning":   60,
        "rec_critical": (
            "Quiz score ({value:.1f}/100) is very low, suggesting gaps in "
            "regular topic understanding. Take daily 15-minute self-quizzes "
            "to test your knowledge after each topic."
        ),
        "rec_warning": (
            "Quiz performance ({value:.1f}/100) needs improvement. "
            "Review class notes regularly and attempt practice questions "
            "from each chapter."
        ),
        "rec_good": None,
        "priority": 5,
    },
    {
        "feature":   "lab_marks",
        "critical":  40,
        "warning":   60,
        "rec_critical": (
            "Lab marks ({value:.1f}/100) are critically low. "
            "Attend all lab sessions, prepare beforehand by reviewing "
            "the lab manual, and seek help from the lab instructor."
        ),
        "rec_warning": (
            "Lab performance ({value:.1f}/100) needs attention. "
            "Practice lab exercises outside of scheduled sessions "
            "to improve your practical skills."
        ),
        "rec_good": None,
        "priority": 6,
    },
    {
        "feature":   "study_hours",
        "critical":  2,
        "warning":   4,
        "rec_critical": (
            "Only {value:.1f} hours of study per week is insufficient "
            "for your current workload. Aim for at least 2 hours per day "
            "spread across subjects."
        ),
        "rec_warning": (
            "Study time of {value:.1f} hours/week could be increased. "
            "Consider a structured weekly study schedule with "
            "dedicated time slots per subject."
        ),
        "rec_good": (
            "Committing {value:.1f} hours/week to studying is excellent. "
            "Maintain this disciplined approach."
        ),
        "priority": 7,
    },
    {
        "feature":   "previous_gpa",
        "critical":  1.5,
        "warning":   2.5,
        "rec_critical": (
            "Previous GPA of {value:.2f} indicates a history of academic difficulty. "
            "Consider working with a tutor or academic advisor to "
            "build stronger foundational knowledge."
        ),
        "rec_warning": (
            "Previous GPA ({value:.2f}) shows room for improvement. "
            "Focus on consistent effort this semester to raise your cumulative GPA."
        ),
        "rec_good": (
            "Strong previous GPA ({value:.2f}) shows a solid academic track record. "
            "Continue applying the same level of dedication."
        ),
        "priority": 8,
    },
    {
        "feature":   "extra_activities",
        "critical":  None,  # binary — no critical threshold
        "warning":   None,
        "rec_critical": None,
        "rec_warning": None,
        "rec_good": None,
        "priority": 9,
    },
]

# Risk-level summary messages (prepended to the list)
RISK_SUMMARY = {
    "high": (
        "⚠️ You are currently at HIGH academic risk. "
        "Immediate action is required to avoid failing this semester."
    ),
    "medium": (
        "📊 You are at MEDIUM risk. Your performance needs consistent improvement "
        "over the coming weeks."
    ),
    "low": (
        "✅ You are performing well with LOW academic risk. "
        "Keep up your current effort and stay consistent."
    ),
}


def generate_smart_recommendations(
    features: Dict[str, float],
    risk_level: str,
    max_recs: int = 5,
) -> List[str]:
    """
    Generates a ranked list of recommendations based on the student's
    actual feature values and predicted risk level.

    Args:
        features   : dict of feature name → value
        risk_level : 'low', 'medium', or 'high'
        max_recs   : maximum number of recommendations to return

    Returns:
        List of recommendation strings, ordered by priority.
    """
    recommendations = []

    # 1. Add risk-level summary as first item
    summary = RISK_SUMMARY.get(risk_level, "")
    if summary:
        recommendations.append(summary)

    # 2. Score each feature by how far below threshold it falls
    scored_recs = []

    for rule in RULES:
        key   = rule["feature"]
        value = features.get(key, None)

        if value is None or rule["critical"] is None:
            continue

        if value < rule["critical"]:
            severity = 2  # critical
            text = rule["rec_critical"]
        elif value < rule["warning"]:
            severity = 1  # warning
            text = rule["rec_warning"]
        else:
            # Good performance — only add positive rec if defined and risk is low
            if risk_level == "low" and rule["rec_good"]:
                text = rule["rec_good"]
                severity = 0
            else:
                continue

        if text:
            formatted = text.format(value=value)
            scored_recs.append((severity, rule["priority"], formatted))

    # 3. Sort: higher severity first, then by rule priority
    scored_recs.sort(key=lambda x: (-x[0], x[1]))

    # 4. Add to recommendations list (skip duplicates)
    added = 0
    for _, _, text in scored_recs:
        if added >= (max_recs - 1):  # -1 because summary already added
            break
        if text not in recommendations:
            recommendations.append(text)
            added += 1

    # 5. Extra activities tip (always add if not enough recs)
    if len(recommendations) < 3 and features.get("extra_activities", 0) == 0:
        recommendations.append(
            "Consider joining a study group or academic club. "
            "Collaborative learning often improves performance significantly."
        )

    return recommendations
