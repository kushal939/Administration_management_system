# -*- coding: utf-8 -*-
"""
test_api.py -- Sikhya Suchak Complete API Test Suite (Step 5)
Run: python test_api.py
     python test_api.py --verbose
"""
import sys, json, time, urllib.request, urllib.error

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE    = "http://localhost:8001"
VERBOSE = "--verbose" in sys.argv
PASS = FAIL = SKIP = 0

ML_GOOD = {
    "attendance_pct": 85, "assignment_score": 72, "quiz_score": 65,
    "midterm_marks": 70, "internal_marks": 68, "lab_marks": 75,
    "previous_gpa": 3.1, "study_hours": 5.0, "extra_activities": 1
}
ML_BAD = {
    "attendance_pct": 20, "assignment_score": 15, "quiz_score": 10,
    "midterm_marks": 25, "internal_marks": 20, "lab_marks": 10,
    "previous_gpa": 0.5, "study_hours": 0.5, "extra_activities": 0
}

def req(method, path, body=None):
    data    = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:    return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}

def chk(name, status, resp, expected=200, keys=None, skip=False, why=""):
    global PASS, FAIL, SKIP
    if skip:
        SKIP += 1
        print(f"  SKIP -- {name}  [{why}]")
        return False
    ok = status == expected
    if ok and keys:
        ok = all(k in resp for k in keys)
    if ok:
        PASS += 1
        print(f"  PASS [{status}] {name}")
    else:
        FAIL += 1
        print(f"  FAIL [{status}] {name}")
        missing = [k for k in (keys or []) if k not in resp]
        if missing: print(f"       Missing keys: {missing}")
        if "detail" in resp or "error" in resp:
            print(f"       Error: {resp.get('detail') or resp.get('error')}")
        if VERBOSE: print(f"       Body: {json.dumps(resp)[:300]}")
    return ok

# ── Startup ────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  SIKHYA SUCHAK -- API TEST SUITE  v3.0.0")
print("="*60)
t0 = time.time()

s, r = req("GET", "/")
if s == 0:
    print(f"\n  FATAL -- Cannot connect to {BASE}")
    print("  Run: python -m uvicorn main:app --port 8001")
    sys.exit(1)

ml_ready = r.get("ml_ready", False)
print(f"\n  API:  ONLINE   version={r.get('version','?')}")
print(f"  ML:   {'READY' if ml_ready else 'NOT READY  (run: python -m ml.train)'}")

s_ams, _ = req("GET", "/students/all")
ams_ok = s_ams not in (0, 502)
print(f"  AMS:  {'CONNECTED  (port 3001)' if ams_ok else 'OFFLINE  (start Node backend)'}")
print()

# ── 1. System ──────────────────────────────────────────────────────────────────
print("[1] System Endpoints")
chk("GET /  health check",  *req("GET", "/"),              keys=["status","ml_ready"])
chk("GET /model-status",    *req("GET", "/model-status"),  keys=["ml_ready","message"])

# ── 2. Model Metrics ──────────────────────────────────────────────────────────
print("\n[2] Model Metrics")
s, r = req("GET", "/model-metrics")
if s == 503:
    chk("GET /model-metrics (503 when untrained)", s, r, 503)
else:
    chk("GET /model-metrics -- shape",      s, r, 200, ["best_model","models","feature_names","prediction_count"])
    if r.get("models"):
        m   = r["models"][0]
        has = all(k in m for k in ["name","accuracy","f1"])
        chk("model-metrics -- each model has acc+f1", 200, {"ok": has}, keys=["ok"])
    print(f"  Best Model: {r.get('best_model')}  Models: {len(r.get('models',[]))}")
    print(f"  Predictions stored: {r.get('prediction_count')}  Avg confidence: {r.get('average_confidence')}")

# ── 3. Rule-based ────────────────────────────────────────────────────────────
print("\n[3] Rule-Based Prediction")
chk("POST /predict valid", *req("POST","/predict",{"marks_score":75,"attendance_score":80,"assignment_score":70}),
    keys=["final_score","risk_level","recommendations"])
chk("POST /predict marks>100 (422)",   *req("POST","/predict",{"marks_score":150,"attendance_score":80,"assignment_score":70}), expected=422)
chk("POST /predict missing field (422)",*req("POST","/predict",{"marks_score":75,"attendance_score":80}), expected=422)

# ── 4. ML Prediction ─────────────────────────────────────────────────────────
print("\n[4] ML Prediction")
s503 = not ml_ready

s, r = req("POST", "/predict-ml", ML_GOOD)
chk("POST /predict-ml good student", s, r,
    expected=503 if s503 else 200,
    keys=[] if s503 else ["predicted_grade","risk_level","confidence_score","probability","recommendations"],
    skip=s503, why="ML not trained")
