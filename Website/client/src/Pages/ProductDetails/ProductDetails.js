import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import AddProductModal from '../Inventory/AddProductModal';
import '../Inventory/Inventory.css';

export default function ProductDetails() {
  const { sku } = useParams();
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selected, setSelected] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/api/inventory`);
        const data = await res.json();
        setProducts(data);
        const found = data.find(p => p.sku === sku);
        setProduct(found);
        // Select the current product by default
        setSelected(sel => ({ ...sel, [sku]: true }));
      } catch (err) {
        setProducts([]);
        setProduct(null);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [sku]);

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

  const handleCheckbox = (sku) => {
    setSelected(sel => ({ ...sel, [sku]: !sel[sku] }));
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        <div className="product-details-layout" style={{ display: 'flex', gap: 32, marginTop: 24 }}>
          {/* Product List */}
          <div className="product-list" style={{ minWidth: 260, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 20, height: 'fit-content' }}>
            <div className="product-list-title" style={{ fontWeight: 700, marginBottom: 16 }}>PRODUCTS</div>
            {products.map((p) => (
              <div
                className={`product-list-item${p.sku === sku ? ' selected' : ''}`}
                key={p.sku}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer', background: p.sku === sku ? '#f3f3f7' : 'transparent', borderRadius: 6, marginBottom: 2
                }}
                onClick={() => navigate(`/product-details/${p.sku}`)}
              >
                <input type="checkbox" checked={!!selected[p.sku]} onChange={e => { e.stopPropagation(); handleCheckbox(p.sku); }} />
                <img 
                  src={p.image_data ? `data:image/jpeg;base64,${p.image_data}` : ''} 
                  alt={p.name} 
                  className="product-img-thumb" 
                  style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee', background: '#e0e0e0' }} 
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{p.description}</div>
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>Qty: {p.quantity}</div>
              </div>
            ))}
          </div>

          {/* Product Details */}
          <div className="product-details-panel" style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 32, minWidth: 0 }}>
            {loading ? (
              <div>Loading...</div>
            ) : !product ? (
              <div>Product not found.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{product.name}</div>
                    <div style={{ fontSize: 17, color: '#888', marginBottom: 8 }}>{product.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="icon-btn" title="Edit" onClick={handleEdit} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                    <button className="icon-btn" title="Delete" onClick={handleDelete} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
                {/* Details Sections */}
                <div style={{ display: 'flex', gap: 32 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 600, color: '#888', marginBottom: 4 }}>PRODUCT DETAILS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>Stock Keeping Unit (SKU)</span> <span>{product.sku}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>Category</span> <span>{product.category}</span></div>
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 600, color: '#888', marginBottom: 4 }}>QUANTITY DETAILS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>Stock Quantity</span> <span>{product.quantity}</span></div>
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 600, color: '#888', marginBottom: 4 }}>PRICING DETAILS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>Price per Unit</span> <span>{product.unit_price}</span></div>
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 600, color: '#888', marginBottom: 4 }}>OTHER DETAILS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>Remarks</span> <span>-----</span></div>
                    </div>
                  </div>
                  <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    {product.image_data ? (
                      <img 
                        src={`data:image/jpeg;base64,${product.image_data}`} 
                        alt={product.name} 
                        style={{ width: 220, height: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }} 
                      />
                    ) : (
                      <div className="img-placeholder" style={{ width: 220, height: 160, borderRadius: 10, border: '1px solid #eee' }} />
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      {/* Thumbnails placeholder */}
                      {[...Array(5)].map((_, i) => (
                        <div className="thumb-placeholder" key={i} style={{ width: 36, height: 36, background: '#e0e0e0', borderRadius: 6 }} />
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