# Attendance Search Enhancement

## Update Summary
Enhanced admin attendance search to filter by Student Name, Department, and Course instead of Student ID. All filters are optional and work independently.

## Changes Made

### Frontend (Attendance.jsx)

**Filter Fields Updated:**
1. **Student Name** - Text input to search by student name (partial match)
2. **Department** - Dropdown to select department (shows all departments)
3. **Course Name** - Text input to search by course name (partial match)

**Table Columns Updated:**
- Student Name (new, first column)
- Student ID
- Department (new)
- Course
- Date
- Status
- Recorded At

### Backend (attendance.js)

**Enhanced GET /api/attendance endpoint:**
- Added support for `studentName` query parameter
- Added support for `department` query parameter
- Uses SQL JOIN with students table to get student name and department
- All filters support partial matching (LIKE) except department (exact match)
- Filters work independently - admin can search by:
  - Name only
  - Department only
  - Course only
  - Any combination of the three

**SQL Query:**
```sql
SELECT a.*, s.name as studentName, s.department 
FROM attendance a
LEFT JOIN students s ON a.studentId = s.studentId
WHERE [filters applied dynamically]
ORDER BY a.created_at DESC
```

## How It Works

### Search Examples:

1. **Search by Name Only:**
   - Enter "John" in Student Name field
   - Click Search
   - Returns all attendance records for students with "John" in their name

2. **Search by Department Only:**
   - Select "Computer Science" from Department dropdown
   - Click Search
   - Returns all attendance records for CS students

3. **Search by Course Only:**
   - Enter "Math" in Course Name field
   - Click Search
   - Returns all attendance records for courses containing "Math"

4. **Combined Search:**
   - Enter "John" in Student Name
   - Select "Computer Science" from Department
   - Enter "Data" in Course Name
   - Returns attendance records matching ALL three criteria

5. **Clear Filters:**
   - Click the ↻ button
   - Resets all filters and shows all records

## Benefits

✅ More intuitive search - admins typically know student names, not IDs
✅ Department filtering for better organization
✅ Flexible search - any field can be used alone or combined
✅ Partial matching for names and courses
✅ Better data visibility with student name and department in table

## Files Modified
- `frontend/src/pages/Attendance.jsx` - Updated filter UI and table columns
- `backend/routes/attendance.js` - Enhanced GET endpoint with JOIN query

## Testing
1. Login as admin: `admin@school.com / admin123`
2. Go to Attendance page
3. Try searching by:
   - Student name only
   - Department only
   - Course only
   - Combinations
4. Verify results match the filters
5. Test clear filters button
