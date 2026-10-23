/**
 * api.js — Sikhya Suchak API Client
 * Handles all communication with the FastAPI backend on port 8001.
 * Includes error handling, loading state helpers, and retry logic.
 */

const BASE = 'http://localhost:8001';

// ── Generic fetch helper with retry + backoff ─────────────────────────────────
async function apiFetch(path, options = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // exponential backoff
    }
  }
}

// ── System ────────────────────────────────────────────────────────────────────

/** Check if the API is running and whether the ML model is loaded */
export async function fetchHealthCheck() {
  return apiFetch('/');
}

/** Returns { ml_ready: bool, message: string } */
export async function fetchModelStatus() {
  return apiFetch('/model-status');
}

/** Returns all model metrics: accuracy, F1, confusion matrix data etc. */
export async function fetchModelMetrics() {
  return apiFetch('/model-metrics');
}

// ── Predictions ───────────────────────────────────────────────────────────────

/**
 * Rule-based prediction (original, always available)
 * @param {{ marks_score, attendance_score, assignment_score }} data
 */
export async function fetchRuleBasedPrediction(data) {
  return apiFetch('/predict', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Legacy alias kept for backwards compat with old components
 */
export async function fetchPrediction(data) {
  return fetchRuleBasedPrediction(data);
}

/**
 * ML prediction (requires trained model)
 * @param {{
 *   attendance_pct, assignment_score, quiz_score, midterm_marks,
 *   internal_marks, lab_marks, previous_gpa, study_hours, extra_activities
 * }} data
 */
export async function fetchMLPrediction(data) {
  return apiFetch('/predict-ml', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Students ──────────────────────────────────────────────────────────────────

/** Fetch all students from AMS via the Python bridge */
export async function fetchAllStudents() {
  return apiFetch('/students/all');
}

/**
 * Fetch one student's aggregated academic data from AMS
 * @param {string|number} studentId
 */
export async function fetchStudentData(studentId) {
  return apiFetch(`/student/${encodeURIComponent(studentId)}`);
}

/**
 * Fetch ML prediction for one student using their real AMS data
 * @param {string|number} studentId
 * @param {{ previous_gpa?: number, study_hours?: number, extra_activities?: number }} extra
 */
export async function fetchStudentPrediction(studentId, extra = {}) {
  const params = new URLSearchParams();
  if (extra.previous_gpa     !== undefined) params.set('previous_gpa',     extra.previous_gpa);
  if (extra.study_hours      !== undefined) params.set('study_hours',      extra.study_hours);
  if (extra.extra_activities !== undefined) params.set('extra_activities', extra.extra_activities);
  const query = params.toString() ? `?${params}` : '';
  return apiFetch(`/student/${encodeURIComponent(studentId)}/predict-ml${query}`);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/** Returns system-wide analytics: risk distribution, dept breakdown, averages */
export async function fetchAnalytics() {
  return apiFetch('/analytics');
}

// ── Prediction History ────────────────────────────────────────────────────────

/**
 * Returns paginated prediction history from SQLite backend.
 * @param {{ limit?, offset?, risk_level?, date_from?, date_to? }} opts
 */
export async function fetchPredictionHistory(opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit      !== undefined) params.set('limit',      opts.limit);
  if (opts.offset     !== undefined) params.set('offset',     opts.offset);
  if (opts.risk_level)               params.set('risk_level', opts.risk_level);
  if (opts.date_from)                params.set('date_from',  opts.date_from);
  if (opts.date_to)                  params.set('date_to',    opts.date_to);
  const query = params.toString() ? `?${params}` : '';
  return apiFetch(`/predictions/history${query}`);
}

/**
 * Returns all predictions for a specific student from the backend DB.
 * @param {string|number} studentId
 */
export async function fetchStudentHistoryFromDB(studentId) {
  return apiFetch(`/predictions/history/${encodeURIComponent(studentId)}`);
}

// ── useApi hook helper ────────────────────────────────────────────────────────
/**
 * Returns { data, loading, error, refetch } state for any apiFetch call.
 * Usage: const { data, loading, error } = useApi(fetchAnalytics);
 * (This is a plain async-friendly helper — not a React hook; use in useEffect)
 */
export function createApiState() {
  return { data: null, loading: false, error: null };
}
