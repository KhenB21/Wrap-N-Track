import { useNavigate } from 'react-router-dom';
import { canAdjustStockRole } from '../constants/stockReasons';

const rolePermissions = {
  super_admin: { inventory: true, invoices: true, deliveryTracking: true, suppliers: true, accountManagement: true, reports: true, readOnly: false },
  admin: { inventory: true, invoices: true, deliveryTracking: true, suppliers: true, accountManagement: true, reports: true, readOnly: false },
  business_developer: { inventory: false, suppliers: true, accountManagement: false, reports: true, readOnly: false },
  creatives: { inventory: true, suppliers: false, accountManagement: false, reports: false, readOnly: true },
  sales_manager: { inventory: true, invoices: true, deliveryTracking: true, suppliers: true, accountManagement: false, reports: true, readOnly: false },
  assistant_sales: { inventory: true, suppliers: true, accountManagement: false, reports: true, readOnly: false },
  packer: { inventory: true, invoices: false, deliveryTracking: false, suppliers: false, accountManagement: false, reports: false, readOnly: true },
  operations_manager: { inventory: true, invoices: true, deliveryTracking: true, suppliers: true, accountManagement: false, reports: true, readOnly: false },
  social_media_manager: { inventory: false, deliveryTracking: true, suppliers: false, accountManagement: false, reports: true, readOnly: false },
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
      // Packers are inventory-only; send them back to inventory instead of the dashboard.
      navigate(role === 'packer' ? '/inventory' : '/');
      return false;
    }
    
    return true;
  };

  // Test-data insert/clear mutate real inventory and order rows. Mirrors the
  // server-side guard in middleware/requireTestDataAccess.js -- this only hides the
  // buttons; the server is what actually enforces it.
  const canUseTestData = () =>
    process.env.NODE_ENV !== 'production' && (role === 'admin' || role === 'super_admin');

  const isReadOnly = () => {
    const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};
    return permissions.readOnly || false;
  };

  // Stock In / Stock Out buttons. The server (requireStockAdjust) enforces the same list.
  const canAdjustStock = () => canAdjustStockRole(role);

  return { checkPermission, isReadOnly, canUseTestData, canAdjustStock, role };
};

export default usePermissions;
