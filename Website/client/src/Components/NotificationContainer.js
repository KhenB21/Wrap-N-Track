import React from 'react';
import { useAuth } from '../Context/AuthContext';
import NotificationBell from './NotificationBell';
import NotificationPanel from './NotificationPanel';

const NotificationContainer = () => {
  const { user } = useAuth();

  // Only show notifications for employee users, not customer users
  if (!user || user.source !== 'employee') {
    return null;
  }

  return (
    <>
      <NotificationBell />
      <NotificationPanel />
    </>
  );
};

export default NotificationContainer;
