"""
seed_marks.py — Seeds realistic marks into the AMS database.
Each student gets marks for 4 courses representing different performance levels.
Run once: python seed_marks.py
"""
import sqlite3
import random
from datetime import datetime

DB = r'C:\Users\ACER\Downloads\ADM\ADM\Administration_management_system\backend\database.sqlite'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

# Check if marks already exist
existing = conn.execute('SELECT COUNT(*) FROM marks').fetchone()[0]
if existing > 0:
    print(f'Marks already seeded ({existing} records). Skipping.')
    conn.close()
    exit(0)

# Get all students
students = conn.execute('SELECT id, studentId, name, department FROM students').fetchall()
print(f'Seeding marks for {len(students)} students...')

courses_by_dept = {
    'Computer Science':       ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Web Development'],
    'Business Administration': ['Accounting', 'Marketing', 'Economics', 'Management', 'Finance'],
    'Information Technology': ['Networking', 'Software Engineering', 'Cybersecurity', 'Cloud Computing', 'AI Basics'],
    'Electronics':            ['Digital Circuits', 'Microprocessors', 'Signal Processing', 'VLSI', 'Embedded Systems'],
}
default_courses = ['Course A', 'Course B', 'Course C', 'Course D', 'Course E']

# Performance profiles — gives realistic distribution
def get_marks_profile(student_id: str):
    """Returns (min_marks, max_marks) based on student ID hash for consistent results."""
    seed = sum(ord(c) for c in student_id)
    random.seed(seed)
    profile = random.choices(
        ['high', 'medium', 'low'],
        weights=[35, 45, 20]
    )[0]
    if profile == 'high':
        return 75, 98
    elif profile == 'medium':
        return 55, 80
    else:
        return 30, 60

now = datetime.now().isoformat()
records = []

for student in students:
    sid        = student['studentId']
    db_id      = student['id']
    dept       = student['department'] or 'Computer Science'
    courses    = courses_by_dept.get(dept, default_courses)
    min_m, max_m = get_marks_profile(sid)

    for course in courses[:4]:  # 4 marks per student
        # Vary marks slightly per course
        course_seed = sum(ord(c) for c in sid + course)
        random.seed(course_seed)
        marks = random.randint(min_m, max_m)
        records.append((sid, course, marks, now))

conn.executemany(
    'INSERT INTO marks (studentId, course, marks, created_at) VALUES (?,?,?,?)',
    records
)
conn.commit()

# Verify
count = conn.execute('SELECT COUNT(*) FROM marks').fetchone()[0]
print(f'Seeded {count} marks records ({len(students)} students x ~4 courses)')

# Show distribution sample
dist = conn.execute('''
    SELECT
        CASE WHEN marks >= 75 THEN "High (>=75)"
             WHEN marks >= 55 THEN "Medium (55-74)"
             ELSE "Low (<55)" END as category,
        COUNT(*) as cnt
    FROM marks
    GROUP BY category
''').fetchall()
print('Distribution:')
for row in dist:
    print(f'  {row[0]}: {row[1]} records')

conn.close()
print('Done! Restart FastAPI to use new data.')
