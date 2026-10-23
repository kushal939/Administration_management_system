// Professional SVG icon set — stroke-based, no emojis

const Icon = ({ paths, size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {paths.map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const ic = (paths) => ({ size, className }) => (
  <Icon paths={paths} size={size} className={className} />
);

// Navigation
export const ChevronRight  = ic(['M9 18l6-6-6-6']);
export const ChevronLeft   = ic(['M15 18l-6-6 6-6']);
export const Search        = ic(['M21 21l-4.35-4.35', 'M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0']);
export const X             = ic(['M18 6L6 18', 'M6 6l12 12']);
export const Star          = ic(['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']);
export const Clock         = ic(['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', 'M12 6v6l4 2']);
export const LogOut        = ic(['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']);

// Academic
export const BookOpen      = ic(['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z']);
export const GraduationCap = ic(['M22 10v6', 'M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5']);
export const ClipboardList = ic(['M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2', 'M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2', 'M9 12h6', 'M9 16h4']);
export const Award         = ic(['M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14', 'M8.21 13.89L7 23l5-3 5 3-1.21-9.12']);
export const TrendingUp    = ic(['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6']);
export const BarChart2     = ic(['M18 20V10', 'M12 20V4', 'M6 20v-6']);
export const Brain         = ic(['M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.8 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2', 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.8 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2']);

// People
export const Users         = ic(['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']);
export const UserCheck     = ic(['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M16 11l2 2 4-4']);
export const UserCog       = ic(['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M19.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5', 'M22 21v-1a4 4 0 0 0-4-4h-.5']);
export const User          = ic(['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8']);

// Operations
export const CheckSquare   = ic(['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11']);
export const FileText      = ic(['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']);
export const Layers        = ic(['M12 2L2 7l10 5 10-5-10-5', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']);
export const Archive       = ic(['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4']);
export const Folder        = ic(['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z']);

// Communication
export const Bell          = ic(['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']);
export const MessageSquare = ic(['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z']);

// Finance
export const CreditCard    = ic(['M1 4h22v16H1z', 'M1 10h22']);

// System
export const Settings      = ic(['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']);
export const Scan          = ic(['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2', 'M7 12h10']);
export const Building      = ic(['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']);
export const PieChart      = ic(['M21.21 15.89A10 10 0 1 1 8 2.83', 'M22 12A10 10 0 0 0 12 2v10z']);
export const Activity      = ic(['M22 12h-4l-3 9L9 3l-3 9H2']);
export const Home          = ic(['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']);
export const Layout        = ic(['M3 3h18v18H3z', 'M3 9h18', 'M9 21V9']);
