import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Attendance from './pages/Attendance';
import Marks from './pages/Marks';
import Notices from './pages/Notices';
import Reports from './pages/Reports';
import Fees from './pages/Fees';
import OCR from './pages/OCR';
import Analytics from './pages/Analytics';
import AssignTeachers from './pages/AssignTeachers';
import UserManagement from './pages/UserManagement_Enhanced';
import RequestStudent from './pages/RequestStudent';
import Assignments from './pages/Assignments';
import StudentRecords from './pages/StudentRecords';
import MyStudents from './pages/MyStudents';
import MyBatches from './pages/MyBatches';
import MyBatch from './pages/MyBatch';
import StudentDashboard from './pages/StudentDashboard';
import AdminBatchManagement from './pages/AdminBatchManagement';
import PrincipalBatchManagement from './pages/PrincipalBatchManagement';
import Results from './pages/Results';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import ProtectedRoute from './components/ProtectedRoute';
import StudentProgression from './pages/StudentProgression';
import SikhyaSuchak from './pages/SikhyaSuchak';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/students" replace />} />
          <Route path="student-dashboard" element={<StudentDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="my-students" element={<MyStudents />} />
          <Route path="courses" element={<Courses />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="marks" element={<Marks />} />
          <Route path="results" element={<Results />} />
          <Route path="notices" element={<Notices />} />
          <Route path="reports" element={<Reports />} />
          <Route path="fees" element={<Fees />} />
          <Route path="ocr" element={<OCR />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="assign-teachers" element={<AssignTeachers />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="student-records" element={<StudentRecords />} />
          <Route path="batch-management" element={<AdminBatchManagement />} />
          <Route path="principal-batches" element={<PrincipalBatchManagement />} />
          <Route path="my-batches" element={<MyBatches />} />
          <Route path="my-batch" element={<MyBatch />} />
          <Route path="request-student" element={<RequestStudent />} />
          <Route path="profile" element={<Profile />} />
          <Route path="messages" element={<Messages />} />
          <Route path="progression" element={<StudentProgression />} />
          <Route path="sikhya-suchak" element={<SikhyaSuchak />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
