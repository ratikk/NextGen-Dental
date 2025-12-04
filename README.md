# NextGen Dental Website

A high-performance, SEO-optimized dental practice website built with [Astro](https://astro.build) and [React](https://reactjs.org).

This project features a static-first architecture for speed, with interactive "islands" for dynamic content (Review fetching, Contact forms, Before/After sliders). It is deployed to AWS S3/CloudFront with a serverless AWS Lambda backend.

## 🚀 Features

*   **Performance:** 100/100 Google Lighthouse Score (Core Web Vitals optimized).
*   **Local SEO:** Targeted content for South Austin (78747), Buda, and Kyle.
*   **PWA Ready:** Manifest and icons configured for "Add to Home Screen" on Android/iOS.
*   **Dynamic Components:**
    *   Google Reviews fetcher (via AWS Lambda).
    *   Secure Contact & Appointment forms (with reCAPTCHA v3).
    *   Interactive "Before & After" image sliders.
*   **Centralized Config:** Global site data (Phone, Address, Hours) managed in a single file.

## 🛠 Tech Stack

*   **Frontend:** Astro, React, TypeScript, TailwindCSS
*   **Backend:** AWS Lambda (Node.js), AWS SES (Email), Amazon S3 & CloudFront (Hosting)
*   **Security:** Google reCAPTCHA v3, CORS protection
*   **Image Optimization:** Sharp (Server-side), AVIF/WebP formats

## ⚙️ Configuration (The "Brain")

This project uses a centralized configuration file to manage clinic details. You do not need to hunt through HTML files to change the phone number or hours.

**File:** `src/utils/clinicInfo.ts`

Update this file to change:
*   Clinic Name & Address
*   Phone Number & Email
*   Office Hours
*   Social Media Links
*   Google Maps Location

## 🔐 Environment Variables

Create a `.env` file in the root directory to configure the backend connections.

```ini
# Google reCAPTCHA v3 (Public Site Key)
PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here

# AWS Lambda Endpoint for Form Submissions (Contact/Booking)
PUBLIC_LAMBDA_ENDPOINT=https://your-form-lambda-url.on.aws/

# AWS Lambda Endpoint for Google Reviews
PUBLIC_GOOGLE_REVIEWS_ENDPOINT=https://your-reviews-lambda-url.on.aws/
