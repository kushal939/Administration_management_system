"""check_marks.py — Verify marks data and AMS API response"""
import sqlite3, urllib.request, json

DB = r'C:\Users\ACER\Downloads\ADM\ADM\Administration_management_system\backend\database.sqlite'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

# 1. Check marks in DB
marks = conn.execute('SELECT * FROM marks LIMIT 5').fetchall()
print(f'Marks in DB: {conn.execute("SELECT COUNT(*) FROM marks").fetchone()[0]}')
for m in marks:
    print('  DB mark:', dict(m))

# 2. Check what studentId format is in marks vs students
students = conn.execute('SELECT id, studentId FROM students LIMIT 3').fetchall()
for s in students:
    sid_str = s['studentId']
    db_id   = s['id']
    # Check marks by both string and int studentId
    by_str = conn.execute('SELECT COUNT(*) FROM marks WHERE studentId=?', (sid_str,)).fetchone()[0]
    by_int = conn.execute('SELECT COUNT(*) FROM marks WHERE studentId=?', (str(db_id),)).fetchone()[0]
    print(f'  Student {sid_str} (id={db_id}): marks by studentId={by_str}, by id={by_int}')

conn.close()

# 3. Check AMS API
print('\nAMS API test:')
AMS = 'http://localhost:3001'

# Try with string studentId
try:
    r = urllib.request.urlopen(f'{AMS}/api/marks?studentId=STUCS24001', timeout=5)
    d = json.loads(r.read())
    print(f'  /api/marks?studentId=STUCS24001: count={len(d.get("data",[]))}')
except Exception as e:
    print(f'  Error: {e}')

# Try with numeric db id
try:
    r = urllib.request.urlopen(f'{AMS}/api/marks?studentId=1', timeout=5)
    d = json.loads(r.read())
    print(f'  /api/marks?studentId=1 (db id): count={len(d.get("data",[]))}')
except Exception as e:
    print(f'  Error: {e}')

# 4. Check how AMS marks route queries the DB
try:
    r = urllib.request.urlopen(f'{AMS}/api/marks', timeout=5)
    d = json.loads(r.read())
    total = len(d.get('data', []))
    print(f'  /api/marks (all): count={total}')
    if d.get('data'):
        print('  Sample:', json.dumps(d['data'][0], indent=2))
except Exception as e:
    print(f'  Error all marks: {e}')
