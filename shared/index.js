// Shared utilities and validation logic across frontend and backend

const validateUsername = (username) => {
  if (!username) return 'Username is required';
  const trimmed = username.trim();
  if (trimmed.length < 3) return 'Username must be at least 3 characters long';
  if (trimmed.length > 30) return 'Username must be at most 30 characters long';
  return null;
};

const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password.length > 100) return 'Password must be at most 100 characters long';
  return null;
};

module.exports = {
  validateUsername,
  validatePassword
};
