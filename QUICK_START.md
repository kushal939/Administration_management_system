# QUICK START GUIDE - Fix PowerShell Error

## ❌ Problem
PowerShell is blocking npm commands with error:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded
```

## ✅ SOLUTION: Use `npm.cmd` instead of `npm`

### Start Backend Server:
1. Open PowerShell
2. Navigate to backend folder:
   ```
   cd Administration_management_system\backend
   ```
3. Use `npm.cmd` instead of `npm`:
   ```
   npm.cmd start
   ```

### Start Frontend Server (in a NEW PowerShell window):
1. Open a NEW PowerShell window
2. Navigate to frontend folder:
   ```
   cd Administration_management_system\frontend
   ```
3. Use `npm.cmd` instead of `npm`:
   ```
   npm.cmd run dev
   ```

## OR Use Batch Files (Easiest!)

Just double-click these files:
- **START_SERVER.bat** - Starts backend (port 5000)
- **START_FRONTEND.bat** - Starts frontend (port 3000)

## OR Use Command Prompt (Not PowerShell)

Press `Win + R`, type `cmd`, press Enter, then:
```
cd Administration_management_system\backend
npm start
```

---

**The key is: Use `npm.cmd` in PowerShell, OR use Command Prompt, OR use the batch files!**
