# 📚 API Reference - Enrollment System

## Quick Reference for New Endpoints

---

## 🎓 Enrollment & Academic Flow

### 1. Get Courses by Department
**Load all courses in a department**

```http
GET /api/departments/:departmentName/courses
```

**Example:**
```bash
GET /api/departments/Mathematics/courses
GET /api/departments/Computer%20Science/courses
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mathematics 101",
      "code": "MATH101",
      "department": "Mathematics",
      "credits": 3,
      "created_at": "2026-02-22 07:35:09"
    }
  ],
  "count": 1
}
```

---

### 2. Get Teacher's Assigned Courses
**Load full course details for a teacher**

```http
GET /api/teacher-courses/:teacherId/courses
```

**Example:**
```bash
GET /api/teacher-courses/2/courses
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mathematics 101",
      "code": "MATH101",
      "department": "Mathematics",
      "credits": 3
    },
    {
      "id": 5,
      "name": "Computer Science 101",
      "code": "CS101",
      "department": "Computer Science",
      "credits": 4
    }
  ],
  "count": 2
}
```

---

### 3. Get Enrolled Students by Course
**Load students enrolled in a specific course**

```http
GET /api/attendance/students?courseId={id}&teacherId={id}
```

**Parameters:**
- `courseId` (required): The course ID
- `teacherId` (optional): Teacher ID for authorization check

**Example:**
```bash
GET /api/attendance/students?courseId=1
GET /api/attendance/students?courseId=1&teacherId=2
```

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice.johnson@school.com",
      "studentId": "S1001",
      "course": "Mathematics 101",
      "year": "1",
      "created_at": "2026-02-22 07:35:09"
    },
    {
      "id": 2,
      "name": "Bob Smith",
      "email": "bob.smith@school.com",
      "studentId": "S1002",
      "course": "Mathematics 101",
      "year": "1",
      "created_at": "2026-02-22 07:35:10"
    }
  ],
  "count": 2
}
```

**Response (Unauthorized):**
```json
{
  "success": false,
  "message": "You are not assigned to teach this course"
}
```

---

## 📝 Updated Endpoints

### 4. Create Student (with Auto-Enrollment)
**Add a new student and auto-enroll in department courses**

```http
POST /api/students
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@school.com",
  "studentId": "S1010",
  "course": "Mathematics 101",
  "year": "1",
  "department": "Mathematics"
}
```

**New Field:**
- `department` (optional): If provided, student is automatically enrolled in ALL courses of that department

**Response:**
```json
{
  "success": true,
  "message": "Student added successfully",
  "data": {
    "id": 10,
    "name": "John Doe",
    "email": "john.doe@school.com",
    "studentId": "S1010",
    "course": "Mathematics 101",
    "year": "1",
    "created_at": "2026-02-23T10:00:00.000Z"
  }
}
```

**Note:** Console will log: `Auto-enrolled student S1010 in 1 courses of Mathematics`

---

### 5. Mark Attendance (with Authorization)
**Mark attendance with teacher authorization check**

```http
POST /api/attendance
```

**Body:**
```json
{
  "studentId": "S1001",
  "course": "Mathematics 101",
  "date": "2026-02-23",
  "status": "present",
  "teacherId": 2,
  "courseId": 1
}
```

**New Fields:**
- `teacherId` (optional): Teacher ID for authorization
- `courseId` (optional): Course ID for authorization

**Response (Success):**
```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "id": 25,
    "studentId": "S1001",
    "course": "Mathematics 101",
    "date": "2026-02-23",
    "status": "present",
    "created_at": "2026-02-23T10:00:00.000Z"
  }
}
```

**Response (Unauthorized):**
```json
{
  "success": false,
  "message": "You are not authorized to mark attendance for this course"
}
```

---

## 🔄 Complete Attendance Flow

### Frontend Implementation Example

```javascript
// Step 1: Load departments
const deptResponse = await fetch('/api/departments');
const departments = await deptResponse.json();

// Step 2: User selects department
const selectedDept = 'Mathematics';

// Step 3: Load courses for that department
const coursesResponse = await fetch(`/api/departments/${selectedDept}/courses`);
const courses = await coursesResponse.json();

