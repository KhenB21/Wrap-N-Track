import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./OrderDetails.css";
import axios from "axios";
import { FaEdit, FaTrash, FaCheckCircle } from "react-icons/fa";
import { defaultProductNames } from "../CustomerPOV/CarloPreview.js";

// Add these styles at the top of the file
const styles = {
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    background: "#fff",
    borderBottom: "1px solid #eee",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  button: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  primaryButton: {
    background: "#4a90e2",
    color: "#fff",
    "&:hover": {
      background: "#357abd",
    },
  },
  secondaryButton: {
    background: "#f5f5f5",
    color: "#333",
    "&:hover": {
      background: "#e8e8e8",
    },
  },
  columnsContainer: {
    display: "flex",
    gap: "24px",
    padding: "24px",
    height: "calc(100vh - 180px)",
    background: "#f8f9fa",
  },
  column: {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
  },
  columnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "2px solid #f0f0f0",
  },
  columnTitle: {
    margin: 0,
    color: "#2c3e50",
    fontSize: "18px",
    fontWeight: 600,
  },
  orderCount: {
    background: "#e9ecef",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    color: "#495057",
    fontWeight: 500,
  },
  orderList: {
    overflowY: "auto",
    height: "calc(100% - 40px)",
    paddingRight: "8px",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#f1f1f1",
      borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#c1c1c1",
      borderRadius: "3px",
    },
  },
  orderCard: {
    background: "#fff",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      borderColor: "#4a90e2",
    },
  },
  orderName: {
    fontWeight: 600,
    color: "#2c3e50",
    marginBottom: "4px",
  },
  orderInfo: {
    color: "#6c757d",
    fontSize: "13px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: "32px",
    borderRadius: "12px",
    minWidth: "800px",
    maxWidth: "900px",
    width: "90vw",
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  },
  modalHeader: {
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "2px solid #f0f0f0",
  },
  modalTitle: {
    margin: 0,
    color: "#2c3e50",
    fontSize: "24px",
    fontWeight: 600,
  },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
    display: "inline-block",
  },
};

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/png;base64,${user.profile_picture_data}`;
  }
  if (user.profile_picture_path) {
    if (user.profile_picture_path.startsWith("http"))
      return user.profile_picture_path;
    return `http://localhost:3001${user.profile_picture_path}`;
  }
  return "/placeholder-profile.png";
}

function generateOrderId() {
  // Example: #CO + timestamp + random 3 digits
  const now = Date.now();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `#CO${now}${rand}`;
}

