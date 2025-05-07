import "./App.css";
import Dashboard from "./Pages/Dashboard/Dashboard";
import Login from "./Pages/Login/Login";
import OrderDetails from "./Pages/OrderDetails/OrderDetails";
import ProductDetails from "./Pages/ProductDetails/ProductDetails";
import CustomerDetails from "./Pages/CustomerDetails/CustomerDetails";
import SupplierDetails from "./Pages/SupplierDetails/SupplierDetails";
import UserDetails from "./Pages/UserDetails/UserDetails";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./Pages/Register/Register";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/product-details" element={<ProductDetails />} />
        <Route path="/order-details" element={<OrderDetails />} />
        <Route path="/customer-details" element={<CustomerDetails />} /> 
        <Route path="/supplier-details" element={<SupplierDetails />} />
        <Route path="/register" element={<Register />} />
        <Route path="/user-details" element={<UserDetails />} />

      </Routes>
    </Router>
  );
}

export default App;
