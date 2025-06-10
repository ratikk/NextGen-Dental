# Lilac Dental Website Developer Guide

This guide explains key integration points for the Lilac Dental website, including image management, reCAPTCHA setup, and appointment form functionality.

## 🖼️ Image Management

### Image Locations Guide

#### Hero Images
Located in `public/images/hero/`:
- `dental-1.jpg` - Used in:
  - Homepage hero slider (first image)
  - Services page header
  - Smile Gallery page header
- `dental-2.jpg` - Used in:
  - Homepage hero slider (second image)
  - Contact page header
  - Patient Information page header
- `dental-3.jpg` - Used in:
  - Homepage hero slider (third image)
  - About page header
  - Financing page header

To update hero images:
1. Place new images in `public/images/hero/`
2. Recommended size: 1920x1080px, optimized for web
3. Update references in relevant components:
  - Homepage: `src/pages/index.astro`
  - Other pages: Check the `Hero` component usage in respective page files

#### Smile Gallery Images
Located in `public/images/hero/`:
- Before/After pairs are defined in `src/pages/smile-gallery.astro`
- To update gallery images:
  1. Add new images to `public/images/hero/`
  2. Update the `transformations` array in `src/pages/smile-gallery.astro`

#### Logo and Brand Assets
- Logo: `public/images/logo.png`
- Favicon: `public/favicon.svg`

### Static Assets
All static images should be placed in `public/images/` with appropriate subdirectories:
- Logo and branding: `/images/`
- Hero images: `/images/hero/`
- Team photos: `/images/team/`
- Gallery images: `/images/gallery/`

## 🔐 reCAPTCHA v3 Integration

The site uses reCAPTCHA v3 for form protection. Configuration:

1. Environment Variables:
```env
PUBLIC_RECAPTCHA_SITE_KEY=6LcDv0ArAAAAABA38agF7l6188_EMl0z3m5yeU3U
```

2. Script Loading (in `src/layouts/Layout.astro`):
```html
<script src="https://www.google.com/recaptcha/api.js?render=${import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY}"></script>
```

3. Token Generation (in `src/utils/recaptcha.ts`):
```ts
export async function getRecaptchaToken(action: string): Promise<string> {
  return await grecaptcha.execute(import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY, { action });
}
```

## 📧 Appointment Form Integration

The appointment form submits to a Lambda function that handles email notifications.

### Form Submission Flow

1. Form Component (`src/components/BookingPopup.astro`):
```js
<form id="booking-form" class="space-y-4">
  <!-- Form fields -->
</form>
```

2. Form Handling (`src/utils/forms.ts`):
```ts
export async function submitForm(data: FormData) {
  const recaptchaToken = await getRecaptchaToken(`submit_${data.formType}`);
  
  const response = await fetch('https://7bvjump2trmhg2aemllzaoo5qu0ixytw.lambda-url.us-east-1.amazonaws.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, recaptchaToken })
  });
  
  return response.json();
}
```

### Expected Payload
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phone": "737-291-3927",
  "preferredDate": "2025-06-01",
  "preferredTime": "Morning",
  "reasonForVisit": "Teeth Cleaning",
  "smsConsent": true,
  "formType": "Appointment Request",
  "recaptchaToken": "VALID_TOKEN"
}
```

## 🏗️ Build & Deploy

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
/
├── public/
│   ├── images/
│   │   ├── hero/          # Hero and gallery images
│   │   ├── team/          # Team member photos
│   │   └── logo.png       # Site logo
│   └── favicon.svg
├── src/
│   ├── components/        # Reusable components
│   ├── layouts/          # Page layouts
│   ├── pages/           # Route pages
│   └── utils/           # Utility functions
└── package.json
```

## 🔄 Updating Content

### Clinic Information
Update clinic details in `src/utils/clinicInfo.ts`:
```ts
export const clinicInfo = {
  name: "Lilac Dental",
  phone: "+17372913927",
  email: "lilacdental24@gmail.com",
  // ...
};
```

### Services
Modify service offerings in `src/utils/services.ts`.

### Hours & Location
Update business hours and location in `src/utils/clinicInfo.ts`.