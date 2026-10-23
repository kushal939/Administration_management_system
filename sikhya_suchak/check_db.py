import sqlite3, json, random

DB = r'C:\Users\ACER\Downloads\ADM\ADM\Administration_management_system\backend\database.sqlite'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('Tables:', [t['name'] for t in tables])

# Check marks
try:
    schema = conn.execute("PRAGMA table_info(marks)").fetchall()
    print('Marks columns:', [c['name'] for c in schema])
    count = conn.execute('SELECT COUNT(*) FROM marks').fetchone()[0]
    print('Marks count:', count)
    if count > 0:
        sample = conn.execute('SELECT * FROM marks LIMIT 2').fetchall()
        for s in sample:
            print('  Mark:', dict(s))
except Exception as e:
    print('Marks error:', e)

# Check attendance
try:
    schema = conn.execute("PRAGMA table_info(attendance)").fetchall()
    print('Attendance columns:', [c['name'] for c in schema])
    count = conn.execute('SELECT COUNT(*) FROM attendance').fetchone()[0]
    print('Attendance count:', count)
    if count > 0:
        sample = conn.execute('SELECT * FROM attendance LIMIT 2').fetchall()
        for s in sample:
            print('  Att:', dict(s))
except Exception as e:
    print('Att error:', e)

# Students
students = conn.execute('SELECT id, studentId, name, department FROM students LIMIT 10').fetchall()
print(f'\nStudents ({len(students)} shown):')
for s in students:
    print(' ', dict(s))

conn.close()
