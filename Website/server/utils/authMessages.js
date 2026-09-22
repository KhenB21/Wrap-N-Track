/* User-facing login / registration messages, shared by routes/auth.js
   (customer + unified login) and index.js (employee login/register) so every
   form on web and mobile says the same thing for the same problem.

   Responses also carry `field` ('name' | 'email' | 'username' | 'password' |
   'role') so a form can show the message under the right input.

   Note: login says whether the account or the password was wrong. Registration
   already reveals whether an email is taken, so a generic "invalid username or
   password" hid nothing — it only left users guessing which part to fix. */

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

module.exports = {
  EMAIL_REGEX,
  PASSWORD_PATTERN,
  PASSWORD_RULE: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.',
  NO_ACCOUNT: 'No account found with that email or username. Check the spelling or create an account.',
  INCORRECT_PASSWORD: 'Incorrect password. Please try again, or use "Forgot password" to reset it.',
  EMAIL_TAKEN: 'An account with this email already exists. Please log in instead, or use a different email.',
};
