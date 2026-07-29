import React from 'react';
import './PasswordStrengthMeter.css';

export const scorePasswordStrength = (password) => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
};

export const STRENGTH_META = [
  { label: 'Very weak', className: 'strength-weak' },
  { label: 'Weak', className: 'strength-weak' },
  { label: 'Fair', className: 'strength-fair' },
  { label: 'Strong', className: 'strength-strong' },
  { label: 'Very strong', className: 'strength-strong' }
];

const REQUIREMENTS = [
  { test: (pw) => pw.length >= 8, label: 'At least 8 characters' },
  { test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: 'Upper & lowercase letters' },
  { test: (pw) => /\d/.test(pw), label: 'At least one number' },
  { test: (pw) => /[^A-Za-z0-9]/.test(pw), label: 'At least one special character' }
];

export default function PasswordStrengthMeter({ password, showRequirements = false }) {
  if (!password) return null;

  const strength = scorePasswordStrength(password);
  const meta = STRENGTH_META[strength];

  return (
    <div className="strength-meter">
      <div className="strength-meter-row">
        <div className="strength-bar-track">
          <div className={`strength-bar-fill ${meta.className}`} style={{ width: `${(strength / 4) * 100}%` }} />
        </div>
        <span className={`strength-label ${meta.className}`}>{meta.label}</span>
      </div>
      {showRequirements && (
        <ul className="strength-requirements">
          {REQUIREMENTS.map((req) => (
            <li key={req.label} className={req.test(password) ? 'met' : ''}>
              <span aria-hidden="true">{req.test(password) ? '✓' : '○'}</span> {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
