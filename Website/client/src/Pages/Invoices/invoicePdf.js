import api from '../../api';

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
  link.download = `${invoice.invoice_number || 'invoice'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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
