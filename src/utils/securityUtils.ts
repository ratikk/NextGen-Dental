// Set of tools for implementing security features in the application

/**
 * Rate limiting middleware
 * Prevents abuse of sensitive endpoints
 */
export class RateLimiter {
  private static ipMap = new Map<string, { count: number, resetTime: number }>();
  private static TOKEN_BUCKET_REFILL_RATE = 10; // tokens per second
  private static TOKEN_BUCKET_CAPACITY = 30;
  
  /**
   * Checks if a request from an IP should be rate limited
   */
  static checkLimit(ip: string, endpoint: string): boolean {
    const now = Date.now();
    const key = `${ip}:${endpoint}`;
    
    if (!this.ipMap.has(key)) {
      this.ipMap.set(key, {
        count: this.TOKEN_BUCKET_CAPACITY - 1,
        resetTime: now + 1000
      });
      return false;
    }
    
    const record = this.ipMap.get(key)!;
    
    // Refill tokens based on elapsed time
    const timePassed = now - record.resetTime + 1000;
    if (timePassed > 0) {
      const refillAmount = Math.floor(timePassed / 1000) * this.TOKEN_BUCKET_REFILL_RATE;
      record.count = Math.min(record.count + refillAmount, this.TOKEN_BUCKET_CAPACITY);
      record.resetTime = now;
    }
    
    if (record.count > 0) {
      record.count--;
      return false; // Not rate limited
    }
    
    return true; // Rate limited
  }
  
  /**
   * Clears old rate limiting data
   */
  static cleanup(): void {
    const now = Date.now();
    const EXPIRY_TIME = 3600000; // 1 hour
    
    for (const [key, record] of this.ipMap.entries()) {
      if (now - record.resetTime > EXPIRY_TIME) {
        this.ipMap.delete(key);
      }
    }
  }
}

/**
 * CAPTCHA verification function
 */
export const verifyCaptcha = async (captchaToken: string): Promise<boolean> => {
  // In a real implementation, this would verify the CAPTCHA token with a service like reCAPTCHA
  // For now, this is a placeholder
  return captchaToken.length > 0;
};

/**
 * File type validation
 */
export const isAllowedFileType = (mimeType: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf'
  ];
  
  return allowedTypes.includes(mimeType);
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  // In browser environments, use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto) {
    const arr = new Uint8Array(length);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
  } 
  
  // Node.js fallback (for SSR)
  else if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.randomBytes(length).toString('hex');
    } catch (e) {
      console.error('Secure random generation failed:', e);
      throw new Error('Could not generate secure token');
    }
  }
  
  throw new Error('No secure random generator available');
};