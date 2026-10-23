// Role-based permission utilities
import { getUser } from './session';

export const getUserRole = () => {
  try {
    const user = getUser();
    return (user && user.role) ? String(user.role).toLowerCase() : 'student';
  } catch (e) {
    return 'student';
  }
};

export const canEdit = (role) => {
  return ['admin', 'teacher'].includes(role);
};

export const canDelete = (role) => {
  return ['admin'].includes(role);
};

export const canCreate = (role) => {
  return ['admin', 'teacher'].includes(role);
};

export const isReadOnly = (role) => {
  return ['student', 'principal'].includes(role);
};

export const canMarkAttendance = (role) => {
  return ['teacher'].includes(role);
};

export const canEnterMarks = (role) => {
  return ['teacher'].includes(role);
};

export const canManageFees = (role) => {
  return ['admin'].includes(role);
};

export const canViewReports = (role) => {
  return ['admin', 'teacher', 'principal'].includes(role);
};

export const canViewAnalytics = (role) => {
  return ['admin', 'teacher', 'principal'].includes(role);
};

export const getRoleDisplayName = (role) => {
  const names = {
    admin: 'Administrator',
    teacher: 'Teacher',
    principal: 'Principal',
    student: 'Student'
  };
  return names[role] || 'User';
};

export const getRoleColor = (role) => {
  const colors = {
    admin: 'blue',
    teacher: 'green',
    principal: 'purple',
    student: 'gray'
  };
  return colors[role] || 'gray';
};
