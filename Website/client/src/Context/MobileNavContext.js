import React, { createContext, useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const MobileNavContext = createContext(null);

export const MobileNavProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close the drawer automatically on navigation so it never stays open
  // after a link click routes to a new page.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const value = {
    isOpen,
    toggle: () => setIsOpen((prev) => !prev),
    close: () => setIsOpen(false)
  };

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
};

export const useMobileNav = () => {
  const ctx = useContext(MobileNavContext);
  // Pages that render Sidebar/TopBar outside the provider (if any) get inert no-ops
  // instead of a crash.
  return ctx || { isOpen: false, toggle: () => {}, close: () => {} };
};
