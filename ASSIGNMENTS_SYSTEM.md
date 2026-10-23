# Assignments System - Complete Implementation

## Overview
A complete assignment management system where teachers can create assignments for their enrolled courses, and students can view assignments for courses they're enrolled in. Admins and principals can view all assignments across the institution.

## Features Implemented

### 1. Database Structure
- **Table**: `assignments`
- **Columns**:
  - `id` - Primary key (auto-increment)
  - `title` - Assignment title (required)
  - `description` - Detailed description (optional)
  - `course` - Course name (required)
  - `teacher_id` - ID of teacher who created it (required)
  - `due_date` - Due date (optional)
  - `total_marks` - Maximum marks (default: 100)
  - `created_at` - Timestamp

### 2. Backend API Endpoints

#### GET `/api/assignments`
- **Access**: Admin, Principal
- **Returns**: All assignments with teacher email
- **Use**: View all assignments across institution

#### GET `/api/assignments/teacher/:teacherId`
- **Access**: Teacher
- **Returns**: Assignments created by specific teacher
- **Use**: Teacher views their own assignments

#### GET `/api/assignments/student/:studentId`
- **Access**: Student
- **Returns**: Assignments for courses student is enrolled in
- **Use**: Student views their assignments

#### POST `/api/assignments`
- **Access**: Teacher
- **Body**: `{ title, description, course, teacher_id, due_date, total_marks }`
- **Returns**: Success message with assignment ID
- **Use**: Create new assignment

#### PUT `/api/assignments/:id`
- **Access**: Teacher (own assignments only)
- **Body**: `{ title, description, course, due_date, total_marks }`
- **Returns**: Success message
- **Use**: Update existing assignment

#### DELETE `/api/assignments/:id`
- **Access**: Teacher (own assignments only)
- **Body**: None
- **Returns**: Success message
- **Use**: Delete assignment

### 3. Frontend Components

#### Assignments Page (`/dashboard/assignments`)
- **Location**: `frontend/src/pages/Assignments.jsx`
- **Access**: All roles (Teacher, Student, Admin, Principal)

**Features by Role**:

**Teacher**:
- Create new assignments with form
- Edit existing assignments
- Delete assignments
- View only their own assignments
- Assignments filtered by courses they teach

**Student**:
- View assignments for enrolled courses
- See assignment details (title, description, due date, marks)
- Visual indicator for overdue assignments
- See teacher email for each assignment

**Admin/Principal**:
- View all assignments across institution
- See teacher email for each assignment
- Cannot create/edit/delete (view-only)

### 4. Navigation Integration

**Updated Files**:
- `frontend/src/App.jsx` - Added `/dashboard/assignments` route
- `frontend/src/pages/Dashboard.jsx` - Added "Assignments" menu item

**Menu Visibility**:
- **Teacher**: Shows in navbar (between Marks and Notices)
- **Student**: Shows in navbar (between Marks and Notices)
- **Admin**: Shows in navbar (full access)
- **Principal**: Shows in navbar (view-only)

### 5. UI/UX Features

**Assignment Card Display**:
- Title with overdue badge (if past due date)
- Description (if provided)
- Course badge (blue pill)
- Due date (red if overdue)
- Total marks
- Teacher email (for students/admin)
- Created date
- Edit/Delete buttons (teachers only)

