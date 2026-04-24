import { useState, useRef, useEffect } from 'react';

export const UserMenu = ({ userEmail, onSignOut, onSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (email) => {
    return email
      .split('@')[0]
      .split('.')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
        title={userEmail}
      >
        {getInitials(userEmail)}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg-modern border border-neutral-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-neutral-200">
            <p className="text-sm font-medium text-neutral-900">{userEmail}</p>
          </div>
          <div className="py-1">
            {onSettings && (
              <button
                onClick={() => {
                  onSettings();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Settings
              </button>
            )}
            <button
              onClick={() => {
                onSignOut();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors border-t border-neutral-200"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
