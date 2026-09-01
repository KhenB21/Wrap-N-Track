import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../api';
import PasswordStrengthMeter, { scorePasswordStrength } from './PasswordStrengthMeter';
import ConfirmDialog from './ConfirmDialog';
import './UserFormModal.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s()+-]{7,20}$/;

const DEPARTMENT_SUGGESTIONS = [
  'Sales', 'Business Development', 'Creatives', 'Operations', 'Warehouse', 'Management', 'Customer Support'
];

const emptyForm = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  phone_number: '',
  role: '',
  department: '',
  is_active: true,
  address: '',
  notes: ''
};

const getInitials = (firstName, lastName, fallback) => {
  const source = [firstName, lastName].filter(Boolean).join(' ') || fallback || '';
  const parts = source.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'U';
};

export default function UserFormModal({ mode, user, roles, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const initialForm = useMemo(() => {
    if (isEdit && user) {
      return {
        first_name: user.first_name || '',
        last_name: user.last_name || (!user.first_name ? user.name || '' : ''),
        username: user.username || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        role: user.role || '',
        department: user.department || '',
        is_active: user.is_active !== false,
        address: user.address || '',
        notes: user.notes || ''
      };
    }
    return emptyForm;
  }, [isEdit, user]);

  const [formData, setFormData] = useState(initialForm);
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [visibility, setVisibility] = useState({ password: false, confirmPassword: false });
  const [errors, setErrors] = useState({});
  const [availability, setAvailability] = useState({ emailTaken: false, usernameTaken: false, checking: false });
  const [rolePermissions, setRolePermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const fileInputRef = useRef();
  const availabilityTimer = useRef();

  const isDirty = useMemo(() => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialForm);
    return formChanged || passwordData.password.length > 0 || !!profileFile;
  }, [formData, initialForm, passwordData.password, profileFile]);

  useEffect(() => {
    if (!formData.role) {
      setRolePermissions([]);
      return;
    }
    let cancelled = false;
    api.get(`/api/account-management/roles/${formData.role}/permissions`)
      .then((res) => {
        if (!cancelled) setRolePermissions(res.data.permissions || []);
      })
      .catch(() => {
        if (!cancelled) setRolePermissions([]);
      });
    return () => { cancelled = true; };
  }, [formData.role]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const checkAvailability = useCallback(() => {
    if (availabilityTimer.current) clearTimeout(availabilityTimer.current);
    availabilityTimer.current = setTimeout(async () => {
      if (!formData.email && !formData.username) return;
      setAvailability((prev) => ({ ...prev, checking: true }));
      try {
        const params = {};
        if (formData.email) params.email = formData.email;
        if (formData.username) params.username = formData.username;
        if (isEdit) params.excludeId = user.user_id;
        const res = await api.get('/api/account-management/users-check-availability', { params });
        setAvailability({ emailTaken: res.data.emailTaken, usernameTaken: res.data.usernameTaken, checking: false });
      } catch {
        setAvailability((prev) => ({ ...prev, checking: false }));
      }
    }, 400);
  }, [formData.email, formData.username, isEdit, user]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'Only PNG, JPG, JPEG, or WEBP images are allowed.' }));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'Image must be smaller than 5MB.' }));
      e.target.value = '';
      return;
    }
    setErrors((prev) => ({ ...prev, photo: undefined }));
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!EMAIL_REGEX.test(formData.email)) newErrors.email = 'Enter a valid email address';
    else if (availability.emailTaken) newErrors.email = 'This email is already in use';
    if (formData.phone_number && !PHONE_REGEX.test(formData.phone_number)) {
      newErrors.phone_number = 'Enter a valid phone number';
    }
    if (formData.username && availability.usernameTaken) newErrors.username = 'This username is already taken';
    if (!formData.role) newErrors.role = 'Role is required';

    const pw = passwordData.password;
    if (!isEdit || pw.length > 0) {
      if (!isEdit && !pw) newErrors.password = 'Password is required';
      if (pw && scorePasswordStrength(pw) < 2) newErrors.password = 'Choose a stronger password';
      if (pw && pw !== passwordData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Human-readable list of everything still missing/invalid, shown next to the
  // submit button so a disabled "Create User" isn't a mystery.
  const missingReasons = useMemo(() => {
    const reasons = [];
    if (!formData.first_name.trim()) reasons.push('First name');
    if (!formData.last_name.trim()) reasons.push('Last name');
    if (!formData.email.trim()) reasons.push('Email address');
    else if (!EMAIL_REGEX.test(formData.email)) reasons.push('A valid email address');
    else if (availability.emailTaken) reasons.push('A different email (already in use)');
    if (formData.username && availability.usernameTaken) reasons.push('A different username (already taken)');
    if (!formData.role) reasons.push('Role');

    const pw = passwordData.password;
    const confirmPw = passwordData.confirmPassword;
    if (!isEdit && !pw) {
      reasons.push('Password');
    } else if (pw) {
      if (scorePasswordStrength(pw) < 2) reasons.push('A stronger password');
      if (!confirmPw) reasons.push('Confirm password');
      else if (pw !== confirmPw) reasons.push('Matching passwords (they don’t match)');
    }

    return reasons;
  }, [formData, passwordData, availability, isEdit]);

  const isValid = missingReasons.length === 0;

  const passwordsMismatch = !!passwordData.password && !!passwordData.confirmPassword
    && passwordData.password !== passwordData.confirmPassword;

  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirmSave(true);
  };

  const performSave = async () => {
    setShowConfirmSave(false);
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('first_name', formData.first_name.trim());
      payload.append('last_name', formData.last_name.trim());
      payload.append('username', formData.username.trim());
      payload.append('email', formData.email.trim());
      payload.append('phone_number', formData.phone_number.trim());
      payload.append('role', formData.role);
      payload.append('department', formData.department.trim());
      payload.append('address', formData.address.trim());
      payload.append('notes', formData.notes.trim());
      if (isEdit) payload.append('is_active', formData.is_active);
      if (passwordData.password) payload.append('password', passwordData.password);
      if (profileFile) payload.append('profilePicture', profileFile);

      if (isEdit) {
        await api.put(`/api/account-management/users/${user.user_id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/api/account-management/users', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      onSaved(isEdit ? 'Account updated successfully.' : 'Account created successfully.');
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.response?.data?.message || 'Failed to save user' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty && !submitting) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const avatarSrc = profilePreview
    || (isEdit && user?.profile_picture_data ? `data:image/jpeg;base64,${user.profile_picture_data}` : null);

  return (
    <div className="modal-overlay" onClick={handleCloseAttempt}>
      <div className="user-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-form-header">
          <div className="user-form-title-group">
            <span className="user-form-icon" aria-hidden="true">{isEdit ? '✏️' : '👤'}</span>
            <div>
              <p className="user-form-eyebrow">Account Management</p>
              <h2>{isEdit ? 'Edit User' : 'Add New User'}</h2>
              <p className="user-form-subtitle">
                {isEdit ? 'Update this employee’s profile, role, and access.' : 'Create a new employee account with the correct role and access.'}
              </p>
            </div>
          </div>
          <button type="button" className="user-form-close" onClick={handleCloseAttempt} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmitClick} className="user-form-body">
          {errors.submit && <div className="form-banner banner-error" role="alert">{errors.submit}</div>}

          {/* Section 1 — User Information */}
          <section className="user-form-section">
            <h3 className="user-form-section-title">User Information</h3>
            <div className="user-form-photo-row">
              <div className="user-form-avatar-wrap">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile preview" className="user-form-avatar-img" />
                ) : (
                  <div className="user-form-avatar-fallback">
                    {getInitials(formData.first_name, formData.last_name)}
                  </div>
                )}
                <button
                  type="button"
                  className="user-form-avatar-btn"
                  onClick={() => fileInputRef.current.click()}
                  aria-label="Upload profile picture"
                >
                  📷
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
              <div className="user-form-photo-hint">
                <span>Profile Picture</span>
                <p>PNG, JPG or WEBP. Max 5MB.</p>
                {errors.photo && <p className="field-hint hint-error">{errors.photo}</p>}
              </div>
            </div>

            <div className="user-form-grid">
              <div className="form-group">
                <label>First Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Juan"
                  className={errors.first_name ? 'input-error' : ''}
                />
                {errors.first_name && <p className="field-hint hint-error">{errors.first_name}</p>}
              </div>
              <div className="form-group">
                <label>Last Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Dela Cruz"
                  className={errors.last_name ? 'input-error' : ''}
                />
                {errors.last_name && <p className="field-hint hint-error">{errors.last_name}</p>}
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  onBlur={checkAvailability}
                  placeholder="Optional display handle"
                  className={errors.username ? 'input-error' : ''}
                />
                {errors.username && <p className="field-hint hint-error">{errors.username}</p>}
              </div>
              <div className="form-group">
                <label>Email Address <span className="required-asterisk">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={checkAvailability}
                  placeholder="name@company.com"
                  className={errors.email ? 'input-error' : ''}
                />
                {errors.email && <p className="field-hint hint-error">{errors.email}</p>}
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className={errors.phone_number ? 'input-error' : ''}
                />
                {errors.phone_number && <p className="field-hint hint-error">{errors.phone_number}</p>}
              </div>
            </div>
          </section>

          {/* Section 2 — Account Information */}
          <section className="user-form-section">
            <h3 className="user-form-section-title">Account Information</h3>
            <div className="user-form-grid">
              <div className="form-group">
                <label>Role <span className="required-asterisk">*</span></label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className={errors.role ? 'input-error' : ''}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                {errors.role && <p className="field-hint hint-error">{errors.role}</p>}
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  list="department-suggestions"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="e.g. Sales"
                />
                <datalist id="department-suggestions">
                  {DEPARTMENT_SUGGESTIONS.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              {isEdit && (
                <div className="form-group form-group--checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                    />
                    <span>Account active</span>
                  </label>
                </div>
              )}
            </div>

            {formData.role && (
              <div className="user-form-permissions">
                <span className="user-form-permissions-label">This role can access:</span>
                <div className="permission-chip-list">
                  {rolePermissions.length === 0 ? (
                    <span className="permission-chip-empty">No specific features assigned</span>
                  ) : (
                    rolePermissions.map((perm) => (
                      <span key={perm.feature_id} className="permission-chip">{perm.name}</span>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section 3 — Security */}
          <section className="user-form-section">
            <h3 className="user-form-section-title">Security</h3>
            {isEdit && <p className="user-form-hint">Leave both fields blank to keep the current password.</p>}
            <div className="user-form-password-stack">
              <div className="form-group">
                <label>{isEdit ? 'New Password' : 'Password'} {!isEdit && <span className="required-asterisk">*</span>}</label>
                <div className="password-input-wrap">
                  <input
                    type={visibility.password ? 'text' : 'password'}
                    value={passwordData.password}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={isEdit ? 'Leave blank to keep current password' : 'Create a secure password'}
                    autoComplete="new-password"
                    className={errors.password ? 'input-error' : ''}
                  />
                  <button
                    type="button"
                    className="visibility-toggle"
                    tabIndex={-1}
                    aria-label={visibility.password ? 'Hide password' : 'Show password'}
                    onClick={() => setVisibility((prev) => ({ ...prev, password: !prev.password }))}
                  >
                    {visibility.password ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password && <p className="field-hint hint-error">{errors.password}</p>}
              </div>
              <div className="form-group">
                <label>Confirm Password {!isEdit && <span className="required-asterisk">*</span>}</label>
                <div className="password-input-wrap">
                  <input
                    type={visibility.confirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={errors.confirmPassword || passwordsMismatch ? 'input-error' : ''}
                  />
                  <button
                    type="button"
                    className="visibility-toggle"
                    tabIndex={-1}
                    aria-label={visibility.confirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setVisibility((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  >
                    {visibility.confirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.confirmPassword ? (
                  <p className="field-hint hint-error">{errors.confirmPassword}</p>
                ) : passwordsMismatch ? (
                  <p className="field-hint hint-error">Passwords do not match</p>
                ) : passwordData.confirmPassword && passwordData.password === passwordData.confirmPassword ? (
                  <p className="field-hint hint-success">✓ Passwords match</p>
                ) : null}
              </div>
            </div>
            <PasswordStrengthMeter password={passwordData.password} showRequirements />
          </section>

          {/* Section 4 — Additional Information */}
          <section className="user-form-section">
            <h3 className="user-form-section-title">Additional Information</h3>
            <div className="user-form-grid user-form-grid-full">
              <div className="form-group">
                <label>Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, city, province"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Internal notes about this employee (optional)"
                />
              </div>
            </div>
          </section>

          {!isValid && missingReasons.length > 0 && (
            <p className="user-form-missing-hint" role="status">
              Still needed: {missingReasons.join(', ')}
            </p>
          )}

          <div className="user-form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseAttempt} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? <span className="spinner-sm" /> : (isEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={showConfirmSave}
        title={isEdit ? 'Save changes?' : 'Create this user?'}
        message={isEdit
          ? `This will update ${formData.first_name} ${formData.last_name}'s account.`
          : `This will create a new ${formData.role || 'employee'} account for ${formData.first_name} ${formData.last_name}.`}
        confirmLabel={isEdit ? 'Save Changes' : 'Create User'}
        onConfirm={performSave}
        onCancel={() => setShowConfirmSave(false)}
      />

      <ConfirmDialog
        open={showConfirmDiscard}
        title="Discard unsaved changes?"
        message="You have unsaved changes on this form. Closing now will discard them."
        confirmLabel="Discard"
        tone="danger"
        onConfirm={() => { setShowConfirmDiscard(false); onClose(); }}
        onCancel={() => setShowConfirmDiscard(false)}
      />
    </div>
  );
}
