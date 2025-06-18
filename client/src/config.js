// client/src/config.js
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://your-production-backend.com'
    : 'http://localhost:5000');

export default {
  BACKEND_URL,
};