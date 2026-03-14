'use strict';

const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// Basic XSS sanitizer for plain text fields (not code)
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function validateLength(str, max) {
  if (typeof str !== 'string') return true;
  return str.trim().length <= max;
}

module.exports = { generateId, sanitize, validateLength };
