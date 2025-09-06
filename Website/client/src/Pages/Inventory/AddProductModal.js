import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import api from '../../api';
import Select from 'react-select';

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

// Function to generate a unique-like SKU (simple implementation)
const generateUniqueSku = () => {
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
  }
  return `BC${digits}`;
};

export default function AddProductModal({ onClose, onAdd, initialData = {}, isEdit = false, products = [], isAddStockMode = false }) {
  const [form, setForm] = useState({
    sku: isEdit || isAddStockMode ? (initialData.sku || '') : generateUniqueSku(),
    name: initialData.name || '',
    description: initialData.description || '',
    quantity: initialData.quantity || 0,
    unit_price: initialData.unit_price || 0,
    category: initialData.category || '',
    uom: initialData.uom || '',
    conversion_qty: initialData.conversion_qty || '',
    expirable: initialData.expirable || false,
    expiration: initialData.expiration || '',
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

  useEffect(() => {
    if ((isEdit || isAddStockMode) && initialData && Object.keys(initialData).length > 0) { 
      setForm({
        sku: initialData.sku || generateUniqueSku(),
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        category: initialData.category || '',
        uom: initialData.uom || '',
        conversion_qty: initialData.conversion_qty || '',
        expirable: initialData.expirable || false,
        expiration: initialData.expiration || '',
      });
      setCategoryInput(initialData.category || '');
      if (initialData.image_data) {
        setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
      }
      if (isEdit) {
        setSelectedExistingProduct(initialData); 
      }
    }

  const wsBase = process.env.REACT_APP_WS_URL || window.location.origin.replace(/^http/, 'ws');
  const ws = new WebSocket(wsBase);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'barcode_scanned') {
        if (!selectedExistingProduct) { // Only update SKU if no existing product is selected
          setForm(prev => ({ ...prev, sku: data.barcode }));
        }
      }
    };
    return () => {
      ws.close();
    };
  }, [isEdit, isAddStockMode, initialData]);

  useEffect(() => {
    if ((isEdit || isAddStockMode) && initialData && Object.keys(initialData).length > 0) {
      setForm({
        sku: initialData.sku || '',
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        category: initialData.category || '',
        uom: initialData.uom || '',
        conversion_qty: initialData.conversion_qty || '',
        expirable: initialData.expirable || false,
        expiration: initialData.expiration || '',
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
      product => product.name.toLowerCase() === form.name.toLowerCase() && 
      product.sku !== form.sku // Check against the SKU in the form
    );
    if (duplicateName) {
      newErrors.name = 'A product with this name already exists';
    }

    // Check for duplicate description
    const duplicateDescription = products.find(
      product => product.description.toLowerCase() === form.description.toLowerCase() && 
      product.sku !== form.sku // Check against the SKU in the form
    );
    if (duplicateDescription) {
      newErrors.description = 'A product with this description already exists';
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

    // Validate Conversion QTY if required
    if (UOMS_REQUIRING_CONVERSION.includes(form.uom)) {
      if (!form.conversion_qty || isNaN(form.conversion_qty) || Number(form.conversion_qty) <= 0 || !Number.isInteger(Number(form.conversion_qty))) {
        newErrors.conversion_qty = 'Conversion QTY must be a positive integer';
      }
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
            sku: generateUniqueSku(),
            name: '',
            description: '',
            quantity: 0,
            unit_price: 0,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isAddStockMode) {
        onAdd({
            sku: form.sku,
            quantity: quantityToAdd,
            isAddStock: true,
        });
        return;
    }

    // Validation for unique SKU/Name if it's a new product (not selectedExistingProduct)
    // or if SKU/Name is changed for an existing product.
    if (!selectedExistingProduct) { // Truly new product
      const skuExists = products.some(p => p.sku === form.sku);
      if (skuExists) {
        setErrors(prev => ({ ...prev, sku: 'SKU already exists.' }));
        return;
      }
      const nameExists = products.some(p => p.name.toLowerCase() === form.name.toLowerCase());
      if (nameExists) {
        setErrors(prev => ({ ...prev, name: 'Product name already exists.' }));
        return;
      }
    } else { // Updating an existing product
      if (form.sku !== selectedExistingProduct.sku) {
        const skuExists = products.some(p => p.sku === form.sku && p.sku !== selectedExistingProduct.sku);
        if (skuExists) {
          setErrors(prev => ({ ...prev, sku: 'This new SKU already exists for another product.' }));
          return;
        }
      }
      if (form.name.toLowerCase() !== selectedExistingProduct.name.toLowerCase()) {
        const nameExists = products.some(p => p.name.toLowerCase() === form.name.toLowerCase() && p.sku !== selectedExistingProduct.sku);
        if (nameExists) {
          setErrors(prev => ({ ...prev, name: 'This new name already exists for another product.' }));
          return;
        }
      }
    }

    let dataToSend;
    if (image) { // If a new image is uploaded, use FormData
      dataToSend = new FormData();
      dataToSend.append('sku', form.sku);
      dataToSend.append('name', form.name);
      dataToSend.append('description', form.description);
      dataToSend.append('quantity', String(Number(form.quantity))); // Ensure numeric conversion
      dataToSend.append('unit_price', String(Number(form.unit_price))); // Ensure numeric conversion
      dataToSend.append('category', categoryInput || form.category);
      dataToSend.append('image', image);
      // If updating, add a flag
      if (isEdit) dataToSend.append('isUpdate', 'true'); 
    } else { // No new image, send JSON
      dataToSend = {
        sku: form.sku,
        name: form.name,
        description: form.description,
        category: categoryInput || form.category,
        quantity: Number(form.quantity), // Ensure numeric
        unit_price: Number(form.unit_price), // Ensure numeric
      };
      // If updating, add the isUpdate flag
      if (isEdit) dataToSend.isUpdate = true;
    }

    // The onAdd prop (handleAddProduct in Inventory.js) will receive this data.
    // It currently only POSTs. The backend /api/inventory POST must handle upsert.
    onAdd(dataToSend);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3 style={{ textAlign: 'center', fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
          {isAddStockMode ? 'ADD STOCK' : (selectedExistingProduct || (isEdit && initialData.sku) ? 'EDIT PRODUCT DETAILS' : 'ADD PRODUCT')}
        </h3>
        <form onSubmit={handleSubmit} className="add-product-form" encType="multipart/form-data">
          <div className="section-title">Basic Information</div>
          
          <div className="file-input-wrapper full-width" style={{ justifyContent: 'center', margin: '0 0 1rem 0' }}>
            {preview && <img src={preview} alt="Preview" style={{ width: '120px', height: '120px' }} />}
            <input type="file" accept="image/*" onChange={handleImageChange} disabled={isAddStockMode || isEdit} />
          </div>

          <label>SKU
            <input name="sku" value={form.sku} onChange={handleChange} required disabled={true} />
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
              disabled={isAddStockMode}
            />
            {showProductNameSuggestions && productNameSuggestions.length > 0 && !isAddStockMode && !isEdit && (
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

          <label>Category
            <div className="category-input-container">
              <input 
                name="category" 
                value={categoryInput}
                onChange={handleCategoryChange}
                className={errors.category ? 'error' : ''}
                placeholder="Select or type a category"
                disabled={isAddStockMode}
              />
              {showSuggestions && filteredCategories.length > 0 && !isAddStockMode && !isEdit && (
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

          <label className="full-width">Description
            <input 
              name="description" 
              value={form.description} 
              onChange={handleChange}
              className={errors.description ? 'error' : ''}
              disabled={isAddStockMode}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </label>

          <div className="section-title">Inventory & Pricing</div>

          {isAddStockMode ? (
            <>
              <label>Current Stock
                <input 
                  type="number" 
                  value={form.quantity} 
                  disabled={true}
                  style={{ background: '#f9fafb' }}
                />
              </label>
              <label>Quantity to Add
                <input 
                  name="quantityToAdd" 
                  type="number" 
                  value={quantityToAdd} 
                  onChange={e => setQuantityToAdd(e.target.value)} 
                  required
                  className={errors.quantity ? 'error' : ''}
                  min="1"
                />
                {errors.quantity && <span className="error-message">{errors.quantity}</span>}
              </label>
            </>
          ) : (
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
          )}

          <label>Unit of Measure
            <div style={{ minHeight: 40 }}>
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
                isDisabled={isAddStockMode || isEdit}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: errors.uom ? '#ef4444' : state.isFocused ? '#4361ee' : '#d1d5db',
                    boxShadow: state.isFocused ? '0 0 0 3px rgba(67, 97, 238, 0.1)' : 'none',
                    minHeight: 40,
                    fontSize: '1rem',
                    background: '#fff',
                    borderWidth: '1.5px',
                  }),
                  menu: base => ({
                    ...base,
                    zIndex: 9999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? '#4361ee'
                      : state.isFocused
                      ? '#f0f4ff'
                      : '#fff',
                    color: state.isSelected ? '#fff' : '#374151',
                    fontSize: '1rem',
                    padding: '10px 16px',
                  }),
                }}
              />
            </div>
            {errors.uom && <span className="error-message">{errors.uom}</span>}
          </label>

          {UOMS_REQUIRING_CONVERSION.includes(form.uom) && (
            <label className="full-width">Units per UOM
              <input
                name="conversion_qty"
                type="number"
                min="1"
                step="1"
                value={form.conversion_qty}
                onChange={handleChange}
                required
                placeholder={`How many units in one ${form.uom || 'container'}?`}
                disabled={isAddStockMode || isEdit}
              />
              <span className="help-text">1 {form.uom} = {form.conversion_qty || '?'} Pieces</span>
              {errors.conversion_qty && <span className="error-message">{errors.conversion_qty}</span>}
            </label>
          )}

          <label>Unit Price (Per UOM)
            <input 
              name="unit_price" 
              type="number" 
              step="0.01" 
              value={form.unit_price} 
              onChange={handleChange} 
              required
              className={errors.unit_price ? 'error' : ''}
              disabled={isAddStockMode}
            />
            {errors.unit_price && <span className="error-message">{errors.unit_price}</span>}
          </label>

          <div className="section-title">Product Details</div>

          <div className="expirable-group full-width" style={{ margin: '0', flexDirection: 'row', justifyContent: 'flex-start' }}>
            <label className="expirable-checkbox-label" style={{ marginRight: '1rem' }}>
              <input
                type="checkbox"
                id="expirable"
                checked={form.expirable}
                onChange={e => setForm(prev => ({ ...prev, expirable: e.target.checked, expiration: e.target.checked ? prev.expiration : '' }))}
                className="expirable-checkbox"
                disabled={isAddStockMode || isEdit}
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
                disabled={isAddStockMode || isEdit}
                style={{ width: 'auto' }}
              />
            ) : (
              <span className="dont-expire-badge" style={{ width: 'auto', padding: '0.5rem 1rem' }}>DOES NOT EXPIRE</span>
            )}
          </div>

          <div className="button-group">
            <button type="button" className="submit-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" style={{ background: '#4361ee' }}>
              {isAddStockMode ? 'Add Stock' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 