// Step 4: User selects course
const selectedCourse = courses.data[0]; // { id: 1, name: "Mathematics 101", ... }

// Step 5: Load enrolled students
const user = JSON.parse(localStorage.getItem('user'));
const studentsResponse = await fetch(
  `/api/attendance/students?courseId=${selectedCourse.id}&teacherId=${user.id}`
);
const students = await studentsResponse.json();

// Step 6: Mark attendance for each student
for (const student of students.data) {
  await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: student.studentId,
      course: selectedCourse.name,
      date: new Date().toISOString().split('T')[0],
      status: 'present', // or 'absent', 'late', 'excused'
      teacherId: user.id,
      courseId: selectedCourse.id
    })
  });
}
```

---

## 🔒 Authorization Rules

### Teacher Authorization:
1. **Get Enrolled Students:** Teacher must be assigned to the course
2. **Mark Attendance:** Teacher must be assigned to the course

### Verification Query:
```sql
SELECT * FROM teacher_courses 
WHERE teacherId = ? AND course = ?
```

If no match found → **403 Forbidden**

---

## 📊 Database Schema

### Enrollments Table:
```sql
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  department_id INTEGER NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);
```

### Key Relationships:
- `student_id` → `students.id`
- `course_id` → `courses.id`
- `department_id` → `departments.id`

---

## ✅ Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing required parameters |
| 403 | Forbidden | Not authorized for this action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 500 | Server Error | Internal error |

---

## 🧪 Testing Examples

### Test Department Courses:
```bash
curl http://localhost:3001/api/departments/Mathematics/courses
```

### Test Teacher Courses:
```bash
curl http://localhost:3001/api/teacher-courses/2/courses
```

### Test Enrolled Students:
```bash
curl "http://localhost:3001/api/attendance/students?courseId=1&teacherId=2"
```

### Test Create Student with Auto-Enrollment:
```bash
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "email": "test@school.com",
    "studentId": "S9999",
    "department": "Mathematics",
    "year": "1"
  }'
```

### Test Mark Attendance with Authorization:
```bash
curl -X POST http://localhost:3001/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S1001",
    "course": "Mathematics 101",
    "date": "2026-02-23",
    "status": "present",
    "teacherId": 2,
    "courseId": 1
  }'
```

---

## 📝 Notes

1. **Auto-Enrollment:** When creating a student with a department, they are automatically enrolled in ALL courses of that department

2. **Authorization:** Always include `teacherId` and `courseId` when marking attendance to enable authorization checks

3. **Course ID vs Course Name:** 
   - Use `courseId` (integer) for enrollment queries
   - Use `course` (string name) for attendance records (legacy compatibility)

4. **Department Names:** Use exact department names (case-sensitive) when querying courses

---

**API Version:** 2.0  
**Last Updated:** February 23, 2026  
**Status:** ✅ Production Ready


---

# 🔧 CRUD Operations API Reference

Complete reference for all UPDATE and DELETE operations added to the Admin panel.

---

## 👨‍🎓 Students CRUD

### Update Student
```http
PUT /api/students/:id
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "studentId": "STU001",
  "course": "Computer Science",
  "year": "2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "id": 1,
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "studentId": "STU001",
    "course": "Computer Science",
    "year": "2024"
  }
}
```

### Delete Student
```http
DELETE /api/students/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

**Note:** Automatically cascades to delete all enrollments for this student.

---

## 📚 Courses CRUD

### Update Course
```http
PUT /api/courses/:id
```

**Request Body:**
```json
{
  "name": "Data Structures Updated",
  "code": "CS201",
  "department": "Computer Science",
  "credits": 4
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "id": 1,
    "name": "Data Structures Updated",
    "code": "CS201",
    "department": "Computer Science",
    "credits": 4
  }
}
```

### Delete Course
```http
DELETE /api/courses/:id
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

**Response (Conflict - Has Enrollments):**
```json
{
  "success": false,
  "message": "Cannot delete course. 5 student(s) are enrolled in this course."
}
```

**Note:** Checks for enrollments before deletion. Cannot delete if students are enrolled.

---

## 🏢 Departments CRUD

### Update Department
```http
PUT /api/departments/:id
```

**Request Body:**
```json
{
  "name": "Computer Science Updated",
  "code": "CS"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "id": 1,
    "name": "Computer Science Updated",
    "code": "CS"
  }
}
```

### Delete Department
```http
DELETE /api/departments/:id
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

