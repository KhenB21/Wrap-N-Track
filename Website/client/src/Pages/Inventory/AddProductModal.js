import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import Select from 'react-select';
import SupplierDropdown from '../../Components/SupplierDropdown';
import AddSupplierModal from '../../Components/AddSupplierModal';

const CATEGORIES = [
  'Electronics',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Toys & Games',
  'Sports & Outdoors',
  'Automotive',
  'Office Supplies',
  'Pet Supplies',
  'Gaming Consoles',
  "Men's Clothing",
  "Women's Clothing",
  "Kids' Clothing",
  'Shoes',
  'Accessories (Bags, Wallets)',
  'Jewelry',
  'Watches',
  'Underwear & Sleepwear',
  'Activewear',
  'Formal Wear',
  'Fresh Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Frozen Foods',
  'Bakery',
  'Beverages',
  'Snacks',
  'Canned Goods',
  'International Foods',
  'Organic & Natural',
  'Books',
  'Music',
  'Movies & TV',
  'Office Electronics',
  'Home Appliances',
  'Baby Products',
  'Groceries',
  'Tools & Home Improvement',
  'Garden & Outdoor',
  'Art Supplies',
  'Stationery',
  'Medical Supplies',
  'Cleaning Supplies',
  'Party Supplies',
  'Travel Accessories',
  'Mobile Phones',
  'Tablets',
  'Laptops',
  'Computer Accessories',
  'Smart Home',
  'Fitness Equipment',
  'Bags & Luggage',
  'Eyewear',
  'Perfume & Fragrances',
  'Cosmetics',
  'Hair Care',
  'Skincare',
  'Bath & Body',
  'Jewelry & Accessories',
  'Watches & Wearables',
  'Pet Food',
  'Pet Accessories',
  'Automotive Parts',
  'Car Electronics',
  'Motorcycle Accessories',
  'Bicycles & Accessories',
  'Musical Instruments',
  'Board Games',
  'Video Games',
  'Collectibles',
  'Hobbies',
  'Crafts',
  'Seasonal',
  'Gift Items',
  'Souvenirs',
  'Subscription Boxes',
  'Tickets & Events',
  'Services',
  'Digital Goods',
  'Software',
  'Apps',
  'E-books',
  'Learning Materials',
  'Office Furniture',
  'Lighting',
  'Decor',
  'Wall Art',
  'Rugs & Carpets',
  'Curtains & Blinds',
  'Bedding',
  'Kitchenware',
  'Cookware',
  'Tableware',
  'Barware',
  'Wine & Spirits',
  'Health Devices',
  'Supplements',
  'Vitamins',
  'First Aid',
  'Personal Safety',
  'Baby Care',
  'Maternity',
  'School Supplies',
  'Uniforms',
  'Religious Items',
  'Charity & Donations',
  'Other Services',
  'Others'
];

