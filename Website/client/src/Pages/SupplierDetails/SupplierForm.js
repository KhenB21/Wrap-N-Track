import React, { useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import "./SupplierForm.css"; // Make sure to create this CSS file

// --- TopBar implementation from SupplierDetails.js ---
function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/jpeg;base64,${user.profile_picture_data}`;
  }
  return "/placeholder-profile.png";
}

const TopBar = ({ avatarUrl }) => (
  <div className="topbar">
    <input className="topbar-search" type="text" placeholder="Search" />
    <div className="topbar-actions">
      <button className="icon-btn" title="Notifications">
        🔔
      </button>
      <button className="icon-btn" title="Settings">
        ⚙️
      </button>
      <img src={avatarUrl} alt="avatar" className="topbar-avatar" />
    </div>
  </div>
);
// --- End TopBar ---

const AddSupplierDialog = ({ open, onClose, onAdd }) => {
  const initialFormData = {
    photo: null,
    supplierName: "",
    email: "",
    telephone: "",
    cellphone: "",
    description: "",
    province: "",
    cityMunicipality: "",
    barangay: "",
    streetAddress: "",
    zipCode: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^(\+63|0)[\d\s-]{10,}$/.test(phone);
  const validateZipCode = (zipCode) => /^\d{4}$/.test(zipCode);

  const validateForm = (data = formData) => {
    const newErrors = {};
    if (!data.supplierName.trim())
      newErrors.supplierName = "Supplier name is required";
    else if (data.supplierName.length > 100)
      newErrors.supplierName = "Supplier name must be less than 100 characters";
    if (!data.email.trim()) newErrors.email = "Email is required";
    else if (!validateEmail(data.email))
      newErrors.email = "Invalid email format";
    if (data.telephone && !validatePhone(data.telephone))
      newErrors.telephone =
        "Invalid telephone format (must start with +63 or 0)";
    if (!data.cellphone) newErrors.cellphone = "Cellphone is required";
    else if (!validatePhone(data.cellphone))
      newErrors.cellphone =
        "Invalid cellphone format (must start with +63 or 0)";
    if (!data.province.trim()) newErrors.province = "Province is required";
    if (!data.cityMunicipality.trim())
      newErrors.cityMunicipality = "City/Municipality is required";
    if (!data.barangay.trim()) newErrors.barangay = "Barangay is required";
    if (!data.streetAddress.trim())
      newErrors.streetAddress = "Street address is required";
    if (!data.zipCode.trim()) newErrors.zipCode = "ZIP code is required";
    else if (!validateZipCode(data.zipCode))
      newErrors.zipCode = "ZIP code must be 4 digits";
    if (data.description && data.description.length > 500)
      newErrors.description = "Description must be less than 500 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Real-time validation on input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    validateForm(updatedFormData);
  };

  // Real-time validation for photo
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    let photoError = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        photoError = "File size must be less than 5MB";
      } else if (!file.type.startsWith("image/")) {
        photoError = "File must be an image";
      }
    }
    setFormData((prev) => ({ ...prev, photo: file || null }));
    setErrors((prev) => ({ ...prev, photo: photoError }));
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const newSupplier = {
        id: `SPUP-${String(Math.floor(Math.random() * 100000)).padStart(
          5,
          "0",
        )}`,
        fullName: formData.supplierName,
        contactPerson: formData.supplierName,
        email: formData.email,
        telephone: formData.telephone,
        cellphone: formData.cellphone,
        description: formData.description,
        address: {
          province: formData.province,
          cityMunicipality: formData.cityMunicipality,
          barangay: formData.barangay,
          streetAddress: formData.streetAddress,
          zipCode: formData.zipCode,
        },
      };
      onAdd(newSupplier);
      setFormData(initialFormData);
      onClose();
    }
  };

  if (!open) return null;
  return (
    <div className="add-supplier-dialog-backdrop">
      <div className="add-supplier-dialog">
        <div className="add-supplier-dialog-header">
          <h2>Add New Supplier</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="photo-upload-section">
            <label
              htmlFor="photo-upload"
              className="photo-upload-btn"
              style={{ cursor: "pointer" }}
            >
              <span role="img" aria-label="upload">
                ⬆️
              </span>
              Upload Photo
            </label>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="photo-upload"
              type="file"
              onChange={handlePhotoChange}
            />
            {formData.photo && (
              <div className="photo-selected">
                Selected: {formData.photo.name}
              </div>
            )}
            {errors.photo && <div className="error-text">{errors.photo}</div>}
          </div>
          <div className="supplier-form-fields">
            <div className="form-field">
              <label>Supplier Name*</label>
              <input
                name="supplierName"
                value={formData.supplierName}
                onChange={handleInputChange}
                required
              />
              {errors.supplierName && (
                <div className="error-text">{errors.supplierName}</div>
              )}
            </div>
            <div className="form-field">
              <label>Email Address*</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>
            <div className="form-field">
              <label>Telephone</label>
              <input
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
              />
              <div
                className={
                  "helper-text" + (errors.telephone ? " error-text" : "")
                }
              >
                {errors.telephone || "Format: +63 or 0 followed by number"}
              </div>
            </div>
            <div className="form-field">
              <label>Cellphone*</label>
              <input
                name="cellphone"
                value={formData.cellphone}
                onChange={handleInputChange}
                required
              />
              <div
                className={
                  "helper-text" + (errors.cellphone ? " error-text" : "")
                }
              >
                {errors.cellphone || "Format: +63 or 0 followed by number"}
              </div>
            </div>
            <div className="form-field">
              <label>Province*</label>
              <input
                name="province"
                value={formData.province}
                onChange={handleInputChange}
                required
              />
              {errors.province && (
                <div className="error-text">{errors.province}</div>
              )}
            </div>
            <div className="form-field">
              <label>City/Municipality*</label>
              <input
                name="cityMunicipality"
                value={formData.cityMunicipality}
                onChange={handleInputChange}
                required
              />
              {errors.cityMunicipality && (
                <div className="error-text">{errors.cityMunicipality}</div>
              )}
            </div>
            <div className="form-field">
              <label>Barangay*</label>
              <input
                name="barangay"
                value={formData.barangay}
                onChange={handleInputChange}
                required
              />
              {errors.barangay && (
                <div className="error-text">{errors.barangay}</div>
              )}
            </div>
            <div className="form-field">
              <label>House/Building Number & Street*</label>
              <input
                name="streetAddress"
                value={formData.streetAddress}
                onChange={handleInputChange}
                required
              />
              {errors.streetAddress && (
                <div className="error-text">{errors.streetAddress}</div>
              )}
            </div>
            <div className="form-field">
              <label>ZIP Code*</label>
              <input
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                required
              />
              <div
                className={
                  "helper-text" + (errors.zipCode ? " error-text" : "")
                }
              >
                {errors.zipCode || "4-digit code"}
              </div>
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
              {errors.description && (
                <div className="error-text">{errors.description}</div>
              )}
            </div>
          </div>
          <div className="dialog-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="add-btn">
              Add Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplierForm = () => {
  const [suppliers, setSuppliers] = useState([
    {
      id: "SPUP-00001",
      fullName: "Celestica",
      contactPerson: "Terence Auyong",
      email: "celestica@gmail.com",
      telephone: "(02) 8123 4567",
      cellphone: "+63 917 654 3210",
      description: "Celestica is a locally owned tea shop",
    },
  ]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const handleOpenAddDialog = () => setOpenAddDialog(true);
  const handleCloseAddDialog = () => setOpenAddDialog(false);
  const handleAddSupplier = (newSupplier) =>
    setSuppliers((prev) => [...prev, newSupplier]);
  const handleSelectSupplier = (supplierId) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId],
    );
  };
  const handleDeleteSelected = () => {
    setSuppliers((prev) =>
      prev.filter((supplier) => !selectedSuppliers.includes(supplier.id)),
    );
    setSelectedSuppliers([]);
  };

  return (
    <div className="supplier-form-layout">
      <Sidebar />
      <div className="supplier-form-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        <div className="supplier-form-content">
          {selectedSuppliers.length > 0 && (
            <div className="selected-bar">
              <button className="delete-btn" onClick={handleDeleteSelected}>
                <span role="img" aria-label="delete">
                  🗑️
                </span>
                Delete
              </button>
              <span className="selected-count">
                {selectedSuppliers.length} Selected
              </span>
              <button
                className="clear-selection-btn"
                onClick={() => setSelectedSuppliers([])}
              >
                &times;
              </button>
            </div>
          )}

          <div className="supplier-form-toolbar">
            <div className="supplier-count">
              Total Suppliers: {suppliers.length}
            </div>
            <div className="supplier-form-filters">
              <select>
                <option>All</option>
              </select>
              <select>
                <option>Category</option>
              </select>
              <select>
                <option>Filter by</option>
              </select>
              <input type="text" placeholder="Search" />
              <div className="spacer" />
              <button className="add-product-btn" onClick={handleOpenAddDialog}>
                <span role="img" aria-label="add">
                  ➕
                </span>
                Add product
              </button>
            </div>
          </div>

          <div className="supplier-table-wrapper">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th></th>
                  <th>SUPPLIER ID</th>
                  <th>FULL NAME</th>
                  <th>CONTACT PERSON</th>
                  <th>EMAIL ADDRESS</th>
                  <th>TELEPHONE</th>
                  <th>CELLPHONE</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className={
                      selectedSuppliers.includes(supplier.id)
                        ? "selected-row"
                        : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(supplier.id)}
                        onChange={() => handleSelectSupplier(supplier.id)}
                      />
                    </td>
                    <td>{supplier.id}</td>
                    <td>{supplier.fullName}</td>
                    <td>{supplier.contactPerson}</td>
                    <td>{supplier.email}</td>
                    <td>{supplier.telephone}</td>
                    <td>{supplier.cellphone}</td>
                    <td>{supplier.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AddSupplierDialog
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        onAdd={handleAddSupplier}
      />
    </div>
  );
};

export default SupplierForm;
