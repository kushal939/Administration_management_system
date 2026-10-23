# 🔧 FIX NOTIFICATIONS - TROUBLESHOOTING GUIDE

## Problem: Notifications Not Working

If notifications are not appearing, follow these steps:

---

## ✅ SOLUTION - Step by Step

### Step 1: Stop All Running Servers
```bash
# Press Ctrl+C in both terminal windows (backend and frontend)
# Or run this command to kill all Node processes:
taskkill /F /IM node.exe
```

### Step 2: Restart Backend Server
```bash
cd backend
node server.js
```

**Expected Output:**
```
Connected to SQLite database
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
  - /api/admin/ocr/student-document ✨ NEW
  - /api/teacher
  - /api/teacher/ocr/marksheet ✨ NEW
  - /api/reports
  - /api/assignments ✨ NEW
  - /api/ocr ✨ NEW
  - /api/notifications ✨ NEW    <-- MUST SEE THIS LINE!
Server is running on port 3001
```

**IMPORTANT:** You MUST see `/api/notifications ✨ NEW` in the output!

### Step 3: Test Notifications API
Open a new terminal and run:
```bash
curl http://localhost:3001/api/notifications
```

**Expected Response:**
```json
{"success":true,"data":[...]}
```

If you get `{"success":false,"message":"Route not found"}`, the server didn't restart properly. Go back to Step 1.

### Step 4: Restart Frontend
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 5: Clear Browser Cache
1. Open browser (Chrome/Edge/Firefox)
2. Press `Ctrl + Shift + Delete`
3. Select "Cached images and files"
4. Click "Clear data"
5. Close and reopen browser

### Step 6: Test Notifications
1. Go to http://localhost:5173
2. Login as `student@school.com` / `student123`
3. Look for 🔔 bell icon in top right corner
4. You should see notifications from the test script!

---

## 🔍 Detailed Troubleshooting

### Issue 1: "Route not found" Error

**Cause:** Backend server not restarted after adding notifications route

**Solution:**
1. Stop backend server (Ctrl+C)
2. Restart: `node server.js`
3. Verify you see `/api/notifications ✨ NEW` in console

### Issue 2: Bell Icon Not Showing

**Cause:** Frontend not updated or browser cache

**Solution:**
1. Stop frontend (Ctrl+C)
2. Clear browser cache
3. Restart frontend: `npm run dev`
4. Hard refresh browser: `Ctrl + Shift + R`

### Issue 3: Notifications Empty

**Cause:** No test notifications created

**Solution:**
```bash
cd backend
node test-notifications.js
```

This creates 10 sample notifications.

### Issue 4: "Cannot GET /api/notifications"

**Cause:** Backend server not running

**Solution:**
```bash
cd backend
node server.js
```

### Issue 5: CORS Error in Browser Console

**Cause:** Frontend and backend on different ports

**Solution:**
- Backend should be on http://localhost:3001
- Frontend should be on http://localhost:5173
- CORS is already configured in server.js

### Issue 6: "User not authenticated" Error

**Cause:** User not logged in or session expired

**Solution:**
1. Logout
2. Login again
3. Check notifications

---

## 🧪 Quick Test Commands

### Test 1: Check Backend Running
```bash
curl http://localhost:3001/api/health
```
Should return: `{"status":"Server is running","timestamp":"..."}`

### Test 2: Check Notifications Route
```bash
curl http://localhost:3001/api/notifications
```
Should return: `{"success":true,"data":[...]}`

### Test 3: Check Database
```bash
cd backend
sqlite3 database.sqlite "SELECT COUNT(*) FROM notifications;"
```
Should return a number (e.g., 10)

### Test 4: Create Test Notifications
```bash
cd backend
node test-notifications.js
```
Should create 10 notifications

---

## 📋 Checklist

Before asking for help, verify:

- [ ] Backend server is running on port 3001
- [ ] Frontend is running on port 5173
- [ ] You see `/api/notifications ✨ NEW` in backend console
- [ ] `curl http://localhost:3001/api/notifications` works
- [ ] Browser cache is cleared
- [ ] You're logged in as a valid user
- [ ] Test notifications were created (`node test-notifications.js`)
- [ ] No errors in browser console (F12)
- [ ] No errors in backend console

---

## 🚀 Quick Restart Script

### Windows (Use restart-server.bat)
```bash
cd backend
restart-server.bat
```

