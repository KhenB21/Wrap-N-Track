import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import api from '../../api/axios';
import config from '../../config';

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

// Function to generate a unique-like SKU (simple implementation)
const generateUniqueSku = () => {
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
  }
  return `BC${digits}`;
};

export default function AddProductModal({ onClose, onAdd, initialData = {}, isEdit = false, products = [] }) {
  const [form, setForm] = useState({
    sku: isEdit ? (initialData.sku || '') : generateUniqueSku(),
    name: initialData.name || '',
    description: initialData.description || '',
    quantity: initialData.quantity || 0,
    unit_price: initialData.unit_price || 0,
    category: initialData.category || '',
  });
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
    if (isEdit && initialData && Object.keys(initialData).length > 0) { 
      setForm({
        sku: initialData.sku || generateUniqueSku(),
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        category: initialData.category || '',
      });
      setCategoryInput(initialData.category || '');
      if (initialData.image_data) {
        setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
      }
      setSelectedExistingProduct(initialData); 
    }

    const ws = new WebSocket(config.WS_URL);
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
  }, [isEdit, initialData]); // Removed selectedExistingProduct from dep array to avoid loop on initialData set

  useEffect(() => {
    if (isEdit && initialData && Object.keys(initialData).length > 0) {
      setForm({
        sku: initialData.sku || '',
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        category: initialData.category || '',
      });
      setCategoryInput(initialData.category || '');
      if (initialData.image_data) {
        setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
      }
    }
  }, [isEdit, initialData]);

  const validateForm = () => {
    const newErrors = {};
    
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

    if (name === 'name') {
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
      dataToSend.append('quantity', String(form.quantity));
      dataToSend.append('unit_price', String(form.unit_price));
      dataToSend.append('category', categoryInput || form.category);
      dataToSend.append('image', image);
      // If updating, add a flag or rely on backend to know it's an update based on SKU
      if (selectedExistingProduct) dataToSend.append('isUpdate', 'true'); 
    } else { // No new image, send JSON
      dataToSend = {
        ...form,
        category: categoryInput || form.category,
      };
      // If updating, remove image_data if not changed, backend handles this
      if (selectedExistingProduct) dataToSend.isUpdate = true;
    }
    // The onAdd prop (handleAddProduct in Inventory.js) will receive this data.
    // It currently only POSTs. The backend /api/inventory POST must handle upsert.
    onAdd(dataToSend);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3>{selectedExistingProduct || (isEdit && initialData.sku) ? 'Edit Product Details' : 'Add New Product'}</h3>
        <form onSubmit={handleSubmit} className="add-product-form" encType="multipart/form-data">
          <label>Image
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {preview && <img src={preview} alt="Preview" style={{ width: 60, height: 60, marginTop: 8, borderRadius: 6, objectFit: 'cover' }} />}
          </label>
          <label>SKU
            <input name="sku" value={form.sku} onChange={handleChange} required disabled={true} />
          </label>
          <label>Name
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              required 
              className={errors.name ? 'error' : ''}
              autoComplete="off"
            />
            {showProductNameSuggestions && productNameSuggestions.length > 0 && (
              <div className="product-name-suggestions">
                {productNameSuggestions.map((p, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleProductNameSelect(p)}
                  >
                    {p.name} (SKU: {p.sku})
                  </div>
                ))}
              </div>
            )}
            {errors.name && <span className="error-message">{errors.name}</span>}
          </label>
          <label>Description
            <input 
              name="description" 
              value={form.description} 
              onChange={handleChange}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </label>
          <label>Quantity
            <input 
              name="quantity" 
              type="number" 
              value={form.quantity} 
              onChange={handleChange} 
              required
              className={errors.quantity ? 'error' : ''}
            />
            {errors.quantity && <span className="error-message">{errors.quantity}</span>}
          </label>
          <label>Unit Price
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
          <label>Category
            <div className="category-input-container">
              <input 
                name="category" 
                value={categoryInput}
                onChange={handleCategoryChange}
                className={errors.category ? 'error' : ''}
                placeholder="Select or type a category"
              />
              {showSuggestions && filteredCategories.length > 0 && (
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
          <button type="submit" className="submit-btn">{selectedExistingProduct || (isEdit && initialData.sku) ? 'Save Changes' : 'Add Product'}</button>
        </form>
      </div>
    </div>
  );
} 