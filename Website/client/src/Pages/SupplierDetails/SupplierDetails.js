/* eslint-disable no-undef */
import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import api from "../../api";
import "./SupplierDetails.css";
import usePermissions from "../../hooks/usePermissions";

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/jpeg;base64,${user.profile_picture_data}`;
  }
  return "/placeholder-profile.png";
}

export default function SupplierDetails() {
  const { checkPermission } = usePermissions();

  useEffect(() => {
    checkPermission("suppliers");
  }, [checkPermission]);

  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set());
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editForm, setEditForm] = useState({
    name: "",
    email_address: "",
    telephone: "",
    cellphone: "",
    description: "",
    province: "",
    city_municipality: "",
    barangay: "",
    street_address: "",
    zip_code: "",
  });

  // Phone number formatting and validation functions
  const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, "");

    // Format for Philippine phone numbers
    if (phoneNumber.length === 0) return "";
    if (phoneNumber.length <= 3) return phoneNumber;
    if (phoneNumber.length <= 6)
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    if (phoneNumber.length <= 10)
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return true; // Optional field
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    // Philippine phone numbers: 10-11 digits (landline: 10, mobile: 11)
    return cleanNumber.length >= 10 && cleanNumber.length <= 11;
  };

  const handlePhoneChange = (field, value) => {
    const formatted = formatPhoneNumber(value);
    setEditForm({ ...editForm, [field]: formatted });
  };
  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    // Filter suppliers based on search term and category
    let filtered = suppliers;

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.cellphone?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm, selectedCategory]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found in localStorage");
        setError("Not authenticated. Please log in.");
        return;
      }

      console.log("Fetching customers with token:", token);
      const response = await api.get("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("API Response:", response.data);
      console.log("Number of customers received:", response.data.length);
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching customers:", error);
      console.error("Error response:", error.response?.data);
      setError(
        error.response?.data?.message ||
          "Failed to load customers. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditForm({
      name: "",
      email_address: "",
      telephone: "",
      cellphone: "",
      description: "",
      province: "",
      city_municipality: "",
      barangay: "",
      street_address: "",
      zip_code: "",
    });
    setError(null);
  };

  const validateForm = () => {
    if (!editForm.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!editForm.email_address.trim()) {
      setError("Email is required");
      return false;
    }
    if (
      editForm.email_address &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email_address)
    ) {
      setError("Invalid email format");
      return false;
    }
    if (editForm.telephone && !validatePhoneNumber(editForm.telephone)) {
      setError(
        "Invalid telephone number format. Please use Philippine format: (XXX) XXX-XXXX",
      );
      return false;
    }
    if (editForm.cellphone && !validatePhoneNumber(editForm.cellphone)) {
      setError(
        "Invalid cellphone number format. Please use Philippine format: (XXX) XXX-XXXX",
      );
      return false;
    }
    if (!editForm.province.trim()) {
      setError("Province is required");
      return false;
    }
    if (!editForm.city_municipality.trim()) {
      setError("City/Municipality is required");
      return false;
    }
    if (!editForm.barangay.trim()) {
      setError("Barangay is required");
      return false;
    }
    if (!editForm.street_address.trim()) {
      setError("Street address is required");
      return false;
    }
    if (!editForm.zip_code.trim()) {
      setError("ZIP code is required");
      return false;
    }
    return true;
  };

  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem("token");

      // Prepare data for database - clean phone numbers
      const supplierData = {
        ...editForm,
        telephone: editForm.telephone
          ? editForm.telephone.replace(/\D/g, "")
          : "",
        cellphone: editForm.cellphone
          ? editForm.cellphone.replace(/\D/g, "")
          : "",
      };

      const response = await api.post(`/api/suppliers`, supplierData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuppliers([...suppliers, response.data]);
      setIsAdding(false);
      setEditForm({
        name: "",
        email_address: "",
        telephone: "",
        cellphone: "",
        description: "",
        province: "",
        city_municipality: "",
        barangay: "",
        street_address: "",
        zip_code: "",
      });
      setError(null);
    } catch (error) {
      console.error("Error adding supplier:", error);
      setError(error.response?.data?.message || "Failed to add supplier");
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setEditForm({
      name: supplier.name,
      email_address: supplier.email_address,
      telephone: supplier.telephone
        ? formatPhoneNumber(supplier.telephone)
        : "",
      cellphone: supplier.cellphone
        ? formatPhoneNumber(supplier.cellphone)
        : "",
      description: supplier.description || "",
      province: supplier.province || "",
      city_municipality: supplier.city_municipality || "",
      barangay: supplier.barangay || "",
      street_address: supplier.street_address || "",
      zip_code: supplier.zip_code || "",
    });
    setIsEditing(true);
    setError(null);
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        const token = localStorage.getItem("token");
        await api.delete(`/api/suppliers/${supplierId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSuppliers(suppliers.filter((s) => s.supplier_id !== supplierId));
        setSelectedSupplier(null);
        setError(null);
      } catch (error) {
        console.error("Error deleting supplier:", error);
        setError(error.response?.data?.message || "Failed to delete supplier");
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem("token");

      // Prepare data for database - clean phone numbers
      const supplierData = {
        ...editForm,
        telephone: editForm.telephone
          ? editForm.telephone.replace(/\D/g, "")
          : "",
        cellphone: editForm.cellphone
          ? editForm.cellphone.replace(/\D/g, "")
          : "",
      };

      const response = await api.put(
        `/api/suppliers/${selectedSupplier.supplier_id}`,
        supplierData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setSuppliers(
        suppliers.map((s) =>
          s.supplier_id === response.data.supplier_id ? response.data : s,
        ),
      );
      setSelectedSupplier(response.data);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      console.error("Error updating supplier:", error);
      setError(error.response?.data?.message || "Failed to update supplier");
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditForm({
      name: "",
      email_address: "",
      telephone: "",
      cellphone: "",
      description: "",
      province: "",
      city_municipality: "",
      barangay: "",
      street_address: "",
      zip_code: "",
    });
    setError(null);
  };

  const handleSupplierSelect = (supplier, event) => {
    if (event.shiftKey && selectedSuppliers.size > 0) {
      // Get the index of the last selected supplier
      const lastSelectedIndex = filteredSuppliers.findIndex(
        (s) => s.supplier_id === Array.from(selectedSuppliers).pop(),
      );
      const currentIndex = filteredSuppliers.findIndex(
        (s) => s.supplier_id === supplier.supplier_id,
      );

      // Select all suppliers between the last selected and current
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);

      const newSelected = new Set(selectedSuppliers);
      for (let i = start; i <= end; i++) {
        newSelected.add(filteredSuppliers[i].supplier_id);
      }
      setSelectedSuppliers(newSelected);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection for Ctrl/Cmd + click
      const newSelected = new Set(selectedSuppliers);
      if (newSelected.has(supplier.supplier_id)) {
        newSelected.delete(supplier.supplier_id);
      } else {
        newSelected.add(supplier.supplier_id);
      }
      setSelectedSuppliers(newSelected);
    } else {
      // Single selection
      setSelectedSuppliers(new Set([supplier.supplier_id]));
      setSelectedSupplier(supplier);
    }
  };

  const renderForm = () => (
    <div className="compact-form">
      {error && <div className="error-message">{error}</div>}

      {/* Basic Information Section */}
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              placeholder="Supplier name"
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={editForm.email_address}
              onChange={(e) =>
                setEditForm({ ...editForm, email_address: e.target.value })
              }
              placeholder="Email address"
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Telephone</label>
            <input
              type="tel"
              value={editForm.telephone}
              onChange={(e) => handlePhoneChange("telephone", e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              maxLength="15"
            />
          </div>
          <div className="form-group">
            <label>Cellphone</label>
            <input
              type="tel"
              value={editForm.cellphone}
              onChange={(e) => handlePhoneChange("cellphone", e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              maxLength="15"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
            placeholder="Brief description (optional)"
            rows="2"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="form-section">
        <h3 className="section-title">Address</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Province *</label>
            <input
              type="text"
              value={editForm.province}
              onChange={(e) =>
                setEditForm({ ...editForm, province: e.target.value })
              }
              placeholder="Province"
              required
            />
          </div>
          <div className="form-group">
            <label>City/Municipality *</label>
            <input
              type="text"
              value={editForm.city_municipality}
              onChange={(e) =>
                setEditForm({ ...editForm, city_municipality: e.target.value })
              }
              placeholder="City/Municipality"
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Barangay *</label>
            <input
              type="text"
              value={editForm.barangay}
              onChange={(e) =>
                setEditForm({ ...editForm, barangay: e.target.value })
              }
              placeholder="Barangay"
              required
            />
          </div>
          <div className="form-group">
            <label>ZIP Code *</label>
            <input
              type="text"
              value={editForm.zip_code}
              onChange={(e) =>
                setEditForm({ ...editForm, zip_code: e.target.value })
              }
              placeholder="ZIP Code"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Street Address *</label>
          <input
            type="text"
            value={editForm.street_address}
            onChange={(e) =>
              setEditForm({ ...editForm, street_address: e.target.value })
            }
            placeholder="Street address"
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          className="btn-save"
          onClick={isAdding ? handleSaveAdd : handleSaveEdit}
        >
          {isAdding ? "Add Supplier" : "Save Changes"}
        </button>
        <button className="btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );

  // Calculate statistics
  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s) => s.status === "active" || !s.status).length,
    inactive: suppliers.filter((s) => s.status === "inactive").length,
    selected: selectedSuppliers.size,
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />

        <div className="suppliers-page">
          {/* Header Section */}
          <div className="suppliers-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="page-title">
                  <span className="title-icon">🏢</span>
                  Supplier Management
                </h1>
                <p className="page-subtitle">Manage your supplier database</p>
              </div>
              <div className="header-actions">
                <button className="btn-primary" onClick={handleAdd}>
                  <span className="btn-icon">+</span>
                  Add Supplier
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">📊</div>
              <div className="stat-content">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total Suppliers</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon active">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.active}</div>
                <div className="stat-label">Active</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon inactive">⏸️</div>
              <div className="stat-content">
                <div className="stat-number">{stats.inactive}</div>
                <div className="stat-label">Inactive</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon selected">🎯</div>
              <div className="stat-content">
                <div className="stat-number">{stats.selected}</div>
                <div className="stat-label">Selected</div>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="suppliers-controls">
            <div className="controls-left">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Categories</option>
                <option value="Local">Local</option>
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="controls-right">
              {selectedSuppliers.size > 0 && (
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete ${selectedSuppliers.size} supplier(s)?`,
                      )
                    ) {
                      Array.from(selectedSuppliers).forEach(handleDelete);
                    }
                  }}
                >
                  <span className="btn-icon">🗑️</span>
                  Delete Selected ({selectedSuppliers.size})
                </button>
              )}
            </div>
          </div>

          {/* Supplier List */}
          <div className="suppliers-content">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
                <button onClick={fetchSuppliers} className="retry-btn">
                  Retry
                </button>
              </div>
            )}

            {filteredSuppliers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No suppliers found</h3>
                <p>
                  {searchTerm || selectedCategory !== "All"
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first supplier"}
                </p>
                {!searchTerm && selectedCategory === "All" && (
                  <button className="btn-primary" onClick={handleAdd}>
                    Add First Supplier
                  </button>
                )}
              </div>
            ) : (
              <div className="suppliers-grid">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.supplier_id}
                    className={`supplier-card ${selectedSuppliers.has(supplier.supplier_id) ? "selected" : ""}`}
                    onClick={(e) => handleSupplierSelect(supplier, e)}
                  >
                    <div className="card-header">
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.has(supplier.supplier_id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSupplierSelect(supplier, e);
                        }}
                        className="card-checkbox"
                      />
                      <div className="supplier-avatar">
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="supplier-info">
                        <h3 className="supplier-name">{supplier.name}</h3>
                        <p className="supplier-id">#{supplier.supplier_id}</p>
                      </div>
                      <div className="card-actions">
                        <button
                          className="action-btn edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(supplier);
                          }}
                          title="Edit Supplier"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.supplier_id);
                          }}
                          title="Delete Supplier"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="info-row">
                        <span className="info-icon">📧</span>
                        <span className="info-text">
                          {supplier.email_address}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-icon">📞</span>
                        <span className="info-text">
                          {supplier.telephone ||
                            supplier.cellphone ||
                            "No phone"}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-icon">📍</span>
                        <span className="info-text">
                          {supplier.city_municipality}, {supplier.province}
                        </span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <span className="status-badge active">Active</span>
                      <span className="date-added">
                        Added: {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {(isAdding || isEditing) && (
          <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {isAdding ? "Add New Supplier" : "Edit Supplier"}
                </h2>
                <button className="modal-close" onClick={handleCancel}>
                  ×
                </button>
              </div>
              <div className="modal-body">{renderForm()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
