// Criptografia simetrica dos tokens do Mercado Pago (AES-256-GCM).
// Nunca armazenamos access_token/refresh_token em texto puro no banco.
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // tamanho recomendado de IV para GCM

function getKey() {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY precisa ter 64 caracteres hex (32 bytes). Gere com: openssl rand -hex 32'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

function encryptToken(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // formato armazenado: iv:authTag:cipherText (tudo em hex)
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

function decryptToken(cipherText) {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = cipherText.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

module.exports = { encryptToken, decryptToken };
