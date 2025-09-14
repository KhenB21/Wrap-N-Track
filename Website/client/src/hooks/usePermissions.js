import { useNavigate } from 'react-router-dom';

const rolePermissions = {
  super_admin: { inventory: true, suppliers: true, accountManagement: true, reports: true },
  admin: { inventory: true, suppliers: true, accountManagement: true, reports: true },
  operations_manager: { inventory: true, suppliers: true, accountManagement: false, reports: true },
  sales_manager: { inventory: true, suppliers: true, accountManagement: false, reports: true },
  social_media_manager: { inventory: false, suppliers: false, accountManagement: false, reports: true },
  default: { inventory: true, suppliers: true, accountManagement: false, reports: true },
};

const usePermissions = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const role = user ? user.role : null;

  const checkPermission = (page) => {
    const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};
    const hasPermission = permissions[page] || false;
    
    if (!hasPermission) {
      navigate('/'); // Redirect to dashboard if no permission
      return false;
    }
    
    return true;
  };

  return { checkPermission };
};

export default usePermissions;
