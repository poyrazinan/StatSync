// AES-256-CBC encryption helpers
const crypto = require('crypto');
const key = crypto.createHash('sha256').update("StatSync-Kick-Secret-Key").digest();
const iv = Buffer.alloc(16, 0);

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(text, 'utf8', 'base64');
  enc += cipher.final('base64');
  return enc;
}

function decrypt(enc) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf8');
    return str;
  } catch {
    return "";
  }
}

if (typeof module !== "undefined") {
  module.exports = { encrypt, decrypt };
}