export default function OrderDetails() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [form, setForm] = useState({
    order_id: "",
    name: "",
    shipped_to: "",
    order_date: "",
    expected_delivery: "",
    status: "",
    shipping_address: "",
    total_cost: "0.00",
    payment_type: "",
    payment_method: "",
    account_name: "",
    remarks: "",
    telephone: "",
    cellphone: "",
    email_address: "",
    package_name: "",
    carlo_products: [],
    order_quantity: 0,
    approximate_budget: 0.0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = orders.find((o) => o.order_id === selectedOrderId);
  const [showProductModal, setShowProductModal] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [carloProducts, setCarloProducts] = useState([]);
  const [orderProducts, setOrderProducts] = useState([]);
  const [productSelection, setProductSelection] = useState({}); // { sku: quantity }
  const [profitMargins, setProfitMargins] = useState({}); // { sku: margin }
  const [placingOrder, setPlacingOrder] = useState(false);
  const [productError, setProductError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [archivingOrder, setArchivingOrder] = useState(false);
  const [showEditProductsModal, setShowEditProductsModal] = useState(false);

  // Delete order: confirm and delete
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    try {
      const response = await axios.delete(
        `http://localhost:3001/api/orders/${selectedOrder.order_id}`
      );
      if (response.data.success) {
        setShowDeleteConfirm(false);
        setSelectedOrderId(null); // Close the order details modal
        fetchOrders();
      } else {
        alert("Failed to delete order: " + response.data.message);
      }
    } catch (err) {
      console.error("Delete order error:", err);
      alert(
        "Failed to delete order: " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  // Mark as Completed/Cancelled and Archive
  const handleMarkCompleted = async () => {
    if (!selectedOrder) return;
    setShowCompleteConfirm(true);
    setSelectedOrderId(null); // Close the order details modal
  };

  const [editingProducts, setEditingProducts] = useState({}); // { sku: quantity }
  const [editingProductsError, setEditingProductsError] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState(false);
  const [productDetailsByName, setProductDetailsByName] = useState({}); // { name: { image_data, name } }
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [orderStockIssues, setOrderStockIssues] = useState({}); // { order_id: [product names] }

  const fetchOrders = async () => {
    try {
      const response = await axios.get("http://localhost:3001/api/orders");
      setOrders(response.data);
      console.log("Orders fetched successfully:", response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchOrderProducts = async (orderId) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/orders/${orderId}/products`
      );
      setOrderProducts(response.data);
      console.log("Order products fetched successfully:", response.data);
    } catch (error) {
      console.error("Error fetching order products:", error);
      setOrderProducts([]); // Reset products on error
    }
  };

  // Initialize orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch order products when an order is selected
  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderProducts(selectedOrderId);
    }
  }, [selectedOrderId]);

  // Handle Carlo products when an order is selected
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find((o) => o.order_id === selectedOrderId);
      if (selectedOrder && selectedOrder.package_name === "Carlo") {
        axios
          .get("http://localhost:3001/api/inventory")
          .then((res) => {
            const inventoryItems = res.data;
            const matchedProducts = defaultProductNames.map((name) => {
              const matchingItem = inventoryItems.find(
                (item) =>
                  item.name.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(item.name.toLowerCase())
              );

              return matchingItem
                ? {
                    name: matchingItem.name,
                    image_data: matchingItem.image_data,
                    quantity: selectedOrder.order_quantity,
                    sku: matchingItem.sku,
                  }
                : {
                    name: name,
                    quantity: selectedOrder.order_quantity,
                  };
            });
            setCarloProducts(matchedProducts);
          })
          .catch((err) => {
            console.error("Failed to fetch inventory:", err);
            setCarloProducts(
              defaultProductNames.map((name) => ({
                name: name,
                quantity: selectedOrder.order_quantity,
              }))
            );
          });
      } else {
        setCarloProducts([]);
      }
    }
  }, [selectedOrderId, orders]);

  useEffect(() => {
    console.log(
      "Checking structure of orderProducts after API fetch:",
      JSON.stringify(orderProducts, null, 2)
    );
  }, [orderProducts]);

  // Fetch stock issues for all orders after fetching orders
  useEffect(() => {
    async function fetchStockIssues() {
      if (!orders.length) return;
      const issues = {};
      for (const order of orders) {
        // Try to get stock_issue_products from backend (if available)
        // For demo, assume backend returns this in the order object (if not, skip)
        if (
          order.stock_issue_products &&
          order.stock_issue_products.length > 0
        ) {
          issues[order.order_id] = order.stock_issue_products;
        }
      }
      setOrderStockIssues(issues);
    }
    fetchStockIssues();
  }, [orders]);

  const handleAddProductToOrder = async () => {
    setProductError("");
    setPlacingOrder(true);
    const products = Object.entries(productSelection)
      .filter(([sku, qty]) => Number(qty) > 0)
      .map(([sku, quantity]) => ({ sku, quantity: Number(quantity) }));
    if (!products.length) {
      setProductError("Select at least one product and quantity.");
      setPlacingOrder(false);
      return;
    }
    try {
      await axios.post(
        `http://localhost:3001/api/orders/${selectedOrderId}/products`,
        { products }
      );
      setShowProductModal(false);
      setProductSelection({});
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      setProductError(err?.response?.data?.message || "Failed to add products");
    }
    setPlacingOrder(false);
  };

  const openProductModal = async () => {
    setProductError("");
    setProductSelection({});
    try {
      const res = await axios.get("http://localhost:3001/api/inventory");
      setInventory(res.data);
      setShowProductModal(true);
    } catch (err) {
      alert("Failed to fetch inventory");
    }
  };

  const handleAddOrder = async () => {
    setForm({
      order_id: generateOrderId(), // Generate order ID automatically
      name: "",
      shipped_to: "",
      order_date: "",
      expected_delivery: "",
      status: "",
      shipping_address: "",
      total_cost: "0.00",
      payment_type: "",
      payment_method: "",
      account_name: "",
      remarks: "",
      telephone: "",
      cellphone: "",
      email_address: "",
    });
    setProductSelection({});
    setProfitMargins({});
    setProductError("");
    try {
      const res = await axios.get("http://localhost:3001/api/inventory");
      setInventory(res.data);
      setShowModal(true);
    } catch (err) {
      alert("Failed to fetch inventory");
    }
  };

  const calculateTotalCost = (selection) => {
    return inventory
      .reduce((total, item) => {
        const quantity = Number(selection[item.sku] || 0);
        const unitPrice = Number(item.unit_price || 0);
        return total + unitPrice * quantity;
      }, 0)
      .toFixed(2);
  };

  const handleProductSelection = (sku, value) => {
    // Find the inventory item to ensure we're using the correct SKU
    const inventoryItem = inventory.find((item) => item.sku === sku);
    if (!inventoryItem) {
      console.error(`No inventory item found for SKU: ${sku}`);
      return;
    }

    const newSelection = { ...productSelection, [inventoryItem.sku]: value };
    setProductSelection(newSelection);
    setForm((prev) => ({
      ...prev,
      total_cost: calculateTotalCost(newSelection),
    }));
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setProductError("");
    setPlacingOrder(true);

    try {
      // Get the token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to create an order");
        return;
      }

      // Filter products that have both quantity and profit margin
      const selectedProducts = Object.entries(productSelection)
        .filter(([sku, qty]) => {
          const quantity = Number(qty);
          const margin = Number(profitMargins[sku] || 0);
          // For Custom orders, require both quantity and profit margin
          if (form.package_name === "Custom") {
            return quantity > 0 && margin > 0;
          }
          // For other orders, only require quantity
          return quantity > 0;
        })
        .map(([sku, quantity]) => {
          const inventoryItem = inventory.find((item) => item.sku === sku);
          return {
            sku,
            name: inventoryItem?.name || "",
            quantity: Number(quantity),
            profit_margin:
              form.package_name === "Custom" ? Number(profitMargins[sku]) : 0,
          };
        });

      if (selectedProducts.length === 0) {
        if (form.package_name === "Custom") {
          setProductError(
            "Please select at least one product with quantity and profit margin"
          );
        } else {
          setProductError("Please select at least one product with quantity");
        }
        setPlacingOrder(false);
        return;
      }

      // Create order with products in a single request
      const orderData = {
        ...form,
        // Remove order_id to let backend generate it
        order_id: undefined,
        products: selectedProducts,
        total_cost: calculateTotalCost(productSelection),
      };

      console.log("Submitting order data:", orderData);

      const response = await axios.post(
        "http://localhost:3001/api/orders",
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        // If the order is not in Pending status, adjust inventory
        if (form.status !== "Pending") {
          console.log("Adjusting inventory for new non-pending order");
          for (const product of selectedProducts) {
            try {
              const adjustResponse = await axios.put(
                `http://localhost:3001/api/inventory/${product.sku}/adjust`,
                {
                  quantity: product.quantity,
                  operation: "subtract",
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              console.log(
                `Successfully deducted ${product.quantity} units of ${product.sku} from inventory:`,
                adjustResponse.data
              );
            } catch (adjustError) {
              console.error(
                `Failed to adjust inventory for product ${product.sku}:`,
                adjustError.response?.data || adjustError
              );
              throw new Error(
                `Failed to deduct inventory for ${product.name}: ${
                  adjustError.response?.data?.message || adjustError.message
                }`
              );
            }
          }
        }

        setShowModal(false);
        setProductSelection({});
        setProfitMargins({});
        fetchOrders(); // Refresh the orders list
      } else {
        setProductError(response.data.message || "Failed to create order");
      }
    } catch (err) {
      console.error("Order submission error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create order";
      setProductError(errorMessage);
      console.error("Detailed error:", {
        message: errorMessage,
        response: err.response?.data,
        status: err.response?.status,
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  // Edit order: open modal with selected order's data
  const handleEditOrder = async () => {
    if (!selectedOrder) return;

    try {
      // Fetch the latest order products for this specific order
      const productsResponse = await axios.get(
        `http://localhost:3001/api/orders/${selectedOrder.order_id}/products`
      );
      const orderProducts = productsResponse.data;
      console.log(
        "Fetched products for order",
        selectedOrder.order_id,
        ":",
        orderProducts
      );

      // Initialize product selection and profit margins with current order's values
      const initialProductSelection = {};
      const initialProfitMargins = {};

      // Use products from the selected order if available, otherwise use the fetched products
      const productsToUse = selectedOrder.products || orderProducts;

      // Map products using their actual SKUs from inventory
      for (const product of productsToUse) {
        // Find the inventory item by name first
        const inventoryItem = inventory.find(
          (item) =>
            item.name.toLowerCase() === product.name.toLowerCase() ||
            item.name.toLowerCase().includes(product.name.toLowerCase()) ||
            product.name.toLowerCase().includes(item.name.toLowerCase())
        );

        if (inventoryItem) {
          initialProductSelection[inventoryItem.sku] = product.quantity;
          initialProfitMargins[inventoryItem.sku] = product.profit_margin;
        }
      }

      console.log("Initial product selection:", initialProductSelection);
      console.log("Initial profit margins:", initialProfitMargins);

      setProductSelection(initialProductSelection);
      setProfitMargins(initialProfitMargins);

      // Preserve the dates in the correct format and set all form fields
      const orderData = {
        ...selectedOrder,
        order_date: selectedOrder.order_date
          ? selectedOrder.order_date.split("T")[0]
          : "",
        expected_delivery: selectedOrder.expected_delivery
          ? selectedOrder.expected_delivery.split("T")[0]
          : "",
        items: productsToUse.map((product) => {
          const inventoryItem = inventory.find(
            (item) =>
              item.name.toLowerCase() === product.name.toLowerCase() ||
              item.name.toLowerCase().includes(product.name.toLowerCase()) ||
              product.name.toLowerCase().includes(item.name.toLowerCase())
          );
          return {
            sku: inventoryItem ? inventoryItem.sku : product.sku,
            quantity: Number(product.quantity) || 0,
            profit_margin: Number(product.profit_margin) || 0,
            unit_price: Number(product.unit_price) || 0,
          };
        }),
      };

      console.log("Setting form data for editing:", orderData);
      setForm(orderData);
      setShowEditModal(true);
      setSelectedOrderId(null); // Close the order details modal
    } catch (error) {
      console.error("Error fetching order products for editing:", error);
      // If we can't fetch products, still allow editing with the data we have
      const orderData = {
        ...selectedOrder,
        order_date: selectedOrder.order_date
          ? selectedOrder.order_date.split("T")[0]
          : "",
        expected_delivery: selectedOrder.expected_delivery
          ? selectedOrder.expected_delivery.split("T")[0]
          : "",
        items: selectedOrder.products
          ? selectedOrder.products.map((product) => {
              const inventoryItem = inventory.find(
                (item) =>
                  item.name.toLowerCase() === product.name.toLowerCase() ||
                  item.name
                    .toLowerCase()
                    .includes(product.name.toLowerCase()) ||
                  product.name.toLowerCase().includes(item.name.toLowerCase())
              );
              return {
                sku: inventoryItem ? inventoryItem.sku : product.sku,
                quantity: Number(product.quantity) || 0,
                profit_margin: Number(product.profit_margin) || 0,
                unit_price: Number(product.unit_price) || 0,
              };
            })
          : [],
      };
      setForm(orderData);
      setShowEditModal(true);
      setSelectedOrderId(null);
    }
  };

  // Save edited order
  const handleEditOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to complete this action");
        return;
      }

      console.log("Current productSelection:", productSelection);
      console.log("Current profitMargins:", profitMargins);

      // Filter and map products with proper validation
      const selectedProducts = Object.entries(productSelection)
        .filter(([sku, qty]) => {
          const quantity = Number(qty);
          const isValid =
            sku && sku.trim() !== "" && !isNaN(quantity) && quantity > 0;
          if (!isValid) {
            console.log(
              `Filtering out invalid product - SKU: ${sku}, Quantity: ${qty}`
            );
          }
          return isValid;
        })
        .map(([sku, quantity]) => {
          const inventoryItem = inventory.find((item) => item.sku === sku);
          if (!inventoryItem) {
            console.error(`No inventory item found for SKU: ${sku}`);
            return null;
          }

          return {
            sku: inventoryItem.sku,
            name: inventoryItem.name,
            quantity: Number(quantity),
            profit_margin: Number(profitMargins[sku] || 0),
            unit_price: Number(inventoryItem.unit_price || 0),
          };
        })
        .filter((product) => product !== null);

      console.log("Final selected products:", selectedProducts);

      if (selectedProducts.length === 0) {
        alert("Please select at least one product with a valid quantity");
        return;
      }

      const calculatedTotalCost = selectedProducts.reduce((total, product) => {
        return total + product.unit_price * product.quantity;
      }, 0);

      const orderData = {
        order_id: form.order_id,
        name: form.name,
        shipped_to: form.shipped_to,
        order_date: form.order_date,
        expected_delivery: form.expected_delivery,
        status: form.status,
        shipping_address: form.shipping_address,
        total_cost: calculatedTotalCost.toString(),
        payment_type: form.payment_type,
        payment_method: form.payment_method,
        account_name: form.account_name,
        remarks: form.remarks,
        telephone: form.telephone,
        cellphone: form.cellphone,
        email_address: form.email_address,
        package_name: form.package_name,
        order_quantity: selectedProducts.reduce(
          (total, p) => total + p.quantity,
          0
        ),
        items: selectedProducts,
      };

      console.log("Final order data being sent:", orderData);

      // If status is changing, handle inventory adjustments
      if (selectedOrder && selectedOrder.status !== form.status) {
        console.log(
          "Status is changing from",
          selectedOrder.status,
          "to",
          form.status
        );

        // Handle inventory adjustments based on status change
        if (form.status === "Cancelled") {
          console.log("Returning quantities to inventory for cancelled order");
          // Return quantities to inventory for cancelled orders
          for (const product of selectedProducts) {
            try {
              const adjustResponse = await axios.put(
                `http://localhost:3001/api/inventory/${product.sku}/adjust`,
                {
                  quantity: product.quantity,
                  operation: "add",
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              console.log(
                `Successfully returned ${product.quantity} units of ${product.sku} to inventory:`,
                adjustResponse.data
              );
            } catch (adjustError) {
              console.error(
                `Failed to adjust inventory for product ${product.sku}:`,
                adjustError.response?.data || adjustError
              );
              throw new Error(
                `Failed to return inventory for ${product.name}: ${
                  adjustError.response?.data?.message || adjustError.message
                }`
              );
            }
          }
        } else if (form.status !== "Pending") {
          // If changing to a non-pending status, check if we need to deduct inventory
          if (selectedOrder.status === "Pending") {
            console.log(
              "Deducting quantities from inventory for new non-pending order"
            );
            // Deduct quantities from inventory for new non-pending orders
            for (const product of selectedProducts) {
              try {
                const adjustResponse = await axios.put(
                  `http://localhost:3001/api/inventory/${product.sku}/adjust`,
                  {
                    quantity: product.quantity,
                    operation: "subtract",
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                console.log(
                  `Successfully deducted ${product.quantity} units of ${product.sku} from inventory:`,
                  adjustResponse.data
                );
              } catch (adjustError) {
                console.error(
                  `Failed to adjust inventory for product ${product.sku}:`,
                  adjustError.response?.data || adjustError
                );
                throw new Error(
                  `Failed to deduct inventory for ${product.name}: ${
                    adjustError.response?.data?.message || adjustError.message
                  }`
                );
              }
            }
          }
        }
      }

      // Update the order
      const response = await axios.put(
        `http://localhost:3001/api/orders/${encodeURIComponent(form.order_id)}`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Only archive if the order is being marked as completed or cancelled for the first time
        if (
          (form.status === "Completed" || form.status === "Cancelled") &&
          selectedOrder?.status !== "Completed" &&
          selectedOrder?.status !== "Cancelled"
        ) {
          try {
            // Add a small delay to ensure the update is processed
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Archive the order
            await axios.post(
              `http://localhost:3001/api/orders/${encodeURIComponent(
                form.order_id
              )}/archive`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );
          } catch (archiveErr) {
            console.error("Error archiving order:", archiveErr);
            alert(
              "Order status was updated but failed to archive: " +
                (archiveErr.response?.data?.message || archiveErr.message)
            );
          }
        }
        setShowEditModal(false);
        fetchOrders();
      } else {
        throw new Error(response.data.message || "Failed to update order");
      }
    } catch (err) {
      console.error("Update order error:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
        if (err.response.status === 401) {
          alert("Your session has expired. Please log in again.");
          // Clear the invalid token
          localStorage.removeItem("token");
          // Optionally redirect to login page
          window.location.href = "/login";
        } else {
          alert(
            "Failed to update order: " +
              (err.response.data.message || err.message)
          );
        }
      } else {
        alert("Failed to update order: " + err.message);
      }
    }
  };

  const handleCompleteConfirm = async () => {
    if (!selectedOrder) return;
    try {
      // Get the token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to complete this action");
        return;
      }

      // First check if we have enough stock for all products
      const insufficientStock = [];
      for (const product of orderProducts) {
        const inventoryItem = inventory.find((i) => i.sku === product.sku);
        if (inventoryItem && inventoryItem.quantity < product.quantity) {
          insufficientStock.push(product.name);
        }
      }

      if (insufficientStock.length > 0) {
        setOrderStockIssues((prev) => ({
          ...prev,
          [selectedOrder.order_id]: insufficientStock,
        }));
        throw new Error(
          `Not enough stock for: ${insufficientStock.join(", ")}`
        );
      }

      // First mark as completed
      await axios.put(
        `http://localhost:3001/api/orders/${selectedOrder.order_id}`,
        { ...selectedOrder, status: "Completed" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Deduct quantities from inventory
      for (const product of orderProducts) {
        await axios.put(
          `http://localhost:3001/api/inventory/${product.sku}/adjust`,
          {
            quantity: product.quantity,
            operation: "subtract",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Then archive the order
      setArchivingOrder(true);
      try {
        await axios.post(
          `http://localhost:3001/api/orders/${selectedOrder.order_id}/archive`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setShowCompleteConfirm(false);
        setSelectedOrderId(null);
        fetchOrders();
      } catch (archiveErr) {
        console.error("Error archiving order:", archiveErr);
        alert(
          "Failed to archive order: " +
            (archiveErr.response?.data?.message || archiveErr.message)
        );
      }
    } catch (err) {
      console.error("Error completing order:", err);
      alert(
        "Failed to complete order: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setArchivingOrder(false);
    }
  };

  const handleEditProducts = () => {
    if (!selectedOrder) return;
    // Initialize editing products with current quantities
    const initialQuantities = {};
    orderProducts.forEach((p) => {
      initialQuantities[p.sku] = p.quantity;
    });
    setEditingProducts(initialQuantities);
    setShowEditProductsModal(true);
  };

  const handleUpdateProducts = async () => {
    setEditingProductsError("");
    setUpdatingProducts(true);
    try {
      const products = Object.entries(editingProducts)
        .filter(([sku, qty]) => Number(qty) > 0)
        .map(([sku, quantity]) => ({ sku, quantity: Number(quantity) }));

      await axios.put(
        `http://localhost:3001/api/orders/${selectedOrderId}/products`,
        { products }
      );
      setShowEditProductsModal(false);
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      setEditingProductsError(
        err?.response?.data?.message || "Failed to update products"
      );
    }
    setUpdatingProducts(false);
  };

  const handleRemoveProduct = async (sku) => {
    if (!selectedOrder) return;
    try {
      await axios.delete(
        `http://localhost:3001/api/orders/${selectedOrderId}/products/${sku}`
      );
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      alert("Failed to remove product");
    }
  };

  // Filter orders by status with proper mapping
  const pendingOrders = orders.filter((order) => order.status === "Pending");
  const toBePackOrders = orders.filter(
    (order) =>
      order.status === "To be pack" ||
      !["Pending", "Ready to ship", "En Route", "Completed"].includes(
        order.status
      )
  );
  const readyToDeliverOrders = orders.filter(
    (order) => order.status === "Ready to ship"
  );
  const enRouteOrders = orders.filter((order) => order.status === "En Route");
  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );

  // Update the product selection in the edit modal table
  const renderProductTable = () => {
    // Filter products based on package name
    const filteredInventory =
      form.package_name === "Carlo"
        ? inventory.filter((item) =>
            defaultProductNames.some(
              (name) =>
                item.name.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(item.name.toLowerCase())
            )
          )
        : inventory;

    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead
          style={{
            position: "sticky",
            top: 0,
            background: "#f8f8f8",
            zIndex: 1,
          }}
        >
          <tr>
            <th style={{ textAlign: "left", padding: "8px" }}>Image</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Unit Price</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Available</th>
            <th style={{ textAlign: "right", padding: "8px" }}>
              Profit Margin %
            </th>
            <th style={{ textAlign: "right", padding: "8px" }}>Est. Profit</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.map((item) => {
            const quantity = Number(productSelection[item.sku] || 0);
            const margin = Number(profitMargins[item.sku] || 0);
            const unitPrice = Number(item.unit_price || 0);
            const estimatedProfit = (
              unitPrice *
              quantity *
              (margin / 100)
            ).toFixed(2);
            return (
              <tr key={item.sku}>
                <td style={{ padding: "8px" }}>
                  {item.image_data ? (
                    <img
                      src={`data:image/jpeg;base64,${item.image_data}`}
                      alt={item.name}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: "#eee",
                        borderRadius: 6,
                      }}
                    />
                  )}
                </td>
                <td style={{ padding: "8px" }}>{item.name}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  ₱{unitPrice.toFixed(2)}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {item.quantity}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={profitMargins[item.sku] || ""}
                    onChange={(e) =>
                      setProfitMargins((pm) => ({
                        ...pm,
                        [item.sku]: e.target.value,
                      }))
                    }
                    style={{
                      width: 60,
                      padding: "4px",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                    }}
                  />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {quantity > 0 && margin > 0 ? `₱${estimatedProfit}` : "-"}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={productSelection[item.sku] || ""}
                    onChange={(e) =>
                      handleProductSelection(item.sku, e.target.value)
                    }
                    style={{
                      width: 60,
                      padding: "4px",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />

        {/* Action Bar */}
        <div style={styles.actionBar}>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleAddOrder}
            >
              Add Order
            </button>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => setShowMoreModal(true)}
            >
              More
            </button>
          </div>
        </div>

        {/* Main Order Columns */}
        <div style={styles.columnsContainer}>
          {/* Pending Orders Column */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>Pending Orders</h3>
              <span style={styles.orderCount}>{pendingOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {pendingOrders.map((order) => (
                <div
                  key={order.order_id}
                  style={styles.orderCard}
                  onClick={() => setSelectedOrderId(order.order_id)}
                >
                  <div style={styles.orderName}>{order.name}</div>
                  <div style={styles.orderInfo}>
                    <span>{order.order_id}</span>
                    <span>₱{Number(order.total_cost).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* To Be Pack Column */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>To Be Pack</h3>
              <span style={styles.orderCount}>{toBePackOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {toBePackOrders.map((order) => (
                <div
                  key={order.order_id}
                  style={styles.orderCard}
                  onClick={() => setSelectedOrderId(order.order_id)}
                >
                  <div style={styles.orderName}>{order.name}</div>
                  <div style={styles.orderInfo}>
                    <span>{order.order_id}</span>
                    <span>₱{Number(order.total_cost).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready to Deliver Column */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>Ready for Deliver</h3>
              <span style={styles.orderCount}>
                {readyToDeliverOrders.length}
              </span>
            </div>
            <div style={styles.orderList}>
              {readyToDeliverOrders.map((order) => (
                <div
                  key={order.order_id}
                  style={styles.orderCard}
                  onClick={() => setSelectedOrderId(order.order_id)}
                >
                  <div style={styles.orderName}>{order.name}</div>
                  <div style={styles.orderInfo}>
                    <span>{order.order_id}</span>
                    <span>₱{Number(order.total_cost).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* More Modal */}
        {showMoreModal && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Additional Order Statuses</h2>
              </div>

              {/* En Route Orders */}
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    marginBottom: "16px",
                    color: "#2c3e50",
                    fontSize: "18px",
                  }}
                >
                  En Route Orders
                </h3>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {enRouteOrders.map((order) => (
                    <div
                      key={order.order_id}
                      style={styles.orderCard}
                      onClick={() => {
                        setSelectedOrderId(order.order_id);
                        setShowMoreModal(false);
                      }}
                    >
                      <div style={styles.orderName}>{order.name}</div>
                      <div style={styles.orderInfo}>
                        <span>{order.order_id}</span>
                        <span>
                          ₱{Number(order.total_cost).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Orders */}
              <div>
                <h3
                  style={{
                    marginBottom: "16px",
                    color: "#2c3e50",
                    fontSize: "18px",
                  }}
                >
                  Completed Orders
                </h3>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {completedOrders.map((order) => (
                    <div
                      key={order.order_id}
                      style={styles.orderCard}
                      onClick={() => {
                        setSelectedOrderId(order.order_id);
                        setShowMoreModal(false);
                      }}
                    >
                      <div style={styles.orderName}>{order.name}</div>
                      <div style={styles.orderInfo}>
                        <span>{order.order_id}</span>
                        <span>
                          ₱{Number(order.total_cost).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={() => setShowMoreModal(false)}
                  style={{ ...styles.button, ...styles.primaryButton }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Add Order */}
        {showModal && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal"
              style={{
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                minWidth: 1100,
                maxWidth: "95vw",
                width: "95vw",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Add Order</h2>
              <form
                onSubmit={handleFormSubmit}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 40,
                  alignItems: "flex-start",
                }}
              >
                {/* Left: Order Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                    }}
                  >
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Order ID
                      <input
                        name="order_id"
                        value={form.order_id}
                        readOnly
                        className="modal-input"
                        style={{ backgroundColor: "#f8f9fa" }}
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Name
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Status
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      >
                        <option value="">Select status</option>
                        <option value="Pending">Pending</option>
                        <option value="To be pack">To be pack</option>
                        <option value="Ready to ship">Ready to ship</option>
                        <option value="En Route">En Route</option>
                        <option value="Completed">Completed</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Package Name
                      <select
                        name="package_name"
                        value={form.package_name}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      >
                        <option value="">Select package</option>
                        <option value="Carlo">Carlo</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Order Date
                      <input
                        name="order_date"
                        type="date"
                        value={form.order_date}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Expected Delivery
                      <input
                        name="expected_delivery"
                        type="date"
                        value={form.expected_delivery}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Shipped To (Receiver name){" "}
                      <input
                        name="shipped_to"
                        value={form.shipped_to}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Shipping Address
                      <input
                        name="shipping_address"
                        value={form.shipping_address}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Telephone
                      <input
                        name="telephone"
                        value={form.telephone}
                        onChange={handleFormChange}
                        className="modal-input"
                        placeholder="(optional)"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Cellphone
                      <input
                        name="cellphone"
                        value={form.cellphone}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Email Address
                      <input
                        name="email_address"
                        value={form.email_address}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Total Cost
                      <input
                        name="total_cost"
                        type="number"
                        step="0.01"
                        value={form.total_cost}
                        readOnly
                        className="modal-input"
                        style={{ backgroundColor: "#f5f5f5" }}
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Payment Type
                      <select
                        name="payment_type"
                        value={form.payment_type}
                        onChange={handleFormChange}
                        className="modal-input"
                        required
                      >
                        <option value="">Select payment type</option>
                        <option value="50% paid">50% paid</option>
                        <option value="70% paid">70% paid</option>
                        <option value="100% Paid">100% Paid</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Payment Method
                      <select
                        name="payment_method"
                        value={form.payment_method}
                        onChange={handleFormChange}
                        className="modal-input"
                        required
                      >
                        <option value="">Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Online Banking">Online Banking</option>
                        <option value="E-Wallet">E-Wallet</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Account Name
                      <input
                        name="account_name"
                        value={form.account_name}
                        onChange={handleFormChange}
                        className="modal-input"
                      />
                    </label>
                    {/* Remarks - span both columns */}
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        gridColumn: "1 / span 2",
                      }}
                    >
                      Remarks
                      <input
                        name="remarks"
                        value={form.remarks}
                        onChange={handleFormChange}
                        className="modal-input"
                      />
                    </label>
                  </div>
                  {/* Form buttons */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 24,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "1px solid #bbb",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "none",
                        background: "#6c63ff",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
                {/* Right: Products Section */}
                <div style={{ flex: 1.2, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 12,
                      letterSpacing: 1,
                    }}
                  >
                    PRODUCTS
                  </div>
                  <div
                    style={{
                      maxHeight: 400,
                      overflowY: "auto",
                      marginBottom: 18,
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    {renderProductTable()}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>
                      Total Estimated Profit: ₱
                      {inventory
                        .reduce((total, item) => {
                          const quantity = Number(
                            productSelection[item.sku] || 0
                          );
                          const margin = Number(profitMargins[item.sku] || 0);
                          const unitPrice = Number(item.unit_price || 0);
                          return total + unitPrice * quantity * (margin / 100);
                        }, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  {productError && (
                    <div style={{ color: "red", marginBottom: 8 }}>
                      {productError}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal for Add Product to Order */}
        {showProductModal && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal"
              style={{
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                minWidth: 700,
                maxWidth: 900,
                width: "90vw",
                boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Add Products to Order</h2>
              <div
                style={{ maxHeight: 400, overflowY: "auto", marginBottom: 18 }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f8f8" }}>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Image
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Name
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Unit Price
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Available
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Profit Margin %
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Est. Profit
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Add
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const quantity = Number(productSelection[item.sku] || 0);
                      const margin = Number(profitMargins[item.sku] || 0);
                      const unitPrice = Number(item.unit_price || 0);
                      const estimatedProfit = (
                        unitPrice *
                        quantity *
                        (margin / 100)
                      ).toFixed(2);

                      return (
                        <tr key={item.sku}>
                          <td style={{ padding: "8px" }}>
                            {item.image_data ? (
                              <img
                                src={`data:image/jpeg;base64,${item.image_data}`}
                                alt={item.name}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 6,
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  background: "#eee",
                                  borderRadius: 6,
                                }}
                              />
                            )}
                          </td>
                          <td style={{ padding: "8px" }}>{item.name}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            ₱{unitPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={profitMargins[item.sku] || ""}
                              onChange={(e) =>
                                setProfitMargins((pm) => ({
                                  ...pm,
                                  [item.sku]: e.target.value,
                                }))
                              }
                              style={{
                                width: 60,
                                padding: "4px",
                                borderRadius: 4,
                                border: "1px solid #ccc",
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            {quantity > 0 && margin > 0
                              ? `₱${estimatedProfit}`
                              : "-"}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={productSelection[item.sku] || ""}
                              onChange={(e) =>
                                handleProductSelection(item.sku, e.target.value)
                              }
                              style={{
                                width: 60,
                                padding: "4px",
                                borderRadius: 4,
                                border: "1px solid #ccc",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <div style={{ fontWeight: 500 }}>
                  Total Estimated Profit: ₱
                  {inventory
                    .reduce((total, item) => {
                      const quantity = Number(productSelection[item.sku] || 0);
                      const margin = Number(profitMargins[item.sku] || 0);
                      const unitPrice = Number(item.unit_price || 0);
                      return total + unitPrice * quantity * (margin / 100);
                    }, 0)
                    .toFixed(2)}
                </div>
              </div>
              {productError && (
                <div style={{ color: "red", marginBottom: 8 }}>
                  {productError}
                </div>
              )}
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddProductToOrder}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#6c63ff",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={placingOrder}
                >
                  {placingOrder ? "Placing..." : "Place Order"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Order Modal */}
        {showEditModal && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal"
              style={{
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                minWidth: 1100,
                maxWidth: "95vw",
                width: "95vw",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Edit Order</h2>
              <form
                onSubmit={handleEditOrderSubmit}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 40,
                  alignItems: "flex-start",
                }}
              >
                {/* Left: Order Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                    }}
                  >
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Order ID
                      <input
                        name="order_id"
                        value={form.order_id}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                        disabled
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Name
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Status
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      >
                        <option value="">Select status</option>
                        <option value="Pending">Pending</option>
                        <option value="To be pack">To be pack</option>
                        <option value="Ready to ship">Ready to ship</option>
                        <option value="En Route">En Route</option>
                        <option value="Completed">Completed</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Package Name
                      <select
                        name="package_name"
                        value={form.package_name}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      >
                        <option value="">Select package</option>
                        <option value="Carlo">Carlo</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Order Date
                      <input
                        name="order_date"
                        type="date"
                        value={form.order_date}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Expected Delivery
                      <input
                        name="expected_delivery"
                        type="date"
                        value={form.expected_delivery}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Shipped To (Receiver name){" "}
                      <input
                        name="shipped_to"
                        value={form.shipped_to}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Shipping Address
                      <input
                        name="shipping_address"
                        value={form.shipping_address}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Telephone
                      <input
                        name="telephone"
                        value={form.telephone}
                        onChange={handleFormChange}
                        className="modal-input"
                        placeholder="(optional)"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Cellphone
                      <input
                        name="cellphone"
                        value={form.cellphone}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Email Address
                      <input
                        name="email_address"
                        value={form.email_address}
                        onChange={handleFormChange}
                        required
                        className="modal-input"
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Total Cost
                      <input
                        name="total_cost"
                        type="number"
                        step="0.01"
                        value={form.total_cost}
                        readOnly
                        className="modal-input"
                        style={{ backgroundColor: "#f5f5f5" }}
                      />
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Payment Type
                      <select
                        name="payment_type"
                        value={form.payment_type}
                        onChange={handleFormChange}
                        className="modal-input"
                        required
                      >
                        <option value="">Select payment type</option>
                        <option value="50% paid">50% paid</option>
                        <option value="70% paid">70% paid</option>
                        <option value="100% Paid">100% Paid</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Payment Method
                      <select
                        name="payment_method"
                        value={form.payment_method}
                        onChange={handleFormChange}
                        className="modal-input"
                        required
                      >
                        <option value="">Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Online Banking">Online Banking</option>
                        <option value="E-Wallet">E-Wallet</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      Account Name
                      <input
                        name="account_name"
                        value={form.account_name}
                        onChange={handleFormChange}
                        className="modal-input"
                      />
                    </label>
                    {/* Remarks - span both columns */}
                    <label
                      style={{
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        gridColumn: "1 / span 2",
                      }}
                    >
                      Remarks
                      <input
                        name="remarks"
                        value={form.remarks}
                        onChange={handleFormChange}
                        className="modal-input"
                      />
                    </label>
                  </div>
                  {/* Form buttons */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 24,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "1px solid #bbb",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "none",
                        background: "#6c63ff",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
                {/* Right: Products Section */}
                <div style={{ flex: 1.2, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 12,
                      letterSpacing: 1,
                    }}
                  >
                    PRODUCTS
                  </div>
                  <div
                    style={{
                      maxHeight: 400,
                      overflowY: "auto",
                      marginBottom: 18,
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    {renderProductTable()}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>
                      Total Estimated Profit: ₱
                      {inventory
                        .reduce((total, item) => {
                          const quantity = Number(
                            productSelection[item.sku] || 0
                          );
                          const margin = Number(profitMargins[item.sku] || 0);
                          const unitPrice = Number(item.unit_price || 0);
                          return total + unitPrice * quantity * (margin / 100);
                        }, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  {productError && (
                    <div style={{ color: "red", marginBottom: 8 }}>
                      {productError}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Products Modal */}
        {showEditProductsModal && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal"
              style={{
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                minWidth: 700,
                maxWidth: 900,
                width: "90vw",
                boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Edit Products</h2>
              <div
                style={{ maxHeight: 400, overflowY: "auto", marginBottom: 18 }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f8f8" }}>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Image
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Name
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Available
                      </th>
                      <th style={{ textAlign: "right", padding: "8px" }}>
                        Edit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderProducts.map((item) => (
                      <tr key={item.sku}>
                        <td style={{ padding: "8px" }}>
                          {item.image_data ? (
                            <img
                              src={`data:image/jpeg;base64,${item.image_data}`}
                              alt={item.name}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                background: "#eee",
                                borderRadius: 6,
                              }}
                            />
                          )}
                        </td>
                        <td style={{ padding: "8px" }}>{item.name}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={editingProducts[item.sku] || ""}
                            onChange={(e) =>
                              setEditingProducts((ps) => ({
                                ...ps,
                                [item.sku]: e.target.value,
                              }))
                            }
                            style={{
                              width: 60,
                              padding: "4px",
                              borderRadius: 4,
                              border: "1px solid #ccc",
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editingProductsError && (
                <div style={{ color: "red", marginBottom: 8 }}>
                  {editingProductsError}
                </div>
              )}
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditProductsModal(false)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProducts}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#6c63ff",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={updatingProducts}
                >
                  {updatingProducts ? "Updating..." : "Update Products"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Order Confirm Modal */}
        {showDeleteConfirm && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal"
              style={{
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                minWidth: 400,
                maxWidth: 500,
                width: "90vw",
                boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Delete Order</h2>
              <div style={{ marginBottom: 18 }}>
                Are you sure you want to delete this order?
              </div>
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#e74c3c",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Order Confirm Modal */}
        {showCompleteConfirm && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal"
              style={{
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                minWidth: 400,
                maxWidth: 500,
                width: "90vw",
                boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
              }}
            >
              <h2 style={{ marginBottom: 20 }}>Complete Order</h2>
              <div style={{ marginBottom: 18 }}>
                <p>
                  Are you sure you want to mark this order as completed and
                  archive it?
                </p>
                <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
                  This will:
                </p>
                <ul
                  style={{
                    color: "#666",
                    fontSize: 14,
                    marginTop: 4,
                    paddingLeft: 20,
                  }}
                >
                  <li>Mark the order as completed</li>
                  <li>Deduct products from inventory</li>
                  <li>Move the order to order history</li>
                  <li>Remove it from active orders</li>
                </ul>
              </div>
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setShowCompleteConfirm(false)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteConfirm}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#27ae60",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={archivingOrder}
                >
                  {archivingOrder ? "Processing..." : "Complete & Archive"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal for selectedOrder */}
        {selectedOrder && (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0008",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="modal order-details-modal-two-col"
              style={{
                background: "#fff",
                padding: 0,
                borderRadius: 18,
                minWidth: 600,
                maxWidth: 900,
                width: "98vw",
                boxShadow:
                  "0 8px 32px rgba(44,62,80,0.10), 0 2px 12px rgba(74,144,226,0.06)",
                position: "relative",
                display: "flex",
                gap: 0,
              }}
            >
              {/* ❌ Close Button */}
              <button
                onClick={() => setSelectedOrderId(null)}
                className="order-modal-close"
                style={{
                  position: "absolute",
                  top: 18,
                  right: 24,
                  fontSize: 26,
                  color: "#aaa",
                  background: "none",
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "color 0.2s, background 0.2s",
                  zIndex: 2,
                }}
              >
                &times;
              </button>

              {/* ✅ Modal Content */}
              <div
                className="order-details-modal-content"
                style={{ display: "flex", flexDirection: "row", width: "100%" }}
              >
                {/* Left Column */}
                <div
                  className="order-details-modal-info-col"
                  style={{ flex: 1.2, padding: "40px 36px 40px 48px" }}
                >
                  <h2
                    style={{
                      marginBottom: 24,
                      fontFamily: "Cormorant Garamond,serif",
                      fontWeight: 700,
                      fontSize: 32,
                      color: "#2c3e50",
                    }}
                  >
                    Order Details
                  </h2>

                  {orderStockIssues[selectedOrder.order_id] &&
                    orderStockIssues[selectedOrder.order_id].length > 0 && (
                      <div
                        style={{
                          color: "#b94a48",
                          background: "#fff3cd",
                          border: "1px solid #ffeeba",
                          borderRadius: 6,
                          padding: "8px 12px",
                          marginBottom: 18,
                          fontSize: 15,
                        }}
                      >
                        ⚠️ Not enough stock for:{" "}
                        {orderStockIssues[selectedOrder.order_id].join(", ")}
                      </div>
                    )}

                  <div style={{ marginBottom: 12 }}>
                    <b>Name:</b> {selectedOrder.name}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Email Address:</b> {selectedOrder.email_address || "-"}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Contact Number:</b> {selectedOrder.cellphone || "-"}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Order Quantity:</b>{" "}
                    {selectedOrder.order_quantity ||
                      selectedOrder.products?.reduce(
                        (total, p) => total + p.quantity,
                        0
                      ) ||
                      "-"}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Date of Event:</b>{" "}
                    {selectedOrder.expected_delivery || "-"}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Shipping Location:</b>{" "}
                    {selectedOrder.shipping_address || "-"}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Status:</b> {selectedOrder.status}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Order ID:</b> {selectedOrder.order_id}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Date Ordered:</b> {selectedOrder.order_date}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <b>Package Name:</b> {selectedOrder.package_name || "-"}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                    <button
                      onClick={handleEditOrder}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "none",
                        background: "#6c63ff",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FaEdit /> Edit Order
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "1px solid #e74c3c",
                        background: "#fff",
                        color: "#e74c3c",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FaTrash /> Delete
                    </button>
                    {selectedOrder.status !== "Completed" && (
                      <button
                        onClick={handleMarkCompleted}
                        style={{
                          padding: "7px 18px",
                          borderRadius: 6,
                          border: "none",
                          background: "#27ae60",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <FaCheckCircle /> Complete
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div
                  className="order-details-modal-products-col"
                  style={{
                    flex: 1,
                    background: "#f8f9fa",
                    borderLeft: "1.5px solid #ececec",
                    borderRadius: "0 18px 18px 0",
                    padding: "40px 32px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    minWidth: 220,
                    maxWidth: 340,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 22,
                      fontFamily: "Cormorant Garamond,serif",
                      color: "#2c3e50",
                      marginBottom: 14,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      borderBottom: "1.5px solid #ece9e6",
                      paddingBottom: 6,
                      width: "100%",
                    }}
                  >
                    What's Inside
                  </h3>

                  {loadingProductDetails ? (
                    <div style={{ color: "#888", fontSize: 16 }}>
                      Loading products...
                    </div>
                  ) : selectedOrder.package_name === "Carlo" &&
                    carloProducts.length > 0 ? (
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        width: "100%",
                      }}
                    >
                      {carloProducts.map((product, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            marginBottom: 18,
                          }}
                        >
                          {product.image_data ? (
                            <img
                              src={`data:image/jpeg;base64,${product.image_data}`}
                              alt={product.name}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                objectFit: "cover",
                                background: "#eee",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                background: "#eee",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#bbb",
                                fontSize: 22,
                              }}
                            >
                              ?
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 16,
                                fontFamily: "Lora,serif",
                                color: "#333",
                              }}
                            >
                              {product.name}
                            </div>
                            <div style={{ fontSize: 14, color: "#888" }}>
                              Qty: {product.quantity}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : selectedOrder.products &&
                    selectedOrder.products.length > 0 ? (
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        width: "100%",
                      }}
                    >
                      {selectedOrder.products.map((p, idx) => (
                        <li
                          key={p.sku || idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            marginBottom: 18,
                          }}
                        >
                          {p.image_data ? (
                            <img
                              src={`data:image/jpeg;base64,${p.image_data}`}
                              alt={p.name}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                objectFit: "cover",
                                background: "#eee",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                background: "#eee",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#bbb",
                                fontSize: 22,
                              }}
                            >
                              ?
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 16,
                                fontFamily: "Lora,serif",
                                color: "#333",
                              }}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: 14, color: "#888" }}>
                              Qty: {p.quantity}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: "#666", fontSize: 15 }}>
                      No products added to this order yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              {selectedOrder && selectedOrder.status !== 'To be pack' && (
                <button
                  onClick={async () => {
                    try {
                      await axios.put(`http://localhost:3001/api/orders/${selectedOrder.order_id}`, {
                        ...selectedOrder,
                        status: 'To be pack',
                      });
                      setSelectedOrderId(null);
                      fetchOrders();
                    } catch (err) {
                      alert('Failed to update order status');
                    }
                  }}
                  style={{
                    position: "absolute",
                    bottom: 20,
                    right: 24,
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: "none",
                    background: "#3498db",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 2,
                  }}
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
