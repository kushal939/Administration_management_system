"""diagnose.py — Full API diagnostic for Sikhya Suchak"""
import urllib.request, urllib.error, json, sys

BASE = 'http://localhost:8001'
AMS  = 'http://localhost:3001'
PASS = 0
FAIL = 0

def req(method, url, body=None):
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'} if body else {}
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as ex:
        return 0, {'error': str(ex)}

def check(name, status, resp, expected=200, keys=None):
    global PASS, FAIL
    ok = status == expected
    if ok and keys:
        ok = all(k in resp for k in keys)
    if ok:
        PASS += 1
        print(f"  PASS [{status}] {name}")
    else:
        FAIL += 1
        print(f"  FAIL [{status}] {name}")
        if 'error' in resp or 'detail' in resp:
            print(f"       Error: {resp.get('error') or resp.get('detail')}")
    return ok

print("\n=== SIKHYA SUCHAK FULL DIAGNOSTIC ===\n")

# 1. FastAPI health
s, r = req('GET', BASE + '/')
ml_ready = r.get('ml_ready', False)
check("FastAPI / health check", s, r, 200, ['status', 'ml_ready'])
print(f"       ml_ready={ml_ready}  version={r.get('version')}")

# 2. Model status
s, r = req('GET', BASE + '/model-status')
check("GET /model-status", s, r, 200, ['ml_ready'])

# 3. Model metrics
s, r = req('GET', BASE + '/model-metrics')
if s == 503:
    print(f"  WARN [503] /model-metrics — ML not ready: {r.get('detail')}")
else:
    check("GET /model-metrics", s, r, 200, ['best_model', 'models'])
    print(f"       best_model={r.get('best_model')}  models={len(r.get('models', []))}")
    print(f"       pred_count={r.get('prediction_count')}  avg_conf={r.get('average_confidence')}")

# 4. Rule-based prediction
s, r = req('POST', BASE + '/predict',
           {'marks_score': 75, 'attendance_score': 80, 'assignment_score': 70})
check("POST /predict (rule-based)", s, r, 200, ['final_score', 'risk_level'])
if s == 200:
    print(f"       score={r.get('final_score')}  risk={r.get('risk_level')}")

# 5. ML prediction
s, r = req('POST', BASE + '/predict-ml', {
    'attendance_pct': 85, 'assignment_score': 72, 'quiz_score': 65,
    'midterm_marks': 70, 'internal_marks': 68, 'lab_marks': 75,
    'previous_gpa': 3.1, 'study_hours': 5.0, 'extra_activities': 1
})
if s == 503:
    print(f"  WARN [503] /predict-ml — {r.get('detail')}")
else:
    check("POST /predict-ml", s, r, 200, ['predicted_grade', 'risk_level', 'confidence_score'])
    if s == 200:
        print(f"       grade={r.get('predicted_grade')}  risk={r.get('risk_level')}  conf={r.get('confidence_score')}")
        print(f"       pred_id={r.get('prediction_id')}")

# 6. ML prediction HIGH RISK case
s, r = req('POST', BASE + '/predict-ml', {
    'attendance_pct': 25, 'assignment_score': 15, 'quiz_score': 20,
    'midterm_marks': 30, 'internal_marks': 25, 'lab_marks': 20,
    'previous_gpa': 0.8, 'study_hours': 1.0, 'extra_activities': 0
})
if s == 200:
    expected_high = r.get('risk_level') == 'high'
    status_str = "PASS" if expected_high else "WARN"
    print(f"  {status_str} [{s}] POST /predict-ml HIGH RISK case: grade={r.get('predicted_grade')} risk={r.get('risk_level')}")

# 7. Students list
s, r = req('GET', BASE + '/students/all')
students = []
if s == 502:
    print(f"  WARN [502] /students/all — AMS unreachable: {r.get('detail')}")
elif s == 200:
    students = r.get('students') or r.get('data') or []
    check("GET /students/all", s, r, 200)
    print(f"       count={r.get('count')}  students_in_response={len(students)}")

# 8. Individual student + per-student prediction
if students:
    first = students[0]
    sid = first.get('student_id') or first.get('studentId') or str(first.get('id', ''))
    sname = first.get('student_name') or first.get('name', 'Unknown')
    print(f"\n  Testing with student: {sname} (ID: {sid})")

    s, r = req('GET', BASE + '/student/' + str(sid))
    if s == 200:
        check(f"GET /student/{sid}", s, r, 200)
        print(f"       att={r.get('attendance_pct')}  midterm={r.get('midterm_marks')}")
    else:
        print(f"  FAIL [{s}] GET /student/{sid}: {r.get('detail')}")

    s, r = req('GET', BASE + '/student/' + str(sid) + '/predict-ml')
    if s == 200:
        check(f"GET /student/{sid}/predict-ml", s, r, 200)
        print(f"       grade={r.get('predicted_grade')}  risk={r.get('risk_level')}  conf={r.get('confidence_score')}")
    elif s == 503:
        print(f"  WARN [503] /student/predict-ml — ML not ready")
    else:
        print(f"  FAIL [{s}] /student/{sid}/predict-ml: {r.get('detail')}")

# 9. Prediction history
s, r = req('GET', BASE + '/predictions/history?limit=10')
check("GET /predictions/history", s, r, 200, ['total', 'predictions'])
if s == 200:
    print(f"       total stored={r.get('total')}  returned={len(r.get('predictions', []))}")

# 10. Analytics
print("\n  Testing /analytics (may be slow — runs ML on up to 50 students)...")
s, r = req('GET', BASE + '/analytics')
if s == 200:
    check("GET /analytics", s, r, 200, ['risk_distribution', 'averages'])
    dist = r.get('risk_distribution', {})
    avgs = r.get('averages', {})
    print(f"       low={dist.get('low',{}).get('count')}  medium={dist.get('medium',{}).get('count')}  high={dist.get('high',{}).get('count')}")
    print(f"       avg_score={avgs.get('final_score')}  avg_att={avgs.get('attendance_pct')}")
elif s == 503:
    print(f"  WARN [503] /analytics — ML not ready: {r.get('detail')}")
elif s == 502:
    print(f"  WARN [502] /analytics — AMS unreachable: {r.get('detail')}")
else:
    print(f"  FAIL [{s}] /analytics: {r.get('detail')}")

# 11. AMS direct tests
print("\n  Testing AMS backend directly...")
s, r = req('GET', AMS + '/api/students')
ams_students = r.get('data', [])
check("AMS GET /api/students", s, r, 200)
print(f"       AMS students count={len(ams_students)}")

if ams_students:
    db_id = ams_students[0].get('id')
    s, r = req('GET', AMS + f'/api/marks?studentId={db_id}')
    print(f"  [{'OK' if s==200 else 'FAIL'}] AMS GET /api/marks: count={len(r.get('data',[]))}")
    stu0_sid = ams_students[0].get('studentId', db_id)
    s, r = req('GET', AMS + f'/api/attendance?studentId={stu0_sid}')
    print(f"  [{'OK' if s==200 else 'FAIL'}] AMS GET /api/attendance: count={len(r.get('data',[]))}")

print(f"\n=== RESULTS: {PASS} PASS | {FAIL} FAIL ===\n")
