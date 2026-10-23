# How to Fix PowerShell Execution Policy Error

## Problem
When running `npm start` or other npm commands in PowerShell, you might see:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## Solutions (Choose ONE)

### Solution 1: Use Command Prompt (CMD) instead of PowerShell (EASIEST)
1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to your project:
   ```
   cd C:\Users\Lenovo\OneDrive\Desktop\ADM\Administration_management_system\backend
   ```
4. Run: `npm start`

### Solution 2: Use the Batch Files (EASIEST - Double-click to run)
I've created batch files for you:
- **START_SERVER.bat** - Starts the backend server
- **START_FRONTEND.bat** - Starts the frontend server

Just double-click them!

### Solution 3: Use npm.cmd instead of npm
In PowerShell, use `npm.cmd` instead of `npm`:
```
npm.cmd start
```

### Solution 4: Change PowerShell Execution Policy (Requires Admin)
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned`
3. Type `Y` when prompted
4. Now `npm start` should work

### Solution 5: Run node directly (No npm needed)
Navigate to backend folder and run:
```
node server.js
```

## Quick Start Guide

### Start Backend Server:
```bash
cd Administration_management_system/backend
npm start
# OR
node server.js
```

### Start Frontend Server (in a new terminal):
```bash
cd Administration_management_system/frontend
npm run dev
```

The backend will run on: http://localhost:5000
The frontend will run on: http://localhost:5000
