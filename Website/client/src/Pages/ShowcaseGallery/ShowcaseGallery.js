import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import api from '../../api';
import './ShowcaseGallery.css';

const CATEGORIES = ['wedding', 'corporate', 'bespoke'];
const EMPTY_FORM = { title: '', description: '', category: 'wedding' };
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function buildImgSrc(bundle) {
  if (!bundle?.cover_image) return null;
  const mime = bundle.cover_image_mime || 'image/jpeg';
  return `data:${mime};base64,${bundle.cover_image}`;
}

function ShowcaseGallery() {
  const [bundles, setBundles]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [editId, setEditId]             = useState(null);
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError]       = useState('');
  const [toast, setToast]               = useState('');
  const fileInputRef = useRef(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchBundles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/showcase/manage/all');
      setBundles(res.data.bundles || []);
    } catch (err) {
      showToast('Failed to load bundles — ' + (err.response?.data?.message || err.message), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBundles(); }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(''), 3500);
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setImageFile(null);
    setImagePreview(null);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (bundle) => {
    setEditId(bundle.id);
    setForm({ title: bundle.title, description: bundle.description, category: bundle.category });
    setImageFile(null);
    setImagePreview(buildImgSrc(bundle));
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFieldChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFormError('Only JPG, PNG, and WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFormError('Image must be 5 MB or smaller.');
      return;
    }
    setImageFile(file);
    setFormError('');
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim())       return setFormError('Bundle name is required.');
    if (!form.description.trim()) return setFormError('Description is required.');
    if (!form.category)           return setFormError('Category is required.');
    if (!editId && !imageFile)    return setFormError('Cover image is required.');

    setSaving(true);
    setFormError('');

    const fd = new FormData();
    fd.append('title',       form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('category',    form.category);
    if (imageFile) fd.append('cover_image', imageFile);

    try {
      if (editId) {
        await api.put(`/api/showcase/${editId}`, fd);
        showToast('Bundle updated successfully.');
      } else {
        await api.post('/api/showcase', fd);
        showToast('Bundle created successfully.');
      }
      resetForm();
      fetchBundles();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save bundle.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (bundle) => {
    try {
      await api.patch(`/api/showcase/${bundle.id}/toggle`);
      showToast(`Bundle ${bundle.is_active ? 'deactivated' : 'activated'}.`);
      fetchBundles();
    } catch (err) {
      showToast('Failed to update status.', true);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (bundle) => {
    if (!window.confirm(`Delete "${bundle.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/showcase/${bundle.id}`);
      showToast('Bundle deleted.');
      if (editId === bundle.id) resetForm();
      fetchBundles();
    } catch (err) {
      showToast('Failed to delete bundle.', true);
    }
  };

  return (
    <div className="sg-layout">
      <Sidebar />
      <div className="sg-main">
        <TopBar />

        {/* Toast */}
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

          {/* ── Form Panel ── */}
          <section className="sg-form-panel">
            <h2 className="sg-panel-title">{editId ? 'Edit Bundle' : 'Add New Bundle'}</h2>

            <form className="sg-form" onSubmit={handleSave} encType="multipart/form-data">
              {/* Image upload */}
              <div className="sg-image-upload-area" onClick={() => fileInputRef.current?.click()}>
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="sg-image-preview" />
                  : <div className="sg-image-placeholder">
                      <span className="sg-image-icon">🖼</span>
                      <span>Click to upload cover image</span>
                      <span className="sg-image-hint">JPG, PNG, WEBP · max 5 MB · one image only</span>
                    </div>
                }
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sg-file-input"
                  onChange={handleImageChange}
                />
              </div>
              {imagePreview && (
                <button
                  type="button"
                  className="sg-change-image-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Image
                </button>
              )}

              {/* Fields */}
              <div className="sg-fields">
                <label className="sg-label">
                  Bundle Name <span className="sg-required">*</span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleFieldChange}
                    className="sg-input"
                    placeholder="e.g. Modern Romantic"
                    maxLength={255}
                  />
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
                  Short Description <span className="sg-required">*</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFieldChange}
                    className="sg-textarea"
                    rows={3}
                    placeholder="Describe this bundle in a few words…"
                  />
                </label>
              </div>

              {formError && <p className="sg-form-error">{formError}</p>}

              <div className="sg-form-actions">
                <button type="submit" className="sg-btn sg-btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : editId ? 'Update Bundle' : 'Save Bundle'}
                </button>
                {editId && (
                  <button type="button" className="sg-btn sg-btn--ghost" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* ── Bundle List ── */}
          <section className="sg-list-panel">
            <h2 className="sg-panel-title">
              All Bundles
              <span className="sg-bundle-count">{bundles.length}</span>
            </h2>

            {loading ? (
              <div className="sg-loading">Loading bundles…</div>
            ) : bundles.length === 0 ? (
              <div className="sg-empty">No bundles yet. Add your first one above.</div>
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
                            <button className="sg-action-btn sg-action-btn--edit" onClick={() => startEdit(b)} title="Edit">
                              ✏️ Edit
                            </button>
                            <button
                              className={`sg-action-btn ${b.is_active ? 'sg-action-btn--deactivate' : 'sg-action-btn--activate'}`}
                              onClick={() => handleToggle(b)}
                              title={b.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {b.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                            </button>
                            <button className="sg-action-btn sg-action-btn--delete" onClick={() => handleDelete(b)} title="Delete">
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
