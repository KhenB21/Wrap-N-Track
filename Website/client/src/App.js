import "./App.css";
import "./styles/design-system.css";
import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import { ThemeProvider } from "./Context/ThemeContext";
import { MobileNavProvider } from "./Context/MobileNavContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { CartProvider } from "./Context/CartContext";
import { ConfirmProvider } from "./Context/ConfirmContext";

// Route-level code splitting: each page loads on demand instead of all being
// bundled into one initial JS payload. Keeps heavy, rarely-visited pages
// (report generation with xlsx/jspdf, barcode printing with bwip-js, employee
// dashboards) out of the bundle a customer downloads just to view the home page.
const Dashboard = lazy(() => import("./Pages/Dashboard/Dashboard"));
const Login = lazy(() => import("./Pages/Login/Login"));
const OrderDetails = lazy(() => import("./Pages/OrderDetails/OrderDetails"));
const ProductDetails = lazy(() => import("./Pages/ProductDetails/ProductDetails"));
const CustomerDetails = lazy(() => import("./Pages/CustomerDetails/CustomerDetails"));
const Customers = lazy(() => import("./Pages/Customers/Customers"));
const SupplierDetails = lazy(() => import("./Pages/SupplierDetails/SupplierDetails"));
const SupplierForm = lazy(() => import("./Pages/SupplierDetails/SupplierForm"));
const UserDetails = lazy(() => import("./Pages/UserDetails/UserDetails"));
const Inventory = lazy(() => import("./Pages/Inventory/Inventory"));
const Invoices = lazy(() => import("./Pages/Invoices/Invoices"));
const DeliveryTracking = lazy(() => import("./Pages/DeliveryTracking/DeliveryTracking"));
const UserManagement = lazy(() => import("./Pages/UserManagement/UserManagement"));
const AccountManagement = lazy(() => import("./Pages/AccountManagement/AccountManagement"));
const Register = lazy(() => import("./Pages/Register/Register"));
const OrderHistory = lazy(() => import("./Pages/OrderHistory/OrderHistory"));
const OrderProcess = lazy(() => import("./Pages/CustomerPOV/OrderProcess"));
const CarloPreview = lazy(() => import("./Pages/CustomerPOV/CarloPreview"));
const CustomerHome = lazy(() => import("./Pages/CustomerPOV/CustomerHome"));
const CustomerPOV = lazy(() => import("./Pages/CustomerPOV/CustomerPOV"));
const CustomerCorporate = lazy(() => import("./Pages/CustomerCorporate/CustomerCorporate"));
const MobileChatbotEmbed = lazy(() => import("./Pages/MobileChatbotEmbed/MobileChatbotEmbed"));

const ArchivedOrders = lazy(() => import('./Pages/ArchivedOrders/ArchivedOrders'));
const ArchiveProducts = lazy(() => import('./Pages/ArchiveProducts/ArchiveProducts'));
const InventoryReport = lazy(() => import('./Pages/InventoryReport/InventoryReport'));
const SalesReport = lazy(() => import('./Pages/SalesReport/SalesReport'));
const BusinessReport = lazy(() => import('./Pages/BusinessReport/BusinessReport'));

const ForgotPassword = lazy(() => import("./Pages/ForgotPassword/ForgotPassword"));
const EmailVerify = lazy(() => import("./Pages/EmailVerify/EmailVerify"));
const ResetPassword = lazy(() => import("./Pages/ResetPassword/ResetPassword"));

const EricMarielPreview = lazy(() => import("./Pages/CustomerPOV/EricMarielPreview"));
const DanielPreview = lazy(() => import("./Pages/CustomerPOV/EricMarielPreview"));
const CustomerBespoke = lazy(() => import("./Pages/CustomerBespoke"));
const CustomerAboutUs = lazy(() => import("./Pages/CustomerAboutUs.js/CustomerAboutUs"));
const BundleDetails = lazy(() => import("./Pages/CustomerPOV/BundleDetails"));
const ShowcaseGallery = lazy(() => import("./Pages/ShowcaseGallery/ShowcaseGallery"));
const CustomerRegister = lazy(() => import("./Pages/CustomerPOV/CustomerRegister"));
const CustomerLogIn = lazy(() => import("./Pages/CustomerPOV/CustomerLogIn"));
const CustomerUserDetails = lazy(() => import("./Pages/CustomerPOV/CustomerUserDetails"));
const CustomerVerify = lazy(() => import("./Pages/CustomerPOV/CustomerVerify"));
const Forbidden403 = lazy(() => import("./Pages/Forbidden403"));
const CustomerCart = lazy(() => import("./Pages/CustomerPOV/CustomerCart"));
const CustomerCartWithOrders = lazy(() => import("./Pages/CustomerPOV/CustomerCartWithOrders"));
const CustomerOrders = lazy(() => import("./Pages/CustomerPOV/CustomerOrders"));
const OrderManagementDashboard = lazy(() => import("./Pages/OrderManagement/OrderManagementDashboard"));
const UnauthorizedAccess = lazy(() => import("./Pages/UnauthorizedAccess"));
const NotFound404 = lazy(() => import("./Pages/NotFound404"));
const SecurityTest = lazy(() => import("./Components/SecurityTest"));
const NotFoundTest = lazy(() => import("./Components/NotFoundTest"));
const KhenTestDataGenerator = lazy(() => import("./Components/KhenTestDataGenerator"));

function RouteFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
      Loading…
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <NotificationProvider>
    <CartProvider>
    <ConfirmProvider>
    <Router>
      <MobileNavProvider>
      <Suspense fallback={<RouteFallback />}>
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
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/delivery-tracking" element={<DeliveryTracking />} />
        <Route path="/archive-products" element={<ArchiveProducts />} />
        <Route path="/reports/inventory" element={<InventoryReport />} />
        <Route path="/reports/sales" element={<SalesReport />} />
        <Route path="/reports/business" element={<BusinessReport />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/account-management" element={<AccountManagement />} />
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
        <Route path="/mobile-chatbot" element={<MobileChatbotEmbed />} />
        <Route path="/showcase/:id" element={<BundleDetails />} />
        <Route path="/showcase-gallery" element={<ShowcaseGallery />} />
        <Route path="/customer-register" element={<CustomerRegister />} />
        <Route path="/customer-login" element={<CustomerLogIn />} />
        <Route path="/customer-user-details" element={<CustomerUserDetails />} />
        <Route path="/customer/verify" element={<CustomerVerify />} />
        <Route path="/customer-cart" element={<CustomerCartWithOrders />} />
        <Route path="/customer-cart-old" element={<CustomerCart />} />
        <Route path="/customer-orders" element={<CustomerOrders />} />
        <Route path="/order-management" element={<OrderManagementDashboard />} />
        <Route path="/unauthorized" element={<UnauthorizedAccess />} />
        <Route path="/404" element={<NotFound404 />} />
        <Route path="/security-test" element={<SecurityTest />} />
        <Route path="/404-test" element={<NotFoundTest />} />
        <Route path="/khen-test" element={<KhenTestDataGenerator />} />
        <Route path="/403" element={<Forbidden403 />} />

        {/* Catch-all route for 404 - must be last */}
        <Route path="*" element={<NotFound404 />} />

      </Routes>
      </Suspense>
      </MobileNavProvider>
    </Router>
    </ConfirmProvider>
    </CartProvider>
    </NotificationProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
