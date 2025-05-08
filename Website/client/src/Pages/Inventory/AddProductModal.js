import React, { useState, useEffect } from 'react';
import './AddProductModal.css';

export default function AddProductModal({ onClose, onAdd, initialData = {}, isEdit = false }) {
  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    quantity: 0,
    unit_price: 0,
    category: '',
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm({
        sku: initialData.sku || '',
        name: initialData.name || '',
        description: initialData.description || '',
        quantity: initialData.quantity || 0,
        unit_price: initialData.unit_price || 0,
        category: initialData.category || '',
      });
      if (initialData.image_path) {
        setPreview(`http://localhost:3001${initialData.image_path}`);
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else if (initialData.image_path) {
      setPreview(`http://localhost:3001${initialData.image_path}`);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (image) formData.append('image', image);
    onAdd(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3>{isEdit ? 'Edit Item' : 'New Item'}</h3>
        <form onSubmit={handleSubmit} className="add-product-form" encType="multipart/form-data">
          <label>Image
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {preview && <img src={preview} alt="Preview" style={{ width: 60, height: 60, marginTop: 8, borderRadius: 6, objectFit: 'cover' }} />}
          </label>
          <label>SKU
            <input name="sku" value={form.sku} onChange={handleChange} required disabled={isEdit} />
          </label>
          <label>Name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>Description
            <input name="description" value={form.description} onChange={handleChange} />
          </label>
          <label>Quantity
            <input name="quantity" type="number" value={form.quantity} onChange={handleChange} required />
          </label>
          <label>Unit Price
            <input name="unit_price" type="number" step="0.01" value={form.unit_price} onChange={handleChange} required />
          </label>
          <label>Category
            <input name="category" value={form.category} onChange={handleChange} />
          </label>
          <button type="submit" className="submit-btn">{isEdit ? 'Save Changes' : 'Add Product'}</button>
        </form>
      </div>
    </div>
  );
} 