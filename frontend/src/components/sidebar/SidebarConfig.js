// Menu config — icon names only (resolved to components inside Sidebar)
export const menuConfig = {
  admin: [
    {
      group: 'Academic Management', groupIcon: 'BookOpen',
      items: [
        { label: 'Student Records',  path: '/dashboard/student-records',  icon: 'Archive' },
        { label: 'Courses',          path: '/dashboard/courses',           icon: 'BookOpen' },
        { label: 'Batch Management', path: '/dashboard/batch-management',  icon: 'Layers' },
        { label: 'Batch Overview',   path: '/dashboard/principal-batches', icon: 'Layout' },
        { label: 'Assign Teachers',  path: '/dashboard/assign-teachers',   icon: 'UserCheck' },
      ],
    },
    {
      group: 'Academic Operations', groupIcon: 'ClipboardList',
      items: [
        { label: 'Attendance',    path: '/dashboard/attendance',    icon: 'CheckSquare' },
        { label: 'Results',       path: '/dashboard/results',       icon: 'Award' },
        { label: 'Assignments',   path: '/dashboard/assignments',   icon: 'ClipboardList' },
        { label: 'Progression',   path: '/dashboard/progression',   icon: 'TrendingUp' },
        { label: 'Sikhya Suchak', path: '/dashboard/sikhya-suchak', icon: 'Brain' },
      ],
    },
    {
      group: 'Communication', groupIcon: 'MessageSquare',
      items: [
        { label: 'Notices',  path: '/dashboard/notices',  icon: 'Bell' },
        { label: 'Messages', path: '/dashboard/messages', icon: 'MessageSquare' },
      ],
    },
    {
      group: 'Analytics & Reports', groupIcon: 'BarChart2',
      items: [
        { label: 'Reports',   path: '/dashboard/reports',   icon: 'FileText' },
        { label: 'Analytics', path: '/dashboard/analytics', icon: 'BarChart2' },
      ],
    },
    {
      group: 'Finance', groupIcon: 'CreditCard',
      items: [
        { label: 'Fees', path: '/dashboard/fees', icon: 'CreditCard' },
      ],
    },
    {
      group: 'Administration', groupIcon: 'Settings',
      items: [
        { label: 'User Management', path: '/dashboard/user-management', icon: 'UserCog' },
        { label: 'OCR',             path: '/dashboard/ocr',             icon: 'Scan' },
      ],
    },
    {
      group: 'Account', groupIcon: 'User',
      items: [
        { label: 'My Profile', path: '/dashboard/profile', icon: 'User' },
      ],
    },
  ],

  teacher: [
    {
      group: 'My Classes', groupIcon: 'BookOpen',
      items: [
        { label: 'My Batches',  path: '/dashboard/my-batches',  icon: 'Layers' },
        { label: 'My Students', path: '/dashboard/my-students', icon: 'Users' },
        { label: 'Attendance',  path: '/dashboard/attendance',  icon: 'CheckSquare' },
        { label: 'Assignments', path: '/dashboard/assignments', icon: 'ClipboardList' },
      ],
    },
    {
      group: 'Academic Work', groupIcon: 'ClipboardList',
      items: [
        { label: 'Results',       path: '/dashboard/results',       icon: 'Award' },
        { label: 'Progression',   path: '/dashboard/progression',   icon: 'TrendingUp' },
        { label: 'Sikhya Suchak', path: '/dashboard/sikhya-suchak', icon: 'Brain' },
      ],
    },
    {
      group: 'Communication', groupIcon: 'MessageSquare',
      items: [
        { label: 'Notices',  path: '/dashboard/notices',  icon: 'Bell' },
        { label: 'Messages', path: '/dashboard/messages', icon: 'MessageSquare' },
      ],
    },
    {
      group: 'Reports', groupIcon: 'FileText',
      items: [
        { label: 'Reports', path: '/dashboard/reports', icon: 'FileText' },
      ],
    },
    {
      group: 'Account', groupIcon: 'User',
      items: [
        { label: 'My Profile', path: '/dashboard/profile', icon: 'User' },
      ],
    },
  ],

  student: [
    {
      group: 'My Academics', groupIcon: 'GraduationCap',
      items: [
        { label: 'My Dashboard', path: '/dashboard/student-dashboard', icon: 'Home' },
        { label: 'My Batch',     path: '/dashboard/my-batch',          icon: 'Layers' },
        { label: 'Attendance',   path: '/dashboard/attendance',        icon: 'CheckSquare' },
        { label: 'Results',      path: '/dashboard/results',           icon: 'Award' },
        { label: 'Assignments',  path: '/dashboard/assignments',       icon: 'ClipboardList' },
      ],
    },
    {
      group: 'Performance', groupIcon: 'TrendingUp',
      items: [
        { label: 'Progression',   path: '/dashboard/progression',   icon: 'TrendingUp' },
        { label: 'Sikhya Suchak', path: '/dashboard/sikhya-suchak', icon: 'Brain' },
      ],
    },
    {
      group: 'Finance', groupIcon: 'CreditCard',
      items: [
        { label: 'Fees', path: '/dashboard/fees', icon: 'CreditCard' },
      ],
    },
    {
      group: 'Communication', groupIcon: 'MessageSquare',
      items: [
        { label: 'Notices',  path: '/dashboard/notices',  icon: 'Bell' },
        { label: 'Messages', path: '/dashboard/messages', icon: 'MessageSquare' },
      ],
    },
    {
      group: 'Account', groupIcon: 'User',
      items: [
        { label: 'My Profile', path: '/dashboard/profile', icon: 'User' },
      ],
    },
  ],

  principal: [
    {
      group: 'Institution Overview', groupIcon: 'Building',
      items: [
        { label: 'Students',       path: '/dashboard/students',          icon: 'Users' },
        { label: 'Batch Overview', path: '/dashboard/principal-batches', icon: 'Layout' },
        { label: 'Courses',        path: '/dashboard/courses',           icon: 'BookOpen' },
      ],
    },
    {
      group: 'Monitoring', groupIcon: 'Activity',
      items: [
        { label: 'Analytics',  path: '/dashboard/analytics',  icon: 'BarChart2' },
        { label: 'Reports',    path: '/dashboard/reports',    icon: 'FileText' },
        { label: 'Attendance', path: '/dashboard/attendance', icon: 'CheckSquare' },
        { label: 'Results',    path: '/dashboard/results',    icon: 'Award' },
      ],
    },
    {
      group: 'Performance', groupIcon: 'TrendingUp',
      items: [
        { label: 'Progression',   path: '/dashboard/progression',   icon: 'TrendingUp' },
        { label: 'Sikhya Suchak', path: '/dashboard/sikhya-suchak', icon: 'Brain' },
      ],
    },
    {
      group: 'Communication', groupIcon: 'MessageSquare',
      items: [
        { label: 'Notices', path: '/dashboard/notices', icon: 'Bell' },
      ],
    },
    {
      group: 'Account', groupIcon: 'User',
      items: [
        { label: 'My Profile', path: '/dashboard/profile', icon: 'User' },
      ],
    },
  ],
};