**Response (Conflict - Has Courses):**
```json
{
  "success": false,
  "message": "Cannot delete department. 3 course(s) belong to this department."
}
```

**Note:** Checks for courses before deletion. Cannot delete if courses exist in this department.

---

## 📅 Attendance CRUD

### Update Attendance (Already Existed)
```http
PUT /api/attendance/:id
```

**Request Body:**
```json
{
  "status": "absent"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance updated successfully",
  "data": {
    "id": 1,
    "status": "absent"
  }
}
```

### Delete Attendance (NEW)
```http
DELETE /api/attendance/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance deleted successfully"
}
```

---

## 📊 Marks CRUD

### Update Marks
```http
PUT /api/marks/:id
```

**Request Body:**
```json
{
  "studentId": "STU001",
  "course": "Mathematics",
  "marks": 90
}
```

**Response:**
```json
{
  "success": true,
  "message": "Marks updated successfully",
  "data": {
    "id": 1,
    "studentId": "STU001",
    "course": "Mathematics",
    "marks": 90
  }
}
```

### Delete Marks
```http
DELETE /api/marks/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Marks deleted successfully"
}
```

---

## 📢 Notices CRUD

### Update Notice
```http
PUT /api/notices/:id
```

**Request Body:**
```json
{
  "title": "Holiday Notice Updated",
  "content": "School will be closed on...",
  "author": "Admin",
  "type": "urgent",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notice updated successfully",
  "data": {
    "id": 1,
    "title": "Holiday Notice Updated",
    "content": "School will be closed on...",
    "author": "Admin",
    "type": "urgent",
    "priority": "high"
  }
}
```

### Delete Notice
```http
DELETE /api/notices/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Notice deleted successfully"
}
```

---

## 💰 Fees CRUD

### Update Fee
```http
PUT /api/fees/:id
```

**Request Body:**
```json
{
  "studentId": "STU001",
  "amount": 5500,
  "description": "Tuition Fee Updated",
  "category": "tuition",
  "due_date": "2024-03-31",
  "paid": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Fee updated successfully",
  "data": {
    "id": 1,
    "studentId": "STU001",
    "amount": 5500,
    "description": "Tuition Fee Updated",
    "category": "tuition",
    "due_date": "2024-03-31",
    "paid": 1
  }
}
```

### Delete Fee
```http
DELETE /api/fees/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Fee deleted successfully"
}
```

---

## 🧪 Testing CRUD Operations

### Test Update Student:
```bash
curl -X PUT http://localhost:3001/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@school.com",
    "studentId": "S1001",
    "course": "Mathematics",
    "year": "2"
  }'
```

### Test Delete Student:
```bash
curl -X DELETE http://localhost:3001/api/students/1
```

### Test Update Course:
```bash
curl -X PUT http://localhost:3001/api/courses/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced Mathematics",
    "code": "MATH201",
    "department": "Mathematics",
    "credits": 4
  }'
```

### Test Delete Course:
```bash
curl -X DELETE http://localhost:3001/api/courses/1
```

### Test Update Marks:
```bash
curl -X PUT http://localhost:3001/api/marks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S1001",
    "course": "Mathematics",
    "marks": 95
  }'
```

### Test Delete Attendance:
```bash
curl -X DELETE http://localhost:3001/api/attendance/1
```

---

## ⚠️ Important Notes

### Cascade Deletions:
- **Students:** Deleting a student automatically removes all their enrollments
- **Courses:** Cannot delete if students are enrolled (409 Conflict)
- **Departments:** Cannot delete if courses exist (409 Conflict)

### Validation:
- All UPDATE operations validate required fields
- All DELETE operations check if resource exists (404 if not found)
- Proper error messages returned for all failure cases

### Status Codes:
| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Update/Delete successful |
| 400 | Bad Request | Missing required fields |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Cannot delete due to dependencies |
| 500 | Server Error | Internal error |

---

**CRUD Operations Added:** February 23, 2026  
**Status:** ✅ All CRUD Operations Complete