if not s503 and s == 200:
    cs = r.get("confidence_score", -1)
    chk(f"confidence_score in [0,1] ({cs:.3f})", 200, {"ok": 0.0 <= cs <= 1.0}, keys=["ok"])
    probs = r.get("probability", {})
    chk("probability has low/medium/high", 200, {"ok": all(k in probs for k in ["low","medium","high"])}, keys=["ok"])
    print(f"  grade={r.get('predicted_grade')}  risk={r.get('risk_level')}  conf={cs:.3f}")
    print(f"  pred_id={r.get('prediction_id')}")

s, r = req("POST", "/predict-ml", ML_BAD)
chk("POST /predict-ml failing student", s, r,
    expected=503 if s503 else 200,
    skip=s503, why="ML not trained")
if not s503 and s == 200:
    chk("High-risk student -> risk=high", 200,
        {"ok": r.get("risk_level") == "high"}, keys=["ok"])

chk("POST /predict-ml extra_activities=5 (422)",
    *req("POST","/predict-ml",{**ML_GOOD,"extra_activities":5}), expected=422)

chk("POST /predict-ml with student context",
    *req("POST","/predict-ml",{**ML_GOOD,"student_id":"TEST001","student_name":"Test","department":"CS"}),
    expected=503 if s503 else 200, skip=s503, why="ML not trained")

# ── 5. Students ───────────────────────────────────────────────────────────────
print("\n[5] Student Endpoints")
s, r = req("GET", "/students/all")
chk("GET /students/all", s, r,
    expected=502 if not ams_ok else 200,
    keys=[] if not ams_ok else ["success","count","students"],
    skip=not ams_ok, why="AMS not running")

if ams_ok and s == 200:
    students = r.get("students", [])
    print(f"  Total students: {len(students)}")
    if students:
        has_att = students[0].get("attendance_pct") is not None
        chk("students/all includes attendance_pct", 200, {"ok": has_att}, keys=["ok"])

    if students:
        sid = students[0].get("student_id") or students[0].get("studentId", "")
        s2, r2 = req("GET", f"/student/{sid}")
        chk(f"GET /student/{sid}", s2, r2, 200)
        if s2 == 200:
            print(f"  att={r2.get('attendance_pct')}  midterm={r2.get('midterm_marks')}")

        if not s503:
            s3, r3 = req("GET", f"/student/{sid}/predict-ml")
            chk(f"GET /student/{sid}/predict-ml", s3, r3, 200)
            if s3 == 200:
                print(f"  grade={r3.get('predicted_grade')}  risk={r3.get('risk_level')}  conf={r3.get('confidence_score')}")

chk("GET /student/NOTEXIST 404", *req("GET", "/student/NOTEXIST_9999"),
    expected=404 if ams_ok else 502, skip=not ams_ok, why="AMS not running")

# ── 6. Prediction History ─────────────────────────────────────────────────────
print("\n[6] Prediction History")
s, r = req("GET", "/predictions/history")
chk("GET /predictions/history", s, r, 200, ["total","predictions","limit","offset"])
if s == 200:
    print(f"  Total stored: {r.get('total')}  Returned: {len(r.get('predictions',[]))}")
    if r.get("predictions"):
        first = r["predictions"][0]
        chk("history item has required fields", 200,
            {"ok": all(k in first for k in ["prediction_id","student_id","predicted_grade","risk_level"])},
            keys=["ok"])

chk("GET /predictions/history?limit=3", *req("GET","/predictions/history?limit=3"), keys=["total","predictions"])
chk("GET /predictions/history?risk_level=high", *req("GET","/predictions/history?risk_level=high"), keys=["total"])
chk("GET /predictions/history/{id}", *req("GET","/predictions/history/manual"), keys=["student_id","count"])
chk("DELETE /predictions/history missing confirm (400)", *req("DELETE","/predictions/history"), expected=400)

# ── 7. Analytics ─────────────────────────────────────────────────────────────
print("\n[7] Analytics")
s, r = req("GET", "/analytics")
chk("GET /analytics", s, r,
    expected=503 if not ml_ready else (502 if not ams_ok else 200),
    skip=not ml_ready or not ams_ok,
    why="ML not trained" if not ml_ready else "AMS offline")
if s == 200:
    dist = r.get("risk_distribution", {})
    avgs = r.get("averages", {})
    chk("analytics has risk_distribution+averages", 200,
        {"ok": "risk_distribution" in r and "averages" in r}, keys=["ok"])
    print(f"  low={dist.get('low',{}).get('count')}  medium={dist.get('medium',{}).get('count')}  high={dist.get('high',{}).get('count')}")
    print(f"  avg_score={avgs.get('final_score')}  avg_att={avgs.get('attendance_pct')}")

# ── Summary ───────────────────────────────────────────────────────────────────
elapsed = round(time.time() - t0, 1)
total   = PASS + FAIL + SKIP
print("\n" + "="*60)
print(f"  RESULTS: {PASS} passed | {FAIL} failed | {SKIP} skipped | {elapsed}s")
if FAIL == 0:
    print("  ALL TESTS PASSED")
else:
    print(f"  {FAIL} TESTS FAILED")
print("="*60 + "\n")
sys.exit(0 if FAIL == 0 else 1)
