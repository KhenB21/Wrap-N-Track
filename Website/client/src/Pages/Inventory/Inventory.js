import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal, { CATEGORIES as PREDEFINED_CATEGORIES } from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';

export default function Inventory() {
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Format time
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${month} ${day}, ${year}. ${hours}:${minutes}${ampm}`;
  };

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/inventory');
      const data = await res.json();
      setAllProducts(data);
      // Combine predefined categories with categories from products, ensure uniqueness, and sort alphabetically
      const productCategories = data.map(product => product.category);
      const allUniqueCategories = [...new Set([...PREDEFINED_CATEGORIES, ...productCategories])]
        .filter(category => category) // Remove any empty categories
        .sort((a, b) => a.localeCompare(b)); // Sort alphabetically
      setCategories(['All Categories', ...allUniqueCategories]); // Add 'All Categories' at the beginning
    } catch (err) {
      console.error('Error fetching products:', err);
      setAllProducts([]);
      setCategories(['All Categories']); // Ensure 'All Categories' is always an option
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Filter and sort products whenever allProducts, searchTerm, or selectedCategory changes
    const filteredBySearch = allProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredByCategory = selectedCategory === 'All Categories'
      ? filteredBySearch
      : filteredBySearch.filter(product => product.category === selectedCategory);

    // Sort by status (LOW first) then by name
    const sorted = filteredByCategory.sort((a, b) => {
      const statusA = a.quantity < 300 ? 0 : a.quantity <= 700 ? 1 : 2;
      const statusB = b.quantity < 300 ? 0 : b.quantity <= 700 ? 1 : 2;

      if (statusA !== statusB) {
        return statusA - statusB; // LOW (0) < MEDIUM (1) < HIGH (2)
      }

      // Secondary sort by name if status is the same
      return a.name.localeCompare(b.name);
    });

    setProducts(sorted);
  }, [allProducts, searchTerm, selectedCategory]);

  const handleAddProduct = async (formData) => {
    try {
      console.log('Sending request to add product...');
      const response = await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        body: formData,
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product');
      }
      
      console.log('Product added successfully, refreshing list...');
      await fetchProducts();
      setShowModal(false);
    } catch (err) {
      console.error('Error adding product:', err);
      alert(err.message || 'Failed to add product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      const response = await fetch(`http://localhost:3001/api/inventory/${selectedProduct.sku}`, {
        method: 'PUT',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update product');
      }
      
      await fetchProducts();
      setShowEditModal(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error('Error updating product:', err);
      alert(err.message || 'Failed to update product. Please try again.');
    }
  };

  const handleDelete = (product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/inventory/${selectedProduct.sku}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete product');
      }
      
      await fetchProducts();
      setShowDeleteDialog(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err.message || 'Failed to delete product. Please try again.');
    }
  };

  const handleRowClick = (sku) => {
    navigate(`/product-details/${sku}`);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar 
          searchPlaceholder="Search Inventory" 
          onSearchChange={setSearchTerm} 
          categories={categories}
          onCategoryChange={setSelectedCategory}
          selectedCategory={selectedCategory}
        />
        <div className="inventory-container">
          <div className="inventory-header">
            <h2>Inventory</h2>
            <button className="add-product-btn" onClick={() => setShowModal(true)}>Add product +</button>
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Stock on Hand</th>
                  <th>Status</th>
                  <th>Unit Price</th>
                  <th>Category</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.sku} style={{ cursor: 'pointer' }} onClick={e => { if (e.target.tagName !== 'BUTTON') handleRowClick(product.sku); }}>
                    <td>
                      {product.image_data ? (
                        <img 
                          src={`data:image/jpeg;base64,${product.image_data}`} 
                          alt={product.name} 
                          className="product-img-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/50';
                          }}
                        />
                      ) : (
                        <div className="img-placeholder" />
                      )}
                    </td>
                    <td>
                      <Barcode value={product.sku.replace('BC', '')} width={1} height={30} displayValue={true} />
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{product.name}</td>
                    <td>{product.description}</td>
                    <td style={{ fontWeight: 'bold' }}>{product.quantity}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '500',
                        backgroundColor: 
                          product.quantity < 300 ? '#ffebee' :
                          product.quantity <= 700 ? '#fff3e0' :
                          '#e8f5e9',
                        color: 
                          product.quantity < 300 ? '#c62828' :
                          product.quantity <= 700 ? '#ef6c00' :
                          '#2e7d32'
                      }}>
                        {product.quantity < 300 ? 'LOW' :
                         product.quantity <= 700 ? 'MEDIUM' :
                         'HIGH'}
                      </span>
                    </td>
                    <td>{product.unit_price}</td>
                    <td style={{ fontWeight: 'bold' }}>{product.category}</td>
                    <td>{formatDate(product.last_updated)}</td>
                    <td>
                      <button className="edit-btn" onClick={e => { e.stopPropagation(); handleEdit(product); }}>Edit</button>
                      <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(product); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdd={handleAddProduct} />}
          {showEditModal && selectedProduct && (
            <AddProductModal 
              onClose={() => { setShowEditModal(false); setSelectedProduct(null); }} 
              onAdd={handleEditSubmit}
              initialData={selectedProduct}
              isEdit={true}
            />
          )}
          {showDeleteDialog && selectedProduct && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: 340, textAlign: 'center' }}>
                <h3>Delete Product</h3>
                <p>Are you sure you want to delete {selectedProduct.name}?</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                  <button className="delete-btn" onClick={handleDeleteConfirm}>Delete</button>
                  <button className="edit-btn" onClick={() => { setShowDeleteDialog(false); setSelectedProduct(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 