// Turns a failed login/sign-up request into a message a person can act on.
// The server's own message wins (it already says which field is wrong); this
// only fills the gaps it can't cover — no connection, timeouts, rate limits.
// Keep in sync with Website/client/src/constants/authErrors.js.
export function getAuthErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }
    return "Can't reach the server. Check your internet connection and try again.";
  }
  const { status, data } = err.response;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return fallback;
}

// Which form field the server blamed ('name' | 'email' | 'username' | 'password').
export const getAuthErrorField = (err) => err?.response?.data?.field || null;
