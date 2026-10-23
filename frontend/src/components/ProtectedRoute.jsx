import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // sessionStorage is tab-specific — if it has no user, this tab must log in
  const isAuthenticated = sessionStorage.getItem('user') !== null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
