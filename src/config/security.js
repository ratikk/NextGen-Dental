/**
 * Security Configuration for Dental Clinic Website
 * 
 * This file contains security-related configuration settings and constants
 * for protecting sensitive operations like media uploads and form submissions.
 */

// File upload constraints
export const FILE_CONSTRAINTS = {
  // Maximum file size in bytes (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Allowed file types for upload
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf'
  ],
  
  // File organization path template
  PATH_TEMPLATE: 'clinic-assets/{clinic-name}/',
  
  // URL expiration time in seconds (1 hour default)
  SIGNED_URL_EXPIRATION: 3600
};

// Rate limiting configuration
export const RATE_LIMITS = {
  // Upload endpoint - 10 requests per minute per IP
  UPLOAD_ENDPOINT: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 10,
    MESSAGE: 'Too many upload attempts. Please try again later.'
  },
  
  // Contact form - 5 submissions per 10 minutes per IP
  CONTACT_FORM: {
    WINDOW_MS: 10 * 60 * 1000,
    MAX_REQUESTS: 5,
    MESSAGE: 'Too many form submissions. Please try again later.'
  },
  
  // Signed URL endpoint - 60 requests per minute per user
  SIGNED_URL_ENDPOINT: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 60,
    MESSAGE: 'Rate limit exceeded for media access.'
  }
};

// Security headers to be applied by server
export const SECURITY_HEADERS = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' https://www.google.com https://www.gstatic.com; " + 
    "img-src 'self' data: https://*.pexels.com; " + 
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " + 
    "font-src 'self' https://fonts.gstatic.com; " + 
    "connect-src 'self'; " + 
    "frame-src https://www.google.com; " + 
    "object-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Configuration for CAPTCHA validation
export const CAPTCHA_CONFIG = {
  // Minimum required score for reCAPTCHA v3 (0.0 to 1.0)
  MIN_SCORE: 0.5,
  
  // Which forms require CAPTCHA protection
  PROTECTED_FORMS: [
    'contact-form',
    'appointment-form',
    'media-upload-form'
  ]
};

// Audit logging configuration
export const AUDIT_CONFIG = {
  // Log field requirements for audit compliance
  REQUIRED_FIELDS: [
    'userId',
    'clinicId',
    'action',
    'timestamp',
    'ipAddress',
    'resourcePath'
  ],
  
  // Actions that require logging
  LOGGED_ACTIONS: [
    'MEDIA_UPLOAD',
    'MEDIA_ACCESS',
    'FORM_SUBMISSION',
    'LOGIN_ATTEMPT',
    'PASSWORD_CHANGE',
    'SETTINGS_CHANGE'
  ]
};