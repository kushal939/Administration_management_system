@echo off
echo ========================================
echo   Database Seeding Script
echo ========================================
echo.
echo This will populate the database with:
echo   - 5 Departments
echo   - 15 Courses
echo   - 10 Batches
echo   - 20 Students
echo   - Random Marks
echo   - Attendance Records
echo   - Notices
echo   - Assignments
echo   - Fee Records
echo.
echo WARNING: This will add data to your database!
echo.
pause

echo.
echo Starting data seeding...
echo.

node seed-complete-data.js

echo.
echo ========================================
echo   Seeding Complete!
echo ========================================
echo.
pause