**Form Features**:
- Title input (required)
- Description textarea (optional)
- Course dropdown (populated from teacher's courses)
- Due date picker (optional)
- Total marks input (default: 100)
- Validation for required fields

**Visual Indicators**:
- Overdue assignments: Red "Overdue" badge
- Due dates: Red text if overdue, gray if not
- Loading states with spinner
- Success/Error messages with auto-dismiss (3 seconds)

## Testing

### Test Script
Run: `node backend/test-assignments.js`

**Tests**:
1. ✓ Assignments table exists
2. ✓ Table structure verification
3. ✓ Count existing assignments
4. ✓ Find teacher for testing
5. ✓ Get teacher's courses
6. ✓ Create sample assignment
7. ✓ Verify assignment in database
8. ✓ Get enrolled students for course

### Manual Testing Steps

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test as Teacher**:
   - Login: `teacher@school.com` / `teacher123`
   - Navigate to "Assignments" in navbar
   - Click "+ Create Assignment"
   - Fill form and submit
   - Verify assignment appears in list
   - Test Edit and Delete functions

4. **Test as Student**:
   - Login: `student@school.com` / `student123`
   - Navigate to "Assignments" in navbar
   - Verify you see assignments for your enrolled courses
   - Verify you cannot create/edit/delete

5. **Test as Admin**:
   - Login: `admin@school.com` / `admin123`
   - Navigate to "Assignments" in navbar
   - Verify you see all assignments
   - Verify teacher emails are visible

6. **Test as Principal**:
   - Login: `principal@school.com` / `principal123`
   - Navigate to "Assignments" in navbar
   - Verify view-only access (no create/edit/delete)

## Database Queries

### Get assignments for a student
```sql
SELECT a.*, u.email as teacher_email
FROM assignments a
LEFT JOIN users u ON a.teacher_id = u.id
WHERE a.course IN (
  SELECT c.name
  FROM enrollments e
  JOIN students s ON e.student_id = s.id
  JOIN courses c ON e.course_id = c.id
  WHERE s.studentId = ?
)
ORDER BY a.due_date ASC, a.created_at DESC
```

### Get assignments by teacher
```sql
SELECT a.*, u.email as teacher_email
FROM assignments a
LEFT JOIN users u ON a.teacher_id = u.id
WHERE a.teacher_id = ?
ORDER BY a.created_at DESC
```

## File Structure

```
backend/
├── routes/
│   └── assignments.js          # API endpoints
├── initDatabase.js             # Added assignments table
├── server.js                   # Registered assignments route
└── test-assignments.js         # Test script

frontend/
├── src/
│   ├── pages/
│   │   ├── Assignments.jsx     # Main component
│   │   └── Dashboard.jsx       # Updated navigation
│   └── App.jsx                 # Added route
```

## Integration Points

1. **Enrollment System**: Assignments are filtered based on student enrollments
2. **Teacher-Course Mapping**: Teachers can only create assignments for their assigned courses
3. **User Authentication**: Teacher ID from localStorage used for assignment creation
4. **Role-Based Access**: Different views and permissions based on user role

## Future Enhancements (Optional)

- Assignment submission system
- Grading functionality
- File attachments
- Assignment categories/tags
- Bulk assignment creation
- Assignment templates
- Email notifications for new assignments
- Assignment status tracking (submitted/pending/graded)
- Comments/feedback on assignments
- Assignment analytics and reports

## Troubleshooting

**Issue**: Assignments table doesn't exist
- **Solution**: Restart backend server to run database initialization

**Issue**: Teacher sees no courses in dropdown
- **Solution**: Assign courses to teacher in "Assign Teachers" page

**Issue**: Student sees no assignments
- **Solution**: Ensure student is enrolled in courses and teacher has created assignments

**Issue**: Cannot create assignment
- **Solution**: Verify teacher is logged in and has assigned courses

## Summary

The assignments system is fully functional and integrated with:
- ✅ Database schema with assignments table
- ✅ Complete REST API with 5 endpoints
- ✅ Frontend component with role-based views
- ✅ Navigation integration in all panels
- ✅ Enrollment-based filtering for students
- ✅ Teacher-course mapping integration
- ✅ Full CRUD operations for teachers
- ✅ View-only access for students, admin, principal
- ✅ Visual indicators for overdue assignments
- ✅ Responsive design with Tailwind CSS
- ✅ Error handling and validation
- ✅ Test script for verification

The system is production-ready and follows the existing codebase patterns and conventions.
