import { useEffect } from 'react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "red" // red, blue, green
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    green: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      {/* Overlay with blur effect */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      {/* Modal Box */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex items-center justify-center pt-8 pb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            confirmColor === 'red' ? 'bg-red-100' :
            confirmColor === 'blue' ? 'bg-blue-100' :
            'bg-green-100'
          }`}>
            <span className="text-3xl">
              {confirmColor === 'red' ? '⚠️' : 
               confirmColor === 'blue' ? 'ℹ️' : 
               '✓'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-6">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {title}
          </h3>
          <p className="text-gray-600 text-center leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-8 pb-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses[confirmColor]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
