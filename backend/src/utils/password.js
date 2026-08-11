const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * Generates a readable temporary password (no ambiguous chars: 0/O, 1/l/I).
 */
function generateTemporaryPassword(length = 10) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const MIN_PASSWORD_LENGTH = 10;

function validateNewPassword(password) {
  if (!password || typeof password !== 'string') {
    return 'La contraseña es obligatoria';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

module.exports = {
  generateTemporaryPassword,
  validateNewPassword,
  MIN_PASSWORD_LENGTH,
};
