import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import api from '../../api/axios';
import config from '../../config';

const CATEGORIES = [
  'Electronics',
  'Clothing & Apparel',
  'Home & Garden',
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
 ' Fresh Produce',
'Dairy & Eggs',
'Meat & Seafood',
'Frozen Foods',
'Bakery',
'Beverages',
'Snacks',
'Canned Goods',
'International Foods',
'Organic & Natural',
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

export default function AddProductModal({ onClose, onAdd, initialData = {}, isEdit = false }) {
  const [form, setForm] = useState({
    sku: isEdit ? (initialData.sku || '') : generateUniqueSku(),
    name: initialData.name || '',
    description: initialData.description || '',
    quantity: initialData.quantity || 0,
    unit_price: initialData.unit_price || 0,
    category: initialData.category || '',
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [existingProducts, setExistingProducts] = useState([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);

  useEffect(() => {
    // Fetch existing products for validation
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/inventory');
        setExistingProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();

    // Set up WebSocket connection for real-time barcode updates
    const ws = new WebSocket(config.WS_URL);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'barcode_scanned') {
        setForm(prev => ({ ...prev, sku: data.barcode }));
      }
    };

    return () => {
      ws.close();
    };
  }, []);

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
      if (initialData.image_path) {
        setPreview(`${config.API_URL}${initialData.image_path}`);
      }
    }
  }, [isEdit, initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    // Check for duplicate name
    const duplicateName = existingProducts.find(
      product => product.name.toLowerCase() === form.name.toLowerCase() && 
      (!isEdit || product.sku !== form.sku)
    );
    if (duplicateName) {
      newErrors.name = 'A product with this name already exists';
    }

    // Check for duplicate description
    const duplicateDescription = existingProducts.find(
      product => product.description.toLowerCase() === form.description.toLowerCase() && 
      (!isEdit || product.sku !== form.sku)
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setCategoryInput(value);
    setForm({ ...form, category: value });
    
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

  const handleCategorySelect = (category) => {
    setCategoryInput(category);
    setForm({ ...form, category });
    setShowSuggestions(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else if (initialData.image_path) {
      setPreview(`${config.API_URL}${initialData.image_path}`);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const formData = new FormData();
    
    // Append form fields, explicitly converting numbers to strings
    formData.append('sku', form.sku);
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('quantity', String(form.quantity)); // Explicitly convert to string
    formData.append('unit_price', String(form.unit_price)); // Explicitly convert to string
    formData.append('category', form.category);

    // Append image data: use new image if selected
    if (image) {
      formData.append('image', image);
    }

    console.log('FormData before onAdd:', formData); // Added log to inspect FormData
    onAdd(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3>{isEdit ? 'Edit Item' : 'New Item'}</h3>
        <form onSubmit={handleSubmit} className="add-product-form" encType="multipart/form-data">
          <label>Image
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {preview && <img src={preview} alt="Preview" style={{ width: 60, height: 60, marginTop: 8, borderRadius: 6, objectFit: 'cover' }} />}
          </label>
          <label>SKU
            <input name="sku" value={form.sku} onChange={handleChange} required disabled={!isEdit} />
          </label>
          <label>Name
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              required 
              className={errors.name ? 'error' : ''}
            />
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
          <button type="submit" className="submit-btn">{isEdit ? 'Save Changes' : 'Add Product'}</button>
        </form>
      </div>
    </div>
  );
} 