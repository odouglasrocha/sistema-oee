const crypto = require('crypto');

// Configurações de criptografia
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Chave mestra derivada do ambiente
const MASTER_KEY = process.env.NOTIFICATION_ENCRYPTION_KEY || 'oee-monitor-default-key-change-in-production-32-chars';

/**
 * Classe para criptografia segura de credenciais
 */
class CredentialEncryption {
  /**
   * Deriva uma chave a partir da chave mestra usando PBKDF2
   * @param {string} salt - Salt para derivação da chave
   * @returns {Buffer} Chave derivada
   */
  static deriveKey(salt) {
    return crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, KEY_LENGTH, 'sha512');
  }

  /**
   * Criptografa um texto usando AES-256-GCM
   * @param {string} plaintext - Texto a ser criptografado
   * @returns {string} Texto criptografado no formato: salt:iv:tag:encrypted
   */
  static encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      return plaintext;
    }

    try {
      // Gerar salt e IV aleatórios
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Derivar chave a partir do salt
      const key = this.deriveKey(salt);
      
      // Criar cipher
      const cipher = crypto.createCipher(ALGORITHM, key, iv);
      
      // Criptografar
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Obter tag de autenticação
      const tag = cipher.getAuthTag();
      
      // Retornar no formato: salt:iv:tag:encrypted
      return [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted
      ].join(':');
    } catch (error) {
      console.error('Erro na criptografia:', error);
      throw new Error('Falha ao criptografar credencial');
    }
  }

  /**
   * Descriptografa um texto criptografado
   * @param {string} encryptedData - Dados criptografados no formato: salt:iv:tag:encrypted
   * @returns {string} Texto descriptografado
   */
  static decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
      return encryptedData;
    }

    try {
      // Separar componentes
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Formato de dados criptografados inválido');
      }

      const [saltHex, ivHex, tagHex, encrypted] = parts;
      
      // Converter de hex para Buffer
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      // Derivar chave
      const key = this.deriveKey(salt);
      
      // Criar decipher
      const decipher = crypto.createDecipher(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      // Descriptografar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw new Error('Falha ao descriptografar credencial');
    }
  }

  /**
   * Verifica se um texto está criptografado
   * @param {string} data - Dados a serem verificados
   * @returns {boolean} True se estiver criptografado
   */
  static isEncrypted(data) {
    if (!data || typeof data !== 'string') {
      return false;
    }
    
    const parts = data.split(':');
    return parts.length === 4 && 
           parts.every(part => /^[a-f0-9]+$/i.test(part));
  }

  /**
   * Criptografa um objeto com credenciais
   * @param {Object} credentials - Objeto com credenciais
   * @param {Array} fieldsToEncrypt - Campos a serem criptografados
   * @returns {Object} Objeto com campos criptografados
   */
  static encryptCredentials(credentials, fieldsToEncrypt = []) {
    if (!credentials || typeof credentials !== 'object') {
      return credentials;
    }

    const encrypted = { ...credentials };
    
    fieldsToEncrypt.forEach(field => {
      if (this.hasNestedProperty(encrypted, field)) {
        const value = this.getNestedProperty(encrypted, field);
        if (value && !this.isEncrypted(value)) {
          this.setNestedProperty(encrypted, field, this.encrypt(value));
        }
      }
    });

    return encrypted;
  }

  /**
   * Descriptografa um objeto com credenciais
   * @param {Object} credentials - Objeto com credenciais criptografadas
   * @param {Array} fieldsToDecrypt - Campos a serem descriptografados
   * @returns {Object} Objeto com campos descriptografados
   */
  static decryptCredentials(credentials, fieldsToDecrypt = []) {
    if (!credentials || typeof credentials !== 'object') {
      return credentials;
    }

    const decrypted = { ...credentials };
    
    fieldsToDecrypt.forEach(field => {
      if (this.hasNestedProperty(decrypted, field)) {
        const value = this.getNestedProperty(decrypted, field);
        if (value && this.isEncrypted(value)) {
          this.setNestedProperty(decrypted, field, this.decrypt(value));
        }
      }
    });

    return decrypted;
  }

  /**
   * Verifica se um objeto tem uma propriedade aninhada
   * @param {Object} obj - Objeto
   * @param {string} path - Caminho da propriedade (ex: 'smtp.password')
   * @returns {boolean}
   */
  static hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current.hasOwnProperty(key) ? current[key] : undefined;
    }, obj) !== undefined;
  }

  /**
   * Obtém uma propriedade aninhada
   * @param {Object} obj - Objeto
   * @param {string} path - Caminho da propriedade
   * @returns {*} Valor da propriedade
   */
  static getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Define uma propriedade aninhada
   * @param {Object} obj - Objeto
   * @param {string} path - Caminho da propriedade
   * @param {*} value - Valor a ser definido
   */
  static setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Gera uma chave de criptografia segura
   * @returns {string} Chave em formato hex
   */
  static generateSecureKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  /**
   * Valida se uma chave de criptografia é segura
   * @param {string} key - Chave a ser validada
   * @returns {boolean} True se a chave for segura
   */
  static isSecureKey(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // Verificar comprimento mínimo
    if (key.length < 32) {
      return false;
    }
    
    // Verificar se não é a chave padrão
    if (key.includes('default') || key.includes('change-in-production')) {
      return false;
    }
    
    return true;
  }

  /**
   * Máscara uma credencial para exibição segura
   * @param {string} credential - Credencial a ser mascarada
   * @param {number} visibleChars - Número de caracteres visíveis no início
   * @returns {string} Credencial mascarada
   */
  static maskCredential(credential, visibleChars = 4) {
    if (!credential || typeof credential !== 'string') {
      return '***';
    }
    
    if (credential.length <= visibleChars) {
      return '*'.repeat(credential.length);
    }
    
    return credential.substring(0, visibleChars) + '*'.repeat(credential.length - visibleChars);
  }
}

// Campos sensíveis que devem ser criptografados
const SENSITIVE_FIELDS = [
  'whatsapp.apiKey',
  'email.smtp.password',
  'email.sendgrid.apiKey',
  'sms.twilio.accountSid',
  'sms.twilio.authToken',
  'teams.webhookUrl',
  'telegram.botToken'
];

module.exports = {
  CredentialEncryption,
  SENSITIVE_FIELDS,
  
  // Funções de conveniência
  encrypt: (text) => CredentialEncryption.encrypt(text),
  decrypt: (text) => CredentialEncryption.decrypt(text),
  isEncrypted: (text) => CredentialEncryption.isEncrypted(text),
  encryptCredentials: (obj) => CredentialEncryption.encryptCredentials(obj, SENSITIVE_FIELDS),
  decryptCredentials: (obj) => CredentialEncryption.decryptCredentials(obj, SENSITIVE_FIELDS),
  maskCredential: (text, chars) => CredentialEncryption.maskCredential(text, chars),
  generateSecureKey: () => CredentialEncryption.generateSecureKey(),
  isSecureKey: (key) => CredentialEncryption.isSecureKey(key)
};