const UOM_OPTIONS = [
  { value: 'Each', label: 'Each' },
  { value: 'Piece', label: 'Piece' },
  { value: 'Set', label: 'Set' },
  { value: 'Pair', label: 'Pair' },
  { value: 'Dozen', label: 'Dozen' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Sheet', label: 'Sheet' },
  { value: 'Bag', label: 'Bag' },
  { value: 'Box', label: 'Box' },
  { value: 'Bundle', label: 'Bundle' },
  { value: 'Meter', label: 'Meter' },
  { value: 'Centimeter', label: 'Centimeter' },
  { value: 'Foot', label: 'Foot' },
  { value: 'Gram', label: 'Gram' },
  { value: 'Kilogram', label: 'Kilogram' },
  { value: 'Milliliter', label: 'Milliliter' },
  { value: 'Liter', label: 'Liter' },
  { value: 'Kit', label: 'Kit' },
  { value: 'Unit', label: 'Unit' },
  { value: 'Task', label: 'Task' }
];

const UOMS_REQUIRING_CONVERSION = ['Dozen', 'Box', 'Bundle', 'Set', 'Kit'];

export default function AddProductModal({ onClose, onAdd, initialData = {}, isEdit = false, products = [], isAddStockMode = false }) {
  const [form, setForm] = useState({
    sku: isEdit || isAddStockMode ? (initialData.sku || '') : '',
    name: initialData.name || '',
    description: initialData.description || '',
    quantity: initialData.quantity || 0,
    unit_price: initialData.unit_price || 0,
    reorder_level: initialData.reorder_level || 0,
    category: initialData.category || '',
    uom: initialData.uom || '',
    conversion_qty: initialData.conversion_qty || '',
    expirable: initialData.expirable || false,
    expiration: initialData.expiration || '',
    supplier_id: initialData.supplier_id || null,
  });
  const [quantityToAdd, setQuantityToAdd] = useState(0);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(initialData.image_data ? `data:image/jpeg;base64,${initialData.image_data}` : null);
  const [errors, setErrors] = useState({});
  const [categoryInput, setCategoryInput] = useState(initialData.category || '');

  // New state for name autocomplete
  const [productNameSuggestions, setProductNameSuggestions] = useState([]);
  const [showProductNameSuggestions, setShowProductNameSuggestions] = useState(false);
  const [selectedExistingProduct, setSelectedExistingProduct] = useState(null); // To track if we are updating
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  useEffect(() => {
    if ((isEdit || isAddStockMode) && initialData && Object.keys(initialData).length > 0) { 
      setForm({
        sku: initialData.sku || '',
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        reorder_level: initialData.reorder_level || 0,
        category: initialData.category || '',
        uom: initialData.uom || '',
        conversion_qty: initialData.conversion_qty || '',
        expirable: initialData.expirable || false,
        expiration: initialData.expiration || '',
        supplier_id: initialData.supplier_id || null,
      });
      setCategoryInput(initialData.category || '');
      if (initialData.image_data) {
        setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
      }
      if (isEdit) {
        setSelectedExistingProduct(initialData); 
      }
    }
  }, [isEdit, isAddStockMode, initialData]);

  useEffect(() => {
    if ((isEdit || isAddStockMode) && initialData && Object.keys(initialData).length > 0) {
      setForm({
        sku: initialData.sku || '',
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        reorder_level: initialData.reorder_level || 0,
        category: initialData.category || '',
        uom: initialData.uom || '',
        conversion_qty: initialData.conversion_qty || '',
        expirable: initialData.expirable || false,
        expiration: initialData.expiration || '',
        supplier_id: initialData.supplier_id || null,
      });
      setCategoryInput(initialData.category || '');
      if (initialData.image_data) {
        setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
      }
    }
  }, [isEdit, isAddStockMode, initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (isAddStockMode) {
        const qty = Number(quantityToAdd);
        if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
            newErrors.quantity = 'Please enter a valid positive integer to add.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    // Check for duplicate name
    const duplicateName = products.find(
      product => (product.name || '').toLowerCase() === form.name.toLowerCase() && 
      product.sku !== form.sku // Check against the SKU in the form
    );
    if (duplicateName) {
      newErrors.name = 'A product with this name already exists';
    }

    // Check for duplicate description
    if ((form.description || '').trim()) {
      const duplicateDescription = products.find(
        product => (product.description || '').toLowerCase() === (form.description || '').toLowerCase() && 
        product.sku !== form.sku // Check against the SKU in the form
      );
      if (duplicateDescription) {
        newErrors.description = 'A product with this description already exists';
      }
    }

    // Validate category
    if (!form.category) {
      newErrors.category = 'Category is required';
    } else if (!CATEGORIES.includes(form.category) && form.category !== 'Others') {
      newErrors.category = 'Please select a valid category';
    }

    // Validate quantity
    if (form.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    // Validate unit price
    if (form.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
    }

    if (Number(form.reorder_level) < 0) {
      newErrors.reorder_level = 'Reorder level cannot be negative';
    }

    // Validate Conversion QTY if required
    if (UOMS_REQUIRING_CONVERSION.includes(form.uom)) {
      if (!form.conversion_qty || isNaN(form.conversion_qty) || Number(form.conversion_qty) <= 0 || !Number.isInteger(Number(form.conversion_qty))) {
        newErrors.conversion_qty = 'Conversion QTY must be a positive integer';
      }
    }

    // Validate supplier selection
    if (!form.supplier_id) {
      newErrors.supplier = 'Please select a supplier';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCategorySelect = (selectedCategory) => {
    setForm(prevForm => ({ ...prevForm, category: selectedCategory }));
    setCategoryInput(selectedCategory);
    setShowSuggestions(false);
    setErrors(prev => ({ ...prev, category: '' })); // Clear category error on select
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'name' && !isEdit && !isAddStockMode) {
      if (value.trim() === '') {
        setProductNameSuggestions([]);
        setShowProductNameSuggestions(false);
        if (selectedExistingProduct) { // If name is cleared, reset to "new product" mode
          setSelectedExistingProduct(null);
          setForm({ 
            sku: '',
            name: '',
            description: '',
            quantity: 0,
            unit_price: 0,
            reorder_level: 0,
            category: '',
            uom: '',
            conversion_qty: '',
            expirable: false,
            expiration: '',
          });
          setCategoryInput('');
          setPreview(null);
          setImage(null);
        }
        return;
      }
      const suggestions = products.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setProductNameSuggestions(suggestions);
      setShowProductNameSuggestions(suggestions.length > 0);
    }
  };

  const handleProductNameSelect = (product) => {
    setSelectedExistingProduct(product); 
    setForm({
      sku: product.sku, 
      name: product.name,
      description: product.description || '',
      quantity: product.quantity || 0,
      unit_price: product.unit_price || 0,
      reorder_level: product.reorder_level || 0,
      category: product.category || '',
      uom: product.uom || '',
      conversion_qty: product.conversion_qty || '',
      expirable: product.expirable || false,
      expiration: product.expiration || '',
    });
    setCategoryInput(product.category || '');
    if (product.image_data) {
      setPreview(`data:image/jpeg;base64,${product.image_data}`);
      setImage(null); 
    } else {
      setPreview(null);
    }
    setProductNameSuggestions([]);
    setShowProductNameSuggestions(false);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setCategoryInput(value);
    setForm(prev => ({ ...prev, category: value }));
    
    if (value) {
      const filtered = CATEGORIES.filter(category =>
        category.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredCategories([]);
      setShowSuggestions(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else if (initialData.image_data) {
      setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
    } else {
      setPreview(null);
    }
  };

  const handleSupplierChange = (selectedOption) => {
    setSelectedSupplier(selectedOption);
    setForm(prev => ({ 
      ...prev, 
      supplier_id: selectedOption ? selectedOption.value : null 
    }));
    setErrors(prev => ({ ...prev, supplier: '' }));
  };

  const handleAddNewSupplier = () => {
    setShowAddSupplierModal(true);
  };

  const handleSupplierAdded = (newSupplier) => {
    setSelectedSupplier(newSupplier);
    setForm(prev => ({ 
      ...prev, 
      supplier_id: newSupplier.value 
    }));
    setErrors(prev => ({ ...prev, supplier: '' }));
    setShowAddSupplierModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isAddStockMode) {
        onAdd({
            sku: form.sku,
            quantity: quantityToAdd,
            reason: form.stock_reason || '',
            isAddStock: true,
        });
        return;
    }

    // Validation for unique product names. SKU is generated by the server for new products.
    if (!selectedExistingProduct) { // Truly new product
      const nameExists = products.some(p => (p.name || '').toLowerCase() === form.name.toLowerCase());
      if (nameExists) {
        setErrors(prev => ({ ...prev, name: 'Product name already exists.' }));
        return;
      }
    } else { // Updating an existing product
      if (form.name.toLowerCase() !== selectedExistingProduct.name.toLowerCase()) {
        const nameExists = products.some(p => (p.name || '').toLowerCase() === form.name.toLowerCase() && p.sku !== selectedExistingProduct.sku);
        if (nameExists) {
          setErrors(prev => ({ ...prev, name: 'This new name already exists for another product.' }));
          return;
        }
      }
    }

    let dataToSend;
    if (image) { // If a new image is uploaded, use FormData
      dataToSend = new FormData();
      if (form.sku) dataToSend.append('sku', form.sku);
      dataToSend.append('name', form.name);
      dataToSend.append('description', form.description);
      dataToSend.append('quantity', String(Number(form.quantity))); // Ensure numeric conversion
      dataToSend.append('unit_price', String(Number(form.unit_price))); // Ensure numeric conversion
      dataToSend.append('reorder_level', String(Number(form.reorder_level || 0)));
      dataToSend.append('category', categoryInput || form.category);
      dataToSend.append('supplier_id', form.supplier_id ?? '');
      // Send empty as '' which backend now maps to NULL; otherwise the exact value
      dataToSend.append('uom', form.uom ?? '');
      dataToSend.append('conversion_qty', form.conversion_qty || '');
      dataToSend.append('expirable', form.expirable ? 'true' : 'false');
      dataToSend.append('expiration', form.expiration || '');
      dataToSend.append('image', image);
      // If updating, add a flag
      if (isEdit) dataToSend.append('isUpdate', 'true'); 
    } else { // No new image, send JSON
      dataToSend = {
        ...(form.sku ? { sku: form.sku } : {}),
        name: form.name,
        description: form.description,
        category: categoryInput || form.category,
        quantity: Number(form.quantity), // Ensure numeric
        unit_price: Number(form.unit_price), // Ensure numeric
        reorder_level: Number(form.reorder_level || 0),
        supplier_id: form.supplier_id,
        uom: form.uom,
        conversion_qty: form.conversion_qty,
        expirable: form.expirable,
        expiration: form.expiration,
      };
      // If updating, add the isUpdate flag
      if (isEdit) dataToSend.isUpdate = true;
    }

    // The onAdd prop (handleAddProduct in Inventory.js) will receive this data.
    // It currently only POSTs. The backend /api/inventory POST must handle upsert.
    onAdd(dataToSend);
  };

  // Add Stock is a narrow, high-frequency action (received a delivery, correcting a
  // count) — it only ever needs the current stock and how much to add. Routing it
  // through the full product-editing form (image upload, description, supplier, UOM,
  // pricing, expirable date — all disabled/irrelevant here) was the main source of
  // clutter and unnecessary scrolling, so it gets its own minimal layout instead.
  if (isAddStockMode) {
    return (
      <div className="modal-overlay">
        <div className="modal-content stock-modal" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
          <div className="modal-header">
            <span className="modal-header-icon" aria-hidden="true">📦</span>
            <div>
              <h3>Add Stock</h3>
              <p className="modal-subtitle">Record newly received or adjusted inventory</p>
            </div>
          </div>

          <div className="stock-product-summary">
            {preview ? (
              <img src={preview} alt={form.name} className="stock-product-thumb" />
            ) : (
              <div className="stock-product-thumb placeholder" aria-hidden="true">📦</div>
            )}
            <div className="stock-product-info">
              <div className="stock-product-name">{form.name || 'Product'}</div>
              <div className="stock-product-meta">{form.sku}{form.category ? ` · ${form.category}` : ''}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="stock-form">
            <div className="stock-form-row">
              <label>Current Stock
                <input type="number" value={form.quantity} disabled />
              </label>
              <label>Quantity to Add *
                <input
                  name="quantityToAdd"
                  type="number"
                  value={quantityToAdd}
                  onChange={e => setQuantityToAdd(e.target.value)}
                  required
                  autoFocus
                  className={errors.quantity ? 'error' : ''}
                  min="1"
                />
                {errors.quantity && <span className="error-message">{errors.quantity}</span>}
              </label>
            </div>
            {Number(quantityToAdd) > 0 && (
              <p className="stock-preview-text">
                New stock will be <strong>{Number(form.quantity) + Number(quantityToAdd)}</strong>
              </p>
            )}
            <label className="full-width">Reason <span className="optional-tag">optional</span>
              <input
                name="stock_reason"
                value={form.stock_reason || ''}
                onChange={handleChange}
                placeholder="e.g. supplier delivery, return, stock count adjustment"
              />
            </label>

            <div className="button-group">
              <button type="button" className="submit-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="submit-btn primary">Add Stock</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {!showAddSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content product-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
            <div className="modal-header">
              <span className="modal-header-icon" aria-hidden="true">{isEdit ? '✏️' : '🏷️'}</span>
              <div>
                <h3>{selectedExistingProduct || (isEdit && initialData.sku) ? 'Edit Product Details' : 'Add Product'}</h3>
                <p className="modal-subtitle">
                  {isEdit ? `Editing ${initialData.name || 'product'}` : 'Fill in the details below to add a new inventory item'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="add-product-form" encType="multipart/form-data">
              <div className="section-title">Basic Information</div>

              <div className="basic-info-row full-width">
                <div className="image-upload-box">
                  {preview ? (
                    <img src={preview} alt="Preview" className="image-preview" />
                  ) : (
                    <div className="image-preview placeholder" aria-hidden="true">🖼️</div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} id="product-image-input" className="visually-hidden-file" />
                  <label htmlFor="product-image-input" className="image-upload-btn">Choose Photo</label>
                </div>

                <div className="basic-info-fields">
                  <label>SKU
                    <input name="sku" value={form.sku || 'Auto-generated after saving'} disabled />
                  </label>

                  <div className="product-name-input-container">
                    <label htmlFor="name">Product Name</label>
                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className={errors.name ? 'error' : ''}
                      autoComplete="off"
                    />
                    {showProductNameSuggestions && productNameSuggestions.length > 0 && !isEdit && (
                      <div className="product-name-suggestions">
                        {productNameSuggestions.map((product, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() => handleProductNameSelect(product)}
                          >
                            {product.image_data && (
                              <img
                                src={`data:image/jpeg;base64,${product.image_data}`}
                                alt={product.name}
                                className="suggestion-item-image"
                              />
                            )}
                            <span className="suggestion-item-text">{product.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.name && <span className="error-message">{errors.name}</span>}
                  </div>
                </div>
              </div>

              <label>Category
                <div className="category-input-container">
                  <input
                    name="category"
                    value={categoryInput}
                    onChange={handleCategoryChange}
                    className={errors.category ? 'error' : ''}
                    placeholder="Select or type a category"
                  />
                  {showSuggestions && filteredCategories.length > 0 && !isEdit && (
                    <div className="category-suggestions">
                      {filteredCategories.map((category, index) => (
                        <div
                          key={index}
                          className="suggestion-item"
                          onClick={() => handleCategorySelect(category)}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.category && <span className="error-message">{errors.category}</span>}
              </label>

              <label>Supplier
                <SupplierDropdown
                  value={selectedSupplier}
                  onChange={handleSupplierChange}
                  onAddNewSupplier={handleAddNewSupplier}
                  placeholder="Select a supplier..."
                  error={!!errors.supplier}
                />
                {errors.supplier && <span className="error-message">{errors.supplier}</span>}
              </label>

              <label className="full-width">Description <span className="optional-tag">optional</span>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className={errors.description ? 'error' : ''}
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
              </label>

              <div className="section-title">Inventory & Pricing</div>

              <label>Quantity (Base Unit)
                <input
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                  className={errors.quantity ? 'error' : ''}
                  disabled={isEdit}
                />
                {errors.quantity && <span className="error-message">{errors.quantity}</span>}
              </label>

              <label>Reorder Level
                <input
                  name="reorder_level"
                  type="number"
                  value={form.reorder_level}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={errors.reorder_level ? 'error' : ''}
                />
                {errors.reorder_level && <span className="error-message">{errors.reorder_level}</span>}
              </label>

              <label>Unit Price (Per UOM)
                <input
                  name="unit_price"
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={handleChange}
                  required
                  className={errors.unit_price ? 'error' : ''}
                />
                {errors.unit_price && <span className="error-message">{errors.unit_price}</span>}
              </label>

              <label>Unit of Measure
                <Select
                  name="uom"
                  value={UOM_OPTIONS.find(option => option.value === form.uom) || null}
                  onChange={option => {
                    const newUom = option ? option.value : '';
                    setForm(prev => ({
                      ...prev,
                      uom: newUom,
                      conversion_qty: UOMS_REQUIRING_CONVERSION.includes(newUom) ? prev.conversion_qty : ''
                    }));
                  }}
                  options={UOM_OPTIONS}
                  classNamePrefix={errors.uom ? 'error react-select' : 'react-select'}
                  placeholder="Select UoM"
                  isClearable
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                />
                {errors.uom && <span className="error-message">{errors.uom}</span>}
              </label>

              {UOMS_REQUIRING_CONVERSION.includes(form.uom) && (
                <label>Units per UOM
                  <input
                    name="conversion_qty"
                    type="number"
                    min="1"
                    step="1"
                    value={form.conversion_qty}
                    onChange={handleChange}
                    required
                    placeholder={`How many units in one ${form.uom || 'container'}?`}
                  />
                  <span className="help-text">1 {form.uom} = {form.conversion_qty || '?'} Pieces</span>
                  {errors.conversion_qty && <span className="error-message">{errors.conversion_qty}</span>}
                </label>
              )}

              <div className="section-title">Product Details</div>

              <div className="expirable-group full-width">
                <label className="expirable-checkbox-label">
                  <input
                    type="checkbox"
                    id="expirable"
                    checked={form.expirable}
                    onChange={e => setForm(prev => ({ ...prev, expirable: e.target.checked, expiration: e.target.checked ? prev.expiration : '' }))}
                    className="expirable-checkbox"
                  />
                  <span>Expirable Product?</span>
                </label>
                {form.expirable ? (
                  <input
                    type="date"
                    name="expiration"
                    value={form.expiration}
                    onChange={e => setForm(prev => ({ ...prev, expiration: e.target.value }))}
                    className="expirable-date"
                  />
                ) : (
                  <span className="dont-expire-badge">Does not expire</span>
                )}
              </div>

              <div className="button-group">
                <button type="button" className="submit-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="submit-btn primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddSupplierModal && (
        <AddSupplierModal
          onClose={() => setShowAddSupplierModal(false)}
          onSupplierAdded={handleSupplierAdded}
        />
      )}
    </>
  );
}
