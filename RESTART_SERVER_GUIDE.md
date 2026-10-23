# Server Restart Guide - Fix "Route Not Found" Error

## Problem
The assignments route returns 404 "Route not found" because the server was started before the assignments route was added.

## Solution: Restart the Backend Server

### Step 1: Stop the Current Server

**Option A - If running in terminal:**
1. Go to the terminal where the server is running
2. Press `Ctrl + C` to stop the server
3. Wait for "Database closed" message

**Option B - If running in background:**
1. Open Task Manager (Ctrl + Shift + Esc)
2. Find "Node.js" processes
3. End all Node.js tasks
4. Or run in PowerShell: `taskkill /F /IM node.exe`

### Step 2: Restart the Backend Server

```bash
cd backend
npm start
```

**Expected Output:**
```
Connected to SQLite database
Database already contains data
Server is running on port 3001
```

### Step 3: Verify the Assignments Route

Run the test script:
```bash
node test-api-endpoint.js
```

**Expected Output:**
```
Status Code: 200
Status Message: OK
✅ Assignments API endpoint is working!
Found X assignments
```

### Step 4: Restart the Frontend (if needed)

```bash
cd frontend
npm run dev
```

## Quick Verification Checklist

- [ ] Backend server stopped completely
- [ ] Backend server restarted with `npm start`
- [ ] See "Server is running on port 3001" message
- [ ] Test API endpoint returns 200 status
- [ ] Frontend can access assignments page
- [ ] No console errors in browser

## Testing the Fix

### 1. Test Backend API Directly

Open browser and go to:
```
http://localhost:3001/api/assignments
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### 2. Test in Frontend

1. Login as teacher: `teacher@school.com` / `teacher123`
2. Click "Assignments" in sidebar
3. Should see assignments page (not "Failed to fetch")
4. Click "+ Create Assignment" button
5. Fill form and submit
6. Should see success message

## Common Issues

### Issue 1: Port Already in Use
**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in server.js
const PORT = process.env.PORT || 3002;
```

### Issue 2: Module Not Found
**Error:** `Cannot find module './routes/assignments'`

**Solution:**
1. Verify file exists: `backend/routes/assignments.js`
2. Check file permissions
3. Restart server

### Issue 3: Database Locked
**Error:** `SQLITE_BUSY: database is locked`

**Solution:**
1. Close all database connections
2. Stop all node processes
3. Delete `database.sqlite-journal` if exists
4. Restart server

### Issue 4: CORS Error in Browser
**Error:** `Access to fetch at 'http://localhost:3001/api/assignments' from origin 'http://localhost:5173' has been blocked by CORS`

**Solution:**
- Server already has CORS enabled
- Restart backend server
- Clear browser cache

## Verification Commands

### Check if server is running:
```bash
curl http://localhost:3001/api/health
```

### Check assignments endpoint:
```bash
curl http://localhost:3001/api/assignments
```

### Check all routes:
```bash
# In backend directory
node -e "const app = require('./server'); console.log(app._router.stack.filter(r => r.route).map(r => r.route.path));"
```

## After Restart

Once the server is restarted:

1. ✅ Assignments route will be available
2. ✅ Teachers can create assignments
3. ✅ Students can view assignments
4. ✅ Admin/Principal can view all assignments

## Still Having Issues?

If the problem persists after restart:

1. **Check server logs** - Look for error messages when server starts
2. **Check browser console** - Look for network errors (F12 → Console)
3. **Verify database** - Run `node test-assignments.js`
4. **Check file exists** - Verify `backend/routes/assignments.js` exists
5. **Check imports** - Verify `server.js` has `const assignmentsRoutes = require('./routes/assignments');`

## Manual Verification

### Check server.js has the route:
```bash
cd backend
grep -n "assignments" server.js
```

**Should show:**
```
Line 26: const assignmentsRoutes = require('./routes/assignments');
Line 51: app.use('/api/assignments', assignmentsRoutes);
```

### Check route file exists:
```bash
ls -la routes/assignments.js
```

**Should show:**
```
-rw-r--r-- 1 user user 5234 Feb 24 10:00 routes/assignments.js
```

## Success Indicators

After successful restart, you should see:

✅ Server starts without errors
✅ "Server is running on port 3001" message
✅ No "Route not found" errors
✅ Assignments page loads in frontend
✅ Can create assignments as teacher
✅ Can view assignments as student

---

**Important:** Always restart the backend server after adding new routes or modifying route files!
