# Assignments System - Quick Start Guide

## ✅ Implementation Complete

The assignments system has been successfully implemented and tested!

## What's Been Added

### Backend
- ✅ `assignments` table in database
- ✅ `/api/assignments` routes (GET, POST, PUT, DELETE)
- ✅ Role-based access control
- ✅ Enrollment-based filtering for students

### Frontend
- ✅ Assignments page component (`/dashboard/assignments`)
- ✅ Navigation menu item in all panels
- ✅ Create/Edit/Delete forms for teachers
- ✅ View-only mode for students, admin, principal
- ✅ Overdue assignment indicators

## How to Use

### 1. Start the Application

**Backend**:
```bash
cd backend
npm start
```

**Frontend**:
```bash
cd frontend
npm run dev
```

### 2. Access by Role

#### Teacher Panel
- **Login**: `teacher@school.com` / `teacher123`
- **Navigate**: Click "Assignments" in sidebar
- **Actions**:
  - Click "+ Create Assignment" button
  - Fill in title, description, course, due date, marks
  - Click "Create Assignment"
  - Edit or delete existing assignments

#### Student Panel
- **Login**: `student@school.com` / `student123`
- **Navigate**: Click "Assignments" in sidebar
- **View**: See all assignments for enrolled courses
- **Features**:
  - Assignment details (title, description, due date)
  - Teacher email
  - Overdue indicators (red badge)
  - Course badges

#### Admin Panel
- **Login**: `admin@school.com` / `admin123`
- **Navigate**: Click "Assignments" in sidebar
- **View**: See all assignments across institution
- **Features**: View-only access with teacher information

#### Principal Panel
- **Login**: `principal@school.com` / `principal123`
- **Navigate**: Click "Assignments" in sidebar
- **View**: See all assignments (view-only)

## Features

### For Teachers
- ✅ Create assignments for assigned courses
- ✅ Edit assignment details
- ✅ Delete assignments
- ✅ Set due dates and total marks
- ✅ Add descriptions and instructions
- ✅ View only their own assignments

### For Students
- ✅ View assignments for enrolled courses
- ✅ See assignment details and requirements
- ✅ Visual indicators for overdue assignments
- ✅ See teacher contact information
- ✅ Sorted by due date (upcoming first)

### For Admin/Principal
- ✅ View all assignments institution-wide
- ✅ See which teacher created each assignment
- ✅ Monitor assignment distribution across courses
- ✅ View-only access (cannot modify)

## Assignment Card Information

Each assignment displays:
- **Title** - Assignment name
- **Description** - Detailed instructions (if provided)
- **Course** - Course name (blue badge)
- **Due Date** - Deadline (red if overdue)
- **Total Marks** - Maximum points
- **Teacher** - Teacher email (for students/admin)
- **Created Date** - When assignment was created
- **Overdue Badge** - Red indicator if past due date

## Navigation

The "Assignments" menu item appears in:
- ✅ Teacher Panel (between Attendance and Notices)
- ✅ Student Panel (between Marks and Notices)
- ✅ Admin Panel (full menu)
- ✅ Principal Panel (view-only)

## Database Schema

```sql
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  course TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  due_date TEXT,
  total_marks INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/assignments` | Admin, Principal | Get all assignments |
| GET | `/api/assignments/teacher/:id` | Teacher | Get teacher's assignments |
| GET | `/api/assignments/student/:id` | Student | Get student's assignments |
| POST | `/api/assignments` | Teacher | Create new assignment |
| PUT | `/api/assignments/:id` | Teacher | Update assignment |
| DELETE | `/api/assignments/:id` | Teacher | Delete assignment |

## Test Data

A sample assignment has been created:
- **Title**: Sample Assignment - Test
- **Course**: DSA
- **Teacher**: teacher@school.com
- **Due Date**: 7 days from now
- **Total Marks**: 100
- **Enrolled Students**: 1 (Kushal kuwar)

## Verification

Run the test script to verify:
```bash
cd backend
node test-assignments.js
```

Expected output:
- ✓ Assignments table exists
- ✓ Table structure verified
- ✓ Sample assignment created
- ✓ Enrolled students found

## Troubleshooting

### Teacher can't create assignments
**Issue**: No courses in dropdown
**Solution**: Assign courses to teacher in "Assign Teachers" page

### Student sees no assignments
**Issue**: No assignments displayed
**Solution**: 
1. Ensure student is enrolled in courses
2. Ensure teacher has created assignments for those courses

### Assignment not appearing
**Issue**: Created assignment doesn't show
**Solution**: Refresh the page or check if course matches enrollment

## File Locations

```
backend/
├── routes/assignments.js           # API routes
├── initDatabase.js                 # Database schema
├── test-assignments.js             # Test script
├── setup-test-data.js              # Setup helper
└── init-assignments-table.js       # Initialize table

frontend/
└── src/
    ├── pages/
    │   ├── Assignments.jsx         # Main component
    │   └── Dashboard.jsx           # Navigation
    └── App.jsx                     # Routing
```

## Next Steps

1. ✅ System is ready to use
2. ✅ Test with different roles
3. ✅ Create real assignments
4. ✅ Monitor student access

## Support

For issues or questions:
1. Check ASSIGNMENTS_SYSTEM.md for detailed documentation
2. Run test-assignments.js to verify setup
3. Check browser console for errors
4. Verify user roles and enrollments

---

**Status**: ✅ Fully Functional and Production Ready
**Last Updated**: February 24, 2026
