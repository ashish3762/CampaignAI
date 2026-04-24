import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { UserMenu } from '../UserMenu';

export const Navbar = ({ userEmail, onSidebarToggle, sidebarOpen }) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm-modern">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile menu toggle and logo */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className={`w-6 h-6 transition-transform ${
                sidebarOpen ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <Logo size="small" />
        </div>

        {/* Desktop logo - hidden on mobile */}
        <div className="hidden md:block md:w-64">
          <Logo size="default" />
        </div>

        {/* Right section - user menu */}
        <div className="flex items-center gap-4">
          {userEmail && (
            <UserMenu
              userEmail={userEmail}
              onSignOut={handleSignOut}
              onSettings={handleSettings}
            />
          )}
        </div>
      </div>
    </header>
  );
};