### Manual Restart
```bash
# Terminal 1 - Backend
cd backend
taskkill /F /IM node.exe
node server.js

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

---

## 🔍 Debug Mode

### Enable Detailed Logging

Add this to `backend/routes/notifications.js` at the top:
```javascript
const DEBUG = true;

router.get('/', (req, res) => {
  if (DEBUG) console.log('📥 GET /api/notifications called');
  // ... rest of code
});
```

### Check Browser Console
1. Open browser
2. Press F12
3. Go to Console tab
4. Look for errors (red text)
5. Look for network requests to `/api/notifications`

### Check Network Tab
1. Open browser
2. Press F12
3. Go to Network tab
4. Refresh page
5. Look for request to `notifications`
6. Check if it returns 200 OK or error

---

## 💡 Common Mistakes

### Mistake 1: Not Restarting Backend
**Problem:** Added new routes but didn't restart server
**Solution:** Always restart backend after code changes

### Mistake 2: Wrong Port
**Problem:** Backend running on wrong port
**Solution:** Backend MUST be on port 3001

### Mistake 3: Not Logged In
**Problem:** Trying to access notifications without login
**Solution:** Login first, then check notifications

### Mistake 4: Old Browser Cache
**Problem:** Browser showing old version
**Solution:** Clear cache and hard refresh (Ctrl+Shift+R)

### Mistake 5: Database Not Initialized
**Problem:** Notifications table doesn't exist
**Solution:** Run `node init-notifications.js`

---

## 🎯 Expected Behavior

### When Working Correctly:

1. **Backend Console:**
   ```
   Connected to SQLite database
   Registered API routes:
   ...
   - /api/notifications ✨ NEW
   Server is running on port 3001
   ```

2. **Frontend:**
   - Bell icon 🔔 visible in top right
   - Red badge with number if unread notifications
   - Clicking bell shows dropdown with notifications

3. **Browser Console (F12):**
   - No red errors
   - Network requests to `/api/notifications` return 200 OK

4. **Database:**
   ```sql
   SELECT * FROM notifications;
   ```
   Returns rows of notifications

---

## 🆘 Still Not Working?

### Last Resort Steps:

1. **Complete Clean Restart:**
   ```bash
   # Kill all Node processes
   taskkill /F /IM node.exe
   
   # Reinitialize database
   cd backend
   node init-notifications.js
   
   # Create test notifications
   node test-notifications.js
   
   # Start backend
   node server.js
   
   # In new terminal, start frontend
   cd frontend
   npm run dev
   ```

2. **Check File Exists:**
   - `backend/routes/notifications.js` - Should exist
   - `backend/utils/notificationHelper.js` - Should exist
   - `frontend/src/components/NotificationBar.jsx` - Should exist

3. **Verify Imports:**
   - Check `backend/server.js` has `const notificationsRoutes = require('./routes/notifications');`
   - Check `backend/server.js` has `app.use('/api/notifications', notificationsRoutes);`
   - Check `frontend/src/pages/Dashboard.jsx` has `import NotificationBar from '../components/NotificationBar';`

4. **Check Database:**
   ```bash
   cd backend
   sqlite3 database.sqlite
   .tables
   ```
   Should show `notifications` table

5. **Test API Manually:**
   Open browser and go to:
   ```
   http://localhost:3001/api/notifications
   ```
   Should show JSON response

---

## 📞 Error Messages & Solutions

### Error: "Cannot find module './routes/notifications'"
**Solution:** File doesn't exist. Check `backend/routes/notifications.js` exists

### Error: "Route not found"
**Solution:** Backend not restarted. Restart backend server

### Error: "User not authenticated"
**Solution:** Login to the system first

### Error: "Failed to fetch"
**Solution:** Backend not running. Start backend server

### Error: "CORS policy"
**Solution:** Backend and frontend on wrong ports. Backend=3001, Frontend=5173

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Backend console shows `/api/notifications ✨ NEW`
2. ✅ Bell icon appears in top right of dashboard
3. ✅ Red badge shows unread count
4. ✅ Clicking bell shows dropdown with notifications
5. ✅ No errors in browser console
6. ✅ `curl http://localhost:3001/api/notifications` returns data

---

## 🎉 Final Test

1. Login as teacher: `teacher@school.com` / `teacher123`
2. Go to Attendance page
3. Mark attendance for a student
4. Logout
5. Login as student: `student@school.com` / `student123`
6. Check bell icon - should show new notification! 🎉

---

**If you've followed all steps and it's still not working, provide:**
1. Backend console output
2. Browser console errors (F12)
3. Output of `curl http://localhost:3001/api/notifications`
4. Screenshot of the issue
