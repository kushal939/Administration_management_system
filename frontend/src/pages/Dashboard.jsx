import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import TutorialModal from '../components/TutorialModal';
import tutorialContent from '../utils/tutorialContent';
import NotificationBar from '../components/NotificationBar';

const Dashboard = () => {
  const navigate = useNavigate();
  const rawUser  = sessionStorage.getItem('user') || localStorage.getItem('user');
  const user     = rawUser ? JSON.parse(rawUser) : null;
  const role     = user?.role ? String(user.role).toLowerCase() : 'student';

  const title = { admin: 'Admin Panel', teacher: 'Teacher Panel', principal: 'Principal Dashboard', student: 'Student Panel' }[role] || 'Dashboard';

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(`tutorialDismissed_${role}`)) setShowTutorial(true);
  }, [role]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={role} user={user} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="hidden lg:block">
              <h1 className="text-lg font-bold text-gray-900">{title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Welcome, {user?.name || user?.email || 'User'}</p>
            </div>
            <div className="lg:hidden w-10" />
            <div className="flex items-center gap-3">
              <NotificationBar />
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name || user?.email || 'User'}</p>
                  <p className="text-xs text-gray-400 capitalize">{role}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
            <TutorialModal
              open={showTutorial}
              onClose={() => setShowTutorial(false)}
              onDontShowAgain={() => { localStorage.setItem(`tutorialDismissed_${role}`, 'true'); setShowTutorial(false); }}
              content={tutorialContent[role] || tutorialContent.student}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
