# Fix: Assignments Route 404 Error

## The Problem

You're seeing these errors:
- ❌ "Route not found" when accessing `/api/assignments`
- ❌ "Failed to fetch assignments" in the frontend
- ❌ Cannot create assignments

## Root Cause

The backend server was started **before** the assignments route was added. Node.js doesn't automatically reload code changes - you must restart the server.

## The Solution (3 Steps)

### Step 1: Stop the Backend Server

**Find and stop the running server:**

**Method 1 - Terminal:**
- Go to the terminal running the backend
- Press `Ctrl + C`
- Wait for "Database closed" message

**Method 2 - Task Manager:**
- Press `Ctrl + Shift + Esc`
- Find "Node.js: Server-side JavaScript"
- Right-click → End Task

**Method 3 - PowerShell Command:**
```powershell
taskkill /F /IM node.exe
```

### Step 2: Start the Backend Server

**Option A - Using the new startup script (Recommended):**
```bash
cd backend
node start-server.js
```

**Option B - Using npm:**
```bash
cd backend
npm start
```

**What you should see:**
```
✅ assignments.js route file found
✅ server.js imports assignments route
✅ server.js registers /api/assignments route
✅ database.sqlite file found
✅ All pre-flight checks passed!

Starting server...
══════════════════════════════════════════════════
Connected to SQLite database
Database already contains data
Registered API routes:
  - /api/auth
  - /api/students
  - /api/courses
  - /api/departments
  - /api/attendance
  - /api/marks
  - /api/notices
  - /api/analytics
  - /api/teacher-courses
  - /api/fees
  - /api/admin
  - /api/teacher
  - /api/reports
  - /api/assignments ✨ NEW
Server is running on port 3001
```

### Step 3: Verify It's Working

**Test 1 - API Endpoint:**
```bash
cd backend
node test-api-endpoint.js
```

**Expected:**
```
Status Code: 200
✅ Assignments API endpoint is working!
```

**Test 2 - Browser:**
Open: `http://localhost:3001/api/assignments`

**Expected:**
```json
{
  "success": true,
  "data": [...]
}
```

**Test 3 - Frontend:**
1. Make sure frontend is running: `cd frontend && npm run dev`
2. Login as teacher: `teacher@school.com` / `teacher123`
3. Click "Assignments" in sidebar
4. Should load without errors
5. Click "+ Create Assignment"
6. Fill form and submit
7. Should see "Assignment created successfully!"

## Still Not Working?

### Check 1: Verify Files Exist

```bash
cd backend
dir routes\assignments.js
```

Should show the file. If not, the file is missing.

### Check 2: Verify Server.js Has Imports

```bash
cd backend
findstr "assignments" server.js
```

Should show:
```
const assignmentsRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentsRoutes);
```

### Check 3: Check for Errors

Look at the terminal where the server is running. Any red error messages?

Common errors:
- `Cannot find module './routes/assignments'` → File is missing or path is wrong
- `EADDRINUSE` → Port 3001 is already in use
- `SQLITE_BUSY` → Database is locked

### Check 4: Port Conflict

If port 3001 is in use:

```bash
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill that process
taskkill /PID <PID_NUMBER> /F
```

### Check 5: Clear Everything and Restart

```bash
# Stop all node processes
taskkill /F /IM node.exe

# Go to backend
cd backend

# Start fresh
node start-server.js
```

## Frontend Issues

If backend works but frontend still shows errors:

### Issue: CORS Error
**Error in browser console:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**
- Backend already has CORS enabled
- Restart backend server
- Hard refresh browser (Ctrl + Shift + R)

### Issue: Wrong API URL
**Error:** `Failed to fetch`

**Check:** Open `frontend/src/pages/Assignments.jsx`
- API calls should use `/api/assignments` (relative URL)
- NOT `http://localhost:3001/api/assignments` (absolute URL)

**Correct:**
```javascript
const response = await fetch('/api/assignments');
```

### Issue: Frontend Not Running
**Solution:**
```bash
cd frontend
npm run dev
```

Should see:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

## Complete Reset (Nuclear Option)

If nothing works, do a complete reset:

```bash
# 1. Stop everything
taskkill /F /IM node.exe

# 2. Go to backend
cd backend

# 3. Delete database (will be recreated)
del database.sqlite
del database.sqlite-journal

# 4. Reinstall dependencies (if needed)
npm install

# 5. Initialize database
node init-assignments-table.js

# 6. Setup test data
node setup-test-data.js

# 7. Start server
node start-server.js

# 8. In new terminal, start frontend
cd frontend
npm run dev
```

## Verification Checklist

After restart, verify:

- [ ] Backend terminal shows "Server is running on port 3001"
- [ ] Backend terminal shows "- /api/assignments ✨ NEW"
- [ ] `http://localhost:3001/api/assignments` returns JSON (not 404)
- [ ] Frontend loads without console errors
- [ ] Can navigate to Assignments page
- [ ] Can see "+ Create Assignment" button (as teacher)
- [ ] Can submit assignment form
- [ ] See success message after submission

## Success!

When everything works:
- ✅ Backend shows assignments route registered
- ✅ API endpoint returns 200 status
- ✅ Frontend loads assignments page
- ✅ Can create assignments as teacher
- ✅ Can view assignments as student
- ✅ No console errors

## Need More Help?

Run diagnostics:
```bash
cd backend
node test-assignments.js
node test-api-endpoint.js
```

Check logs:
- Backend terminal output
- Browser console (F12 → Console tab)
- Browser network tab (F12 → Network tab)

---

**Remember:** Always restart the backend server after modifying route files!

**Quick Restart Command:**
```bash
# Stop server (Ctrl+C in terminal)
# Then:
cd backend && node start-server.js
```
