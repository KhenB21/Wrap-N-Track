import { useNavigate } from 'react-router-dom';

const rolePermissions = {
  super_admin: { inventory: true, suppliers: true, accountManagement: true, reports: true, readOnly: false },
  admin: { inventory: true, suppliers: true, accountManagement: true, reports: true, readOnly: false },
  director: { inventory: true, suppliers: true, accountManagement: true, reports: true, readOnly: false },
  business_developer: { inventory: false, suppliers: false, accountManagement: false, reports: true, readOnly: false },
  creatives: { inventory: true, suppliers: false, accountManagement: false, reports: true, readOnly: false },
  sales_manager: { inventory: true, suppliers: true, accountManagement: false, reports: true, readOnly: false },
  assistant_sales: { inventory: true, suppliers: false, accountManagement: false, reports: true, readOnly: false },
  packer: { inventory: true, suppliers: false, accountManagement: false, reports: true, readOnly: true },
  operations_manager: { inventory: true, suppliers: true, accountManagement: false, reports: true, readOnly: false },
  social_media_manager: { inventory: false, suppliers: false, accountManagement: false, reports: true, readOnly: false },
  default: { inventory: true, suppliers: true, accountManagement: false, reports: true, readOnly: false },
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

  const isReadOnly = () => {
    const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};
    return permissions.readOnly || false;
  };

  return { checkPermission, isReadOnly };
};

export default usePermissions;
