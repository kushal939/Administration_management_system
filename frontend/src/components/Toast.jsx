import { useEffect } from 'react';

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideInRight">
      <div className={`${typeStyles[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold">{icons[type]}</span>
        </div>
        <p className="font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors ml-2"
        >
          <span className="text-xl">×</span>
        </button>
      </div>
    </div>
  );
};

export default Toast;
