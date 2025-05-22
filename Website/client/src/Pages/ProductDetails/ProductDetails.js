import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import AddProductModal from '../Inventory/AddProductModal';
import './ProductDetails.css';
import Barcode from 'react-barcode';

export default function ProductDetails() {
  const { sku } = useParams();
  const [allProducts, setAllProducts] = useState([]); // Keep all products for filtering
  const [products, setProducts] = useState([]); // Displayed products after filtering
  const [searchTerm, setSearchTerm] = useState(''); // Search term state
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/api/inventory`);
        const data = await res.json();
        setAllProducts(data); // Store all fetched products
        const found = data.find(p => p.sku === sku);
        setProduct(found);
      } catch (err) {
        console.error('Error fetching products:', err);
        setAllProducts([]);
        setProduct(null);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [sku]);

  useEffect(() => {
    // Filter products based on search term whenever allProducts or searchTerm changes
    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProducts(filtered); // Update displayed products
  }, [allProducts, searchTerm]);

  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  const handleEdit = () => setShowEditModal(true);
  const handleDelete = () => setShowDeleteDialog(true);

  const handleEditSubmit = async (formData) => {
    await fetch(`http://localhost:3001/api/inventory/${sku}`, {
      method: 'PUT',
      body: formData,
    });
    setShowEditModal(false);
    window.location.reload();
  };

  const handleDeleteConfirm = async () => {
    await fetch(`http://localhost:3001/api/inventory/${sku}`, { method: 'DELETE' });
    setShowDeleteDialog(false);
    // Go to next product or inventory
    const idx = products.findIndex(p => p.sku === sku);
    if (products.length > 1) {
      const next = products[idx === 0 ? 1 : 0];
      navigate(`/product-details/${next.sku}`);
    } else {
      navigate('/inventory');
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar onSearchChange={handleSearchChange} searchTerm={searchTerm} />
        <div className="product-details-layout">
          {/* Product List (Left Sidebar) */}
          <div className="product-list">
            <div className="product-list-title">PRODUCTS</div>
            {products.map((p) => (
              <div
                className={`product-list-item${p.sku === sku ? ' selected' : ''}`}
                key={p.sku}
                onClick={() => navigate(`/product-details/${p.sku}`)}
              >
                <img 
                  src={p.image_data ? `data:image/jpeg;base64,${p.image_data}` : ''} 
                  alt={p.name} 
                  className="product-img-thumb" 
                />
                <div className="product-info">
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.description}</div>
                </div>
                <div className="product-qty">Qty: {p.quantity}</div>
              </div>
            ))}
          </div>

          {/* Product Details (Right Panel) */}
          <div className="product-details-panel">
            {loading ? (
              <div>Loading...</div>
            ) : !product ? (
              <div>Product not found.</div>
            ) : (
              <>
                <div className="product-header">
                  <div>
                    <div className="product-title">{product.name}</div>
                    <div className="product-description">{product.description}</div>
                  </div>
                  <div className="product-actions">
                    <button className="icon-btn" title="Edit" onClick={handleEdit}>✏️</button>
                    <button className="icon-btn" title="Delete" onClick={handleDelete}>🗑️</button>
                  </div>
                </div>

                <div className="product-details-content">
                  <div className="product-details-info">
                    {/* Product Details Section */}
                    <div className="details-section">
                      <div className="section-title">PRODUCT DETAILS</div>
                      <div className="detail-item">
                        <span className="detail-label">Stock Keeping Unit (SKU):</span>
                        <span className="detail-value">{product.sku}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Category:</span>
                        <span className="detail-value">{product.category}</span>
                      </div>
                    </div>

                    {/* Barcode Display */}
                    <div className="details-section">
                       <div className="section-title">BARCODE</div>
                       <div style={{ textAlign: 'center', padding: '10px 0' }}>
                         <Barcode value={product.sku.replace('BC', '')} width={2} height={50} displayValue={true} />
                       </div>
                    </div>

                    {/* Quantity Details Section */}
                    <div className="details-section">
                      <div className="section-title">QUANTITY DETAILS</div>
                      <div className="detail-item">
                        <span className="detail-label">Stock on Hand:</span>
                        <span className="detail-value">{product.quantity}</span>
                      </div>
                       {/* Add Status here if needed, perhaps with a color span like in Inventory list */}
                    </div>

                    {/* Pricing Details Section */}
                    <div className="details-section">
                      <div className="section-title">PRICING DETAILS</div>
                      <div className="detail-item">
                        <span className="detail-label">Unit Price:</span>
                        <span className="detail-value">₱{parseFloat(product.unit_price).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Other Details Section */}
                    <div className="details-section">
                      <div className="section-title">OTHER DETAILS</div>
                       <div className="detail-item">
                        <span className="detail-label">Last Updated:</span>
                        <span className="detail-value">{formatDate(product.last_updated)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Remarks:</span>
                        <span className="detail-value">{product.remarks || '-----'}</span>
                      </div>
                    </div>

                  </div>

                  {/* Product Image Area */}
                  <div className="product-image-area">
                     {product.image_data ? (
                      <img 
                        src={`data:image/jpeg;base64,${product.image_data}`} 
                        alt={product.name} 
                        className="main-product-image"
                      />
                    ) : (
                      <div className="main-product-image img-placeholder" />
                    )}
                    {/* Add logic here for displaying multiple thumbnails if available */}
                    <div className="thumbnails-container">
                       {/* Placeholder for thumbnails */}
                       {[...Array(5)].map((_, i) => (
                        <div className="thumb-placeholder" key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Edit Modal */}
        {showEditModal && product && (
          <AddProductModal
            onClose={() => setShowEditModal(false)}
            onAdd={handleEditSubmit}
            initialData={product}
            isEdit
          />
        )}
        {/* Delete Dialog */}
        {showDeleteDialog && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 340, textAlign: 'center' }}>
              <h3>Delete Product</h3>
              <p>Are you sure you want to delete this product?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                <button className="delete-btn" onClick={handleDeleteConfirm}>Delete</button>
                <button className="edit-btn" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 