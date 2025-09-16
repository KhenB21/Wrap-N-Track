import "./App.css";
import Dashboard from "./Pages/Dashboard/Dashboard";
import Login from "./Pages/Login/Login";
import OrderDetails from "./Pages/OrderDetails/OrderDetails";
import ProductDetails from "./Pages/ProductDetails/ProductDetails";
import CustomerDetails from "./Pages/CustomerDetails/CustomerDetails";
import Customers from "./Pages/Customers/Customers";
import SupplierDetails from "./Pages/SupplierDetails/SupplierDetails";
import SupplierForm from "./Pages/SupplierDetails/SupplierForm";
import UserDetails from "./Pages/UserDetails/UserDetails";
import Inventory from "./Pages/Inventory/Inventory";
import UserManagement from "./Pages/UserManagement/UserManagement";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./Pages/Register/Register";
import OrderHistory from "./Pages/OrderHistory/OrderHistory";
import CustomerPOV from "./Pages/CustomerPOV/CustomerPOV";
import OrderProcess from "./Pages/CustomerPOV/OrderProcess";
import CarloPreview from "./Pages/CustomerPOV/CarloPreview";
import CustomerHome from "./Pages/CustomerPOV/CustomerHome";
import CustomerCorporate from "./Pages/CustomerCorporate/CustomerCorporate";

import ArchivedOrders from './Pages/ArchivedOrders/ArchivedOrders';
import InventoryReport from './Pages/InventoryReport/InventoryReport';
import SalesReport from './Pages/SalesReport/SalesReport';

import ForgotPassword from "./Pages/ForgotPassword/ForgotPassword";
import EmailVerify from "./Pages/EmailVerify/EmailVerify";
import ResetPassword from "./Pages/ResetPassword/ResetPassword";

import EricMarielPreview from "./Pages/CustomerPOV/EricMarielPreview";
import DanielPreview from "./Pages/CustomerPOV/EricMarielPreview";
import CustomerBespoke from "./Pages/CustomerBespoke";
import CustomerAboutUs from "./Pages/CustomerAboutUs.js/CustomerAboutUs";
import CustomerRegister from "./Pages/CustomerPOV/CustomerRegister";
import CustomerLogIn from "./Pages/CustomerPOV/CustomerLogIn";
import CustomerUserDetails from "./Pages/CustomerPOV/CustomerUserDetails";
import CustomerVerify from "./Pages/CustomerPOV/CustomerVerify";
import Forbidden403 from "./Pages/Forbidden403";
import { AuthProvider } from "./Context/AuthContext";

function App() {
  return (
    <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<CustomerHome />} />
        <Route path="/employee-dashboard" element={<Dashboard />} />
        <Route path="/login-employee-pensee" element={<Login />} />
        <Route path="/product-details" element={<ProductDetails />} />
        <Route path="/product-details/:sku" element={<ProductDetails />} />
        <Route path="/product/1" element={<CarloPreview />} />
        <Route path="/product/2" element={<EricMarielPreview />} />
        <Route path="/product/3" element={<DanielPreview />} />
        <Route path="/customer-home" element={<CustomerHome />} />
        
        <Route path="/archived-orders" element={<ArchivedOrders />} />
        <Route path="/customer-details" element={<CustomerDetails />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/supplier-details" element={<SupplierDetails />} />
        <Route path="/supplier-form" element={<SupplierForm />} />
        <Route path="/register" element={<Register />} />
        <Route path="/user-details" element={<UserDetails />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports/inventory" element={<InventoryReport />} />
        <Route path="/reports/sales" element={<SalesReport />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/orders" element={<OrderDetails />} />
        <Route path="/orders/:orderId" element={<OrderDetails />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/wedding" element={<CustomerPOV />} />
        <Route path="/order" element={<OrderProcess />} />
        <Route path="/corporate" element={<CustomerCorporate />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify" element={<EmailVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Add more routes as needed */}

        <Route path="/bespoke" element={<CustomerBespoke />} />
        <Route path="/about" element={<CustomerAboutUs />} />
        <Route path="/customer-register" element={<CustomerRegister />} />
        <Route path="/customer-login" element={<CustomerLogIn />} />
        <Route path="/customer-user-details" element={<CustomerUserDetails />} />
        <Route path="/customer/verify" element={<CustomerVerify />} />
  <Route path="/403" element={<Forbidden403 />} />

      </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;
