const sanitize = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim().slice(0, 1000);
};
const validatePhone = (phone) => {
  if (!phone) return false;
  const clean = String(phone).replace(/\D/g, '');
  return clean.length >= 9 && clean.length <= 13;
};
const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
const validatePrice = (price) => {
  const num = Number(price);
  return !isNaN(num) && num > 0 && num < 100000000;
};
const validateOrderId = (id) => {
  return typeof id === 'string' && /^[A-Z0-9-]{6,20}$/i.test(id);
};
module.exports = { sanitize, validatePhone, validateEmail, validatePrice, validateOrderId };
