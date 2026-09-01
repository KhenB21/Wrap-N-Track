import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import api from '../../api';
import { useConfirm } from '../../Context/ConfirmContext';
import './ShowcaseGallery.css';

const CATEGORIES  = ['wedding', 'corporate', 'bespoke'];
const EMPTY_FORM  = { title: '', description: '', category: 'wedding' };
const MAX_BYTES   = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_GALLERY = 10;

function buildImgSrc(bundle) {
  if (!bundle?.cover_image) return null;
  return `data:${bundle.cover_image_mime || 'image/jpeg'};base64,${bundle.cover_image}`;
}
function buildGalSrc(img) {
  if (!img?.image_data) return null;
  return `data:${img.image_mime || 'image/jpeg'};base64,${img.image_data}`;
}

function ShowcaseGallery() {
  const confirm = useConfirm();
  // ── Bundle list ────────────────────────────────────────────────────────────
  const [bundles, setBundles]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // ── Form (shared between create + edit) ────────────────────────────────────
  const [form, setForm]               = useState(EMPTY_FORM);
  const [editId, setEditId]           = useState(null);
  const [coverFile, setCoverFile]     = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [formError, setFormError]     = useState('');
  const [saving, setSaving]           = useState(false);
  const coverInputRef = useRef(null);

  // ── Bundle items ───────────────────────────────────────────────────────────
  const [inventory, setInventory]     = useState([]);
  const [invLoading, setInvLoading]   = useState(false);
  const [invSearch, setInvSearch]     = useState('');
  const [bundleItems, setBundleItems] = useState([]);
  const [savingItems, setSavingItems] = useState(false);

  // ── Gallery images ─────────────────────────────────────────────────────────
  // In edit mode: already-uploaded images (from server)
  const [galleryImages, setGalleryImages]       = useState([]);
  // In create mode (or edit): pending images to upload (file + preview)
  const [pendingGallery, setPendingGallery]     = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(''), 3500);
  }, []);

  // ── Load bundles + inventory on mount ─────────────────────────────────────
  const fetchBundles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/showcase/manage/all');
      setBundles(res.data.bundles || []);
    } catch (err) {
      showToast('Failed to load bundles — ' + (err.response?.data?.message || err.message), true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchInventory = useCallback(async () => {
    if (invLoading) return;
    setInvLoading(true);
    try {
      // GET /api/inventory returns { success: true, inventory: [...] }
      const res = await api.get('/api/inventory');
      const items = res.data?.inventory || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setInventory(items);
    } catch (err) {
      showToast('Could not load inventory: ' + (err.response?.data?.message || err.message), true);
    } finally {
      setInvLoading(false);
    }
  }, [invLoading, showToast]);

  useEffect(() => {
    fetchBundles();
    fetchInventory(); // load immediately so it's ready when employee starts filling the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setCoverFile(null);
    setCoverPreview(null);
    setFormError('');
    setBundleItems([]);
    setGalleryImages([]);
    setPendingGallery([]);
    setInvSearch('');
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // ── Enter edit mode ────────────────────────────────────────────────────────
  const startEdit = async (bundle) => {
    setEditId(bundle.id);
    setForm({ title: bundle.title, description: bundle.description, category: bundle.category });
    setCoverFile(null);
    setCoverPreview(buildImgSrc(bundle));
    setFormError('');
    setPendingGallery([]);
    if (coverInputRef.current) coverInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load existing bundle items + gallery
    try {
      const [detailRes, galleryRes] = await Promise.all([
        api.get(`/api/showcase/${bundle.id}`),
        api.get(`/api/showcase/${bundle.id}/gallery`)
      ]);
      setBundleItems(detailRes.data.bundle?.bundle_items || []);
      setGalleryImages(galleryRes.data.images || []);
    } catch {
      showToast('Could not load bundle details.', true);
    }
  };

  // ── Cover image ────────────────────────────────────────────────────────────
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { setFormError('Only JPG, PNG, and WEBP images are allowed.'); return; }
    if (file.size > MAX_BYTES) { setFormError('Cover image must be 5 MB or smaller.'); return; }
    setCoverFile(file);
    setFormError('');
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Field changes ──────────────────────────────────────────────────────────
  const handleFieldChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  // ── Save bundle (create or update) ────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim())       return setFormError('Bundle name is required.');
    if (!form.description.trim()) return setFormError('Description is required.');
    if (!form.category)           return setFormError('Category is required.');
    if (!editId && !coverFile)    return setFormError('Cover image is required.');
    if (bundleItems.length === 0) return setFormError('Add at least one inventory item before saving.');

    setSaving(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('title',       form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category',    form.category);
      if (coverFile) fd.append('cover_image', coverFile);

      let targetId = editId;

      if (editId) {
        // UPDATE existing bundle
        await api.put(`/api/showcase/${editId}`, fd);
        // Replace bundle items
        await api.put(`/api/showcase/${editId}/items`, {
          items: bundleItems.map(b => ({ sku: b.sku, quantity: b.quantity }))
        });
        // Upload any pending gallery images
        for (const img of pendingGallery) {
          const gfd = new FormData();
          gfd.append('image', img.file);
          const gRes = await api.post(`/api/showcase/${editId}/gallery`, gfd);
          setGalleryImages(prev => [...prev, gRes.data.image]);
        }
        setPendingGallery([]);
        showToast('Bundle updated successfully.');
      } else {
        // CREATE new bundle
        const createRes = await api.post('/api/showcase', fd);
        targetId = createRes.data.bundle?.id;
        if (!targetId) throw new Error('No bundle ID returned from server');

        // Save bundle items
        await api.put(`/api/showcase/${targetId}/items`, {
          items: bundleItems.map(b => ({ sku: b.sku, quantity: b.quantity }))
        });
        // Upload gallery images
        for (const img of pendingGallery) {
          const gfd = new FormData();
          gfd.append('image', img.file);
          await api.post(`/api/showcase/${targetId}/gallery`, gfd);
        }
        showToast('Bundle created successfully.');
        resetForm();
      }
      fetchBundles();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Failed to save bundle.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle / Delete ────────────────────────────────────────────────────────
  const handleToggle = async (bundle) => {
    try {
      await api.patch(`/api/showcase/${bundle.id}/toggle`);
      showToast(`Bundle ${bundle.is_active ? 'deactivated' : 'activated'}.`);
      fetchBundles();
    } catch { showToast('Failed to update status.', true); }
  };

  const handleDelete = async (bundle) => {
    if (!(await confirm({ message: `Delete "${bundle.title}"? This cannot be undone.`, danger: true }))) return;
    try {
      await api.delete(`/api/showcase/${bundle.id}`);
      showToast('Bundle deleted.');
      if (editId === bundle.id) resetForm();
      fetchBundles();
    } catch { showToast('Failed to delete bundle.', true); }
  };

  // ── Bundle items ───────────────────────────────────────────────────────────
  const handleAddItem = (inv) => {
    const sku = inv.sku || inv.product_id;
    if (bundleItems.some(b => b.sku === sku)) return;
    setBundleItems(prev => [...prev, {
      sku,
      quantity: 1,
      item_name: inv.name || inv.product_name,
      unit_price: inv.unit_price
    }]);
  };

  const handleRemoveItem = (sku) => setBundleItems(prev => prev.filter(b => b.sku !== sku));

  const handleItemQty = (sku, val) => {
    const n = Math.max(1, parseInt(val, 10) || 1);
    setBundleItems(prev => prev.map(b => b.sku === sku ? { ...b, quantity: n } : b));
  };

  // Save items separately (edit mode convenience button)
  const handleSaveItems = async () => {
    if (!editId) return;
    if (bundleItems.length === 0) return showToast('Add at least one item first.', true);
    setSavingItems(true);
    try {
      const res = await api.put(`/api/showcase/${editId}/items`, {
        items: bundleItems.map(b => ({ sku: b.sku, quantity: b.quantity }))
      });
      setBundleItems(res.data.items || bundleItems);
      showToast('Bundle items saved.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save items.', true);
    } finally {
      setSavingItems(false);
    }
  };

  // ── Gallery ────────────────────────────────────────────────────────────────
  const totalGallery = galleryImages.length + pendingGallery.length;

  const handleGalleryFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (totalGallery + files.length > MAX_GALLERY) {
      showToast(`Max ${MAX_GALLERY} gallery images per bundle.`, true);
      return;
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) { showToast(`${file.name}: only JPG/PNG/WEBP.`, true); continue; }
      if (file.size > MAX_BYTES) { showToast(`${file.name}: must be under 5 MB.`, true); continue; }

      if (editId) {
        // Edit mode: upload immediately
        setGalleryUploading(true);
        try {
          const fd = new FormData();
          fd.append('image', file);
          const res = await api.post(`/api/showcase/${editId}/gallery`, fd);
          setGalleryImages(prev => [...prev, res.data.image]);
        } catch (err) {
          showToast(err.response?.data?.message || 'Upload failed.', true);
        } finally {
          setGalleryUploading(false);
        }
      } else {
        // Create mode: store locally until bundle is created
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPendingGallery(prev => [...prev, { file, preview: ev.target.result }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleGalleryDelete = async (imageId) => {
    if (!editId) return;
    if (!(await confirm({ message: 'Remove this gallery image?', danger: true }))) return;
    try {
      await api.delete(`/api/showcase/${editId}/gallery/${imageId}`);
      setGalleryImages(prev => prev.filter(img => img.id !== imageId));
      showToast('Gallery image removed.');
    } catch { showToast('Failed to remove image.', true); }
  };

  const handlePendingDelete = (idx) => {
    setPendingGallery(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Inventory filter ───────────────────────────────────────────────────────
  const q = invSearch.toLowerCase().trim();
  const filteredInventory = q
    ? inventory.filter(inv => {
        const name = (inv.name || inv.product_name || '').toLowerCase();
        const sku  = (inv.sku  || inv.product_id   || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
      })
    : inventory;
  const alreadyAdded = new Set(bundleItems.map(b => b.sku));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="sg-layout">
      <Sidebar />
      <div className="sg-main">
        <TopBar showSearch={false} />

        {toast && (
          <div className={`sg-toast ${toast.isError ? 'sg-toast--error' : 'sg-toast--success'}`}>
            {toast.msg}
          </div>
        )}

        <div className="sg-content">
          <header className="sg-page-header">
            <h1 className="sg-page-title">Showcase Gallery</h1>
            <p className="sg-page-sub">Manage bundles displayed on the Wedding, Corporate &amp; Bespoke pages.</p>
          </header>

          {/* ── Form Panel ─────────────────────────────────────────────────── */}
          <section className="sg-form-panel">
            <h2 className="sg-panel-title">{editId ? 'Edit Bundle' : 'Create New Bundle'}</h2>

            <form className="sg-form" onSubmit={handleSave} encType="multipart/form-data">

              {/* ── Section 1: General Info ─────────────────────────────── */}
              <div className="sg-section-label">General Information</div>
              <div className="sg-fields">
                <label className="sg-label">
                  Bundle Name <span className="sg-required">*</span>
                  <input name="title" value={form.title} onChange={handleFieldChange}
                    className="sg-input" placeholder="e.g. Modern Romantic" maxLength={255} />
                </label>
                <label className="sg-label">
                  Category <span className="sg-required">*</span>
                  <select name="category" value={form.category} onChange={handleFieldChange} className="sg-select">
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </label>
                <label className="sg-label sg-label--full">
                  Description <span className="sg-required">*</span>
                  <textarea name="description" value={form.description} onChange={handleFieldChange}
                    className="sg-textarea" rows={3} placeholder="Describe this bundle in a few words…" />
                </label>
              </div>

              {/* ── Section 2: Cover Image ──────────────────────────────── */}
              <div className="sg-section-label">Cover Image <span className="sg-required">*</span></div>
              <div className="sg-image-upload-area" onClick={() => coverInputRef.current?.click()}>
                {coverPreview
                  ? <img src={coverPreview} alt="preview" className="sg-image-preview" />
                  : <div className="sg-image-placeholder">
                      <span className="sg-image-icon">🖼</span>
                      <span>Click to upload cover image</span>
                      <span className="sg-image-hint">JPG · PNG · WEBP · max 5 MB · one image only</span>
                    </div>
                }
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className="sg-file-input" onChange={handleCoverChange} />
              </div>
              {coverPreview && (
                <button type="button" className="sg-change-image-btn"
                  onClick={() => coverInputRef.current?.click()}>Change Cover Image</button>
              )}

              {/* ── Section 3: Gallery Images ───────────────────────────── */}
              <div className="sg-section-label">
                Gallery Images
                <span className="sg-section-count">{totalGallery} / {MAX_GALLERY}</span>
              </div>
              <p className="sg-sub-hint">
                Up to {MAX_GALLERY} additional photos shown in the bundle's image carousel.
              </p>

              {/* Gallery grid: saved images (edit) + pending images (create) */}
              {(galleryImages.length > 0 || pendingGallery.length > 0) && (
                <div className="sg-gallery-grid">
                  {/* Already-uploaded images (edit mode) */}
                  {galleryImages.map(img => (
                    <div key={img.id} className="sg-gallery-cell">
                      <img src={buildGalSrc(img)} alt="" className="sg-gallery-thumb" />
                      {editId && (
                        <button type="button" className="sg-gallery-remove"
                          onClick={() => handleGalleryDelete(img.id)} title="Remove">✕</button>
                      )}
                    </div>
                  ))}
                  {/* Pending images (create mode or before upload in edit) */}
                  {pendingGallery.map((img, idx) => (
                    <div key={`pending-${idx}`} className="sg-gallery-cell sg-gallery-cell--pending">
                      <img src={img.preview} alt="" className="sg-gallery-thumb" />
                      <button type="button" className="sg-gallery-remove"
                        onClick={() => handlePendingDelete(idx)} title="Remove">✕</button>
                      <div className="sg-gallery-pending-badge">Pending</div>
                    </div>
                  ))}
                </div>
              )}

              {totalGallery < MAX_GALLERY && (
                <div className="sg-gallery-upload-wrap">
                  <button type="button"
                    className="sg-btn sg-btn--ghost sg-gallery-upload-btn"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryUploading}>
                    {galleryUploading ? 'Uploading…' : '+ Add Gallery Photos'}
                  </button>
                  <input ref={galleryInputRef} type="file" multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sg-file-input" onChange={handleGalleryFile} />
                </div>
              )}

              {/* ── Section 4: Bundle Items ─────────────────────────────── */}
              <div className="sg-section-label">
                Bundle Items <span className="sg-required">*</span>
                {bundleItems.length > 0 && (
                  <span className="sg-section-count">{bundleItems.length} selected</span>
                )}
              </div>
              <p className="sg-sub-hint">
                Select inventory items included in this bundle. Customers' orders will auto-expand these items.
              </p>

              <div className="sg-items-layout">
                {/* Inventory picker */}
                <div className="sg-inv-picker">
                  <div className="sg-inv-search-wrap">
                    <input className="sg-input sg-inv-search"
                      placeholder="Search inventory by name or SKU…"
                      value={invSearch}
                      onChange={e => setInvSearch(e.target.value)} />
                  </div>
                  <div className="sg-inv-list">
                    {invLoading ? (
                      <div className="sg-inv-empty sg-inv-loading">
                        <span className="sg-inv-spinner" />
                        Loading inventory…
                      </div>
                    ) : inventory.length === 0 ? (
                      <div className="sg-inv-empty">No inventory items found.</div>
                    ) : filteredInventory.length === 0 ? (
                      <div className="sg-inv-empty">No results for "{invSearch}".</div>
                    ) : (
                      filteredInventory.slice(0, 50).map(inv => {
                        const sku  = inv.sku  || inv.product_id;
                        const name = inv.name || inv.product_name;
                        const added = alreadyAdded.has(sku);
                        return (
                          <div key={sku} className={`sg-inv-row ${added ? 'sg-inv-row--added' : ''}`}>
                            <div className="sg-inv-info">
                              <span className="sg-inv-name">{name}</span>
                              <span className="sg-inv-sku">{sku}</span>
                            </div>
                            <button type="button"
                              className={`sg-inv-add-btn ${added ? 'sg-inv-add-btn--added' : ''}`}
                              onClick={() => handleAddItem(inv)} disabled={added}>
                              {added ? '✓ Added' : '+ Add'}
                            </button>
                          </div>
                        );
                      })
                    )}
                    {!invLoading && filteredInventory.length > 50 && (
                      <div className="sg-inv-truncated">
                        Showing 50 of {filteredInventory.length} — refine your search.
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected items */}
                <div className="sg-current-items">
                  <div className="sg-current-items-header">Selected Items</div>
                  {bundleItems.length === 0 ? (
                    <div className="sg-current-empty">No items added yet. Use the search to add inventory.</div>
                  ) : (
                    <ul className="sg-items-list">
                      {bundleItems.map(item => (
                        <li key={item.sku} className="sg-item-row">
                          <span className="sg-item-name">{item.item_name}</span>
                          <div className="sg-item-qty-wrap">
                            <button type="button" className="sg-qty-btn"
                              onClick={() => handleItemQty(item.sku, item.quantity - 1)}>−</button>
                            <input type="number" min="1" className="sg-qty-input"
                              value={item.quantity}
                              onChange={e => handleItemQty(item.sku, e.target.value)} />
                            <button type="button" className="sg-qty-btn"
                              onClick={() => handleItemQty(item.sku, item.quantity + 1)}>+</button>
                          </div>
                          <button type="button" className="sg-item-remove"
                            onClick={() => handleRemoveItem(item.sku)}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Quick-save items button (edit mode) */}
                  {editId && bundleItems.length > 0 && (
                    <button type="button"
                      className="sg-btn sg-btn--ghost sg-save-items-btn"
                      onClick={handleSaveItems} disabled={savingItems}>
                      {savingItems ? 'Saving…' : 'Save Items Now'}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Form error + actions ─────────────────────────────────── */}
              {formError && <p className="sg-form-error">{formError}</p>}

              <div className="sg-form-actions">
                <button type="submit" className="sg-btn sg-btn--primary" disabled={saving}>
                  {saving
                    ? (editId ? 'Updating…' : 'Creating…')
                    : (editId ? 'Update Bundle' : 'Save Bundle')}
                </button>
                {editId && (
                  <button type="button" className="sg-btn sg-btn--ghost" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* ── Bundle List ────────────────────────────────────────────────── */}
          <section className="sg-list-panel">
            <h2 className="sg-panel-title">
              All Bundles
              <span className="sg-bundle-count">{bundles.length}</span>
            </h2>

            {loading ? (
              <div className="sg-loading">Loading bundles…</div>
            ) : bundles.length === 0 ? (
              <div className="sg-empty">No bundles yet. Create your first one above.</div>
            ) : (
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundles.map(b => (
                      <tr key={b.id} className={b.is_active ? '' : 'sg-row--inactive'}>
                        <td>
                          {b.cover_image
                            ? <img src={buildImgSrc(b)} alt={b.title} className="sg-thumb" />
                            : <div className="sg-thumb-placeholder">No img</div>
                          }
                        </td>
                        <td>
                          <div className="sg-bundle-title">{b.title}</div>
                          <div className="sg-bundle-desc">{b.description}</div>
                        </td>
                        <td>
                          <span className={`sg-cat-badge sg-cat-badge--${b.category}`}>
                            {b.category.charAt(0).toUpperCase() + b.category.slice(1)}
                          </span>
                        </td>
                        <td>
                          <span className={`sg-status ${b.is_active ? 'sg-status--active' : 'sg-status--inactive'}`}>
                            {b.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="sg-date">
                          {new Date(b.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td>
                          <div className="sg-actions">
                            <button className="sg-action-btn sg-action-btn--edit" onClick={() => startEdit(b)}>
                              ✏️ Edit
                            </button>
                            <button
                              className={`sg-action-btn ${b.is_active ? 'sg-action-btn--deactivate' : 'sg-action-btn--activate'}`}
                              onClick={() => handleToggle(b)}>
                              {b.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                            </button>
                            <button className="sg-action-btn sg-action-btn--delete" onClick={() => handleDelete(b)}>
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default withEmployeeAuth(ShowcaseGallery);
