const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const BUCKET = process.env.SUPABASE_PAYMENT_PROOFS_BUCKET || 'payment-proofs';
const MAX_BYTES = Number(process.env.PAYMENT_PROOF_MAX_BYTES || 5 * 1024 * 1024);
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getProvider() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase';
  return 'local_external';
}

function localRoot() {
  return process.env.WNT_LOCAL_PROOF_STORAGE_DIR
    || path.join(process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local'), 'WrapNTrack', 'payment-proofs');
}

function validateProofFile(file) {
  if (!file) return null;
  if (!MIME_EXT[file.mimetype]) {
    throw new Error('Proof of payment must be a JPG, PNG, or WebP image');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Proof of payment must be ${Math.round(MAX_BYTES / 1024 / 1024)} MB or smaller`);
  }
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  if (originalExt && !['.jpg', '.jpeg', '.png', '.webp'].includes(originalExt)) {
    throw new Error('Proof file extension does not match an allowed image type');
  }
  return true;
}

function buildStoragePath(invoiceId, mimetype) {
  const ext = MIME_EXT[mimetype];
  return `payments/${invoiceId}/${crypto.randomUUID()}${ext}`;
}

async function uploadToSupabase(storagePath, file) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const url = `${base}/storage/v1/object/${BUCKET}/${storagePath}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': file.mimetype,
      'x-upsert': 'false',
    },
    body: file.buffer,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase proof upload failed: ${detail}`);
  }
}

async function uploadToLocalExternal(storagePath, file) {
  const target = path.join(localRoot(), storagePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.buffer);
}

async function uploadPaymentProof({ invoiceId, file }) {
  validateProofFile(file);
  const provider = getProvider();
  const storagePath = buildStoragePath(invoiceId, file.mimetype);
  if (provider === 'supabase') {
    await uploadToSupabase(storagePath, file);
  } else {
    await uploadToLocalExternal(storagePath, file);
  }
  return {
    provider,
    storagePath,
    originalName: file.originalname || null,
    mimeType: file.mimetype,
    fileSize: file.size,
  };
}

async function deletePaymentProof(provider, storagePath) {
  if (!storagePath) return;
  if (provider === 'supabase') {
    const base = process.env.SUPABASE_URL.replace(/\/$/, '');
    await fetch(`${base}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
    });
    return;
  }
  if (provider === 'local_external') {
    await fs.rm(path.join(localRoot(), storagePath), { force: true });
  }
}

async function getSupabaseProofBuffer(storagePath) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/storage/v1/object/${BUCKET}/${storagePath}`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) throw new Error('Proof file not found in Supabase Storage');
  return Buffer.from(await response.arrayBuffer());
}

async function getLocalExternalProofBuffer(storagePath) {
  return fs.readFile(path.join(localRoot(), storagePath));
}

async function getPaymentProofBuffer(provider, storagePath) {
  if (provider === 'supabase') return getSupabaseProofBuffer(storagePath);
  if (provider === 'local_external') return getLocalExternalProofBuffer(storagePath);
  return null;
}

module.exports = {
  MAX_BYTES,
  uploadPaymentProof,
  deletePaymentProof,
  getPaymentProofBuffer,
};
