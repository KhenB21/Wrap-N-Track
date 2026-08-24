import api from '../../api';

function sanitizeFileNamePart(value) {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '').trim();
}

export function getInvoiceFileName(invoice) {
  const clientName = sanitizeFileNamePart(
    invoice.customer_name
      || invoice.order?.customer_name
      || invoice.order?.name
      || invoice.shipped_to
      || invoice.order?.shipped_to
      || 'Client'
  ) || 'Client';
  return `${clientName}.pdf`;
}

export async function openInvoicePdf(invoice, shouldPrint = false) {
  if (!invoice?.id) return;

  const response = await api.get(`/api/invoices/${invoice.id}/pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);

  if (shouldPrint) {
    const popup = window.open(url, '_blank');
    if (popup) {
      popup.onload = () => popup.print();
    }
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = getInvoiceFileName(invoice);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function getInvoiceEmailSubject(invoice) {
  return invoice?.invoice_type === 'REMAINING_BALANCE'
    ? 'Remaining balance invoice from Pensee Gifting Studio'
    : 'Downpayment invoice from Pensee Gifting Studio';
}

export function getInvoiceEmailBody(invoice) {
  return invoice?.invoice_type === 'REMAINING_BALANCE'
    ? 'Good day! This is your invoice for paying REMAINING BALANCE. This is a automated email, please do not reply. Thank you for your order! '
    : 'Good day! This is your Invoice for paying a DOWNPAYMENT. This is a automated email do not reply. Thanks';
}

export function openGmailComposeForInvoice(invoice) {
  if (!invoice?.id) return;

  const to = invoice.customer_email || invoice.order?.customer_email || '';
  const subject = getInvoiceEmailSubject(invoice);
  const body = getInvoiceEmailBody(invoice);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
}

export async function sendInvoiceEmailAutomatically(invoice) {
  if (!invoice?.id) return { success: false, message: 'Invoice not found' };

  const response = await api.post(`/api/invoices/${invoice.id}/email`, {
    subject: getInvoiceEmailSubject(invoice),
    body: getInvoiceEmailBody(invoice),
  });
  return response.data;
}

export async function downloadPaymentProof(invoice) {
  if (!invoice?.id) return;

  const response = await api.get(`/api/invoices/${invoice.id}/payment-proof`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = invoice.payment_proof_original_name || `${invoice.invoice_number || 'invoice'}-payment-proof`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
