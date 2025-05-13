import "./App.css";
import Dashboard from "./Pages/Dashboard/Dashboard";
import Login from "./Pages/Login/Login";
import OrderDetails from "./Pages/OrderDetails/OrderDetails";
import ProductDetails from "./Pages/ProductDetails/ProductDetails";
import CustomerDetails from "./Pages/CustomerDetails/CustomerDetails";
import SupplierDetails from "./Pages/SupplierDetails/SupplierDetails";
import UserDetails from "./Pages/UserDetails/UserDetails";
import Inventory from "./Pages/Inventory/Inventory";
import UserManagement from "./Pages/UserManagement/UserManagement";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./Pages/Register/Register";
import OrderHistory from "./Pages/OrderHistory/OrderHistory";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/product-details" element={<ProductDetails />} />
        <Route path="/product-details/:sku" element={<ProductDetails />} />
        <Route path="/order-details" element={<OrderDetails />} />
        <Route path="/customer-details" element={<CustomerDetails />} /> 
        <Route path="/supplier-details" element={<SupplierDetails />} />
        <Route path="/register" element={<Register />} />
        <Route path="/user-details" element={<UserDetails />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/orders" element={<OrderDetails />} />
        <Route path="/orders/:orderId" element={<OrderDetails />} />
        <Route path="/order-history" element={<OrderHistory />} />
      </Routes>
    </Router>
  );
}

export default App;
