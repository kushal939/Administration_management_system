import sqlite3
DB = r'C:\Users\ACER\Downloads\ADM\ADM\Administration_management_system\backend\database.sqlite'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

# Get users schema
schema = conn.execute("PRAGMA table_info(users)").fetchall()
print("Users columns:", [c['name'] for c in schema])
print()

# Sample users by role
for role in ['student', 'admin', 'teacher']:
    users = conn.execute("SELECT * FROM users WHERE role=? LIMIT 2", (role,)).fetchall()
    print(f"{role.upper()} users:")
    for u in users:
        print(" ", dict(u))
print()

# Check login route to understand what fields are in the user session
import os
login_route = r'C:\Users\ACER\Downloads\ADM\ADM\Administration_management_system\backend\routes\auth.js'
if os.path.exists(login_route):
    with open(login_route, encoding='utf-8') as f:
        content = f.read()
    # Find where session/response is built
    idx = content.find('studentId')
    if idx > 0:
        print("auth.js studentId context:", content[max(0,idx-100):idx+200])
    idx2 = content.find('token')
    if idx2 > 0:
        print("auth.js token context:", content[max(0,idx2-50):idx2+150])

conn.close()
