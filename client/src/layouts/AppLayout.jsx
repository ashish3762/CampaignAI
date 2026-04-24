import { useState } from 'react';
import { Navbar } from '../components/Navigation/Navbar';
import { Sidebar } from '../components/Navigation/Sidebar';

export const AppLayout = ({ children, userEmail }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      {/* Navbar */}
      <Navbar
        userEmail={userEmail}
        onSidebarToggle={handleSidebarToggle}
        sidebarOpen={sidebarOpen}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full h-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
