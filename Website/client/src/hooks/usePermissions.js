import { useNavigate } from 'react-router-dom';

const rolePermissions = {
  super_admin: { inventory: true, suppliers: true, accountManagement: true },
  admin: { inventory: true, suppliers: true, accountManagement: true },
  operations_manager: { inventory: true, suppliers: true, accountManagement: false },
  sales_manager: { inventory: true, suppliers: true, accountManagement: false },
  social_media_manager: { inventory: false, suppliers: false, accountManagement: false },
  default: { inventory: true, suppliers: true, accountManagement: false },
};

const usePermissions = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const role = user ? user.role : null;

  const checkPermission = (page) => {
    const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};
    if (!permissions[page]) {
      navigate('/'); // Redirect to dashboard if no permission
      return false;
    }
    return true;
  };

  return { checkPermission };
};

export default usePermissions;
