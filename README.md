# Lilac Dental Website

A modern, responsive dental practice website built with Astro, TypeScript, and Tailwind CSS. Features appointment booking, patient education resources, service information, and more.

## 🌟 Features

- **Modern Design**: Clean, professional design with smooth animations and micro-interactions
- **Responsive Layout**: Optimized for all devices from mobile to desktop
- **Appointment Booking**: Integrated booking system with reCAPTCHA protection
- **Patient Education**: Comprehensive dental health resources and guides
- **Service Showcase**: Detailed information about all dental services
- **Smile Gallery**: Before/after transformations with interactive comparisons
- **Contact Integration**: Multiple contact methods with embedded maps
- **SEO Optimized**: Structured data, meta tags, and sitemap included
- **Performance Focused**: Fast loading with optimized images and code splitting

## 🚀 Tech Stack

- **Framework**: [Astro](https://astro.build/) - Static site generator with islands architecture
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Language**: TypeScript for type safety
- **UI Components**: React components for interactive elements
- **Animations**: AOS (Animate On Scroll) library
- **Image Optimization**: Astro's built-in image optimization with Sharp
- **Form Handling**: AWS Lambda integration with reCAPTCHA v3
- **Deployment**: Static hosting compatible (Netlify, Vercel, etc.)

## 📁 Project Structure

```
/
├── public/                 # Static assets
│   ├── images/            # Image assets
│   │   ├── hero/          # Hero section images
│   │   ├── about/         # Team photos
│   │   └── gallery/       # Before/after gallery images
│   ├── favicon.svg        # Site favicon
│   ├── robots.txt         # SEO robots file
│   └── sitemap.xml        # XML sitemap
├── src/
│   ├── assets/            # Astro-processed assets
│   ├── components/        # Reusable UI components
│   │   ├── Header.astro   # Site navigation
│   │   ├── Footer.astro   # Site footer
│   │   ├── Hero.astro     # Hero sections
│   │   ├── BookingPopup.astro # Appointment booking modal
│   │   └── ...            # Other components
│   ├── layouts/           # Page layouts
│   │   └── Layout.astro   # Base layout with SEO
│   ├── pages/             # Route pages
│   │   ├── index.astro    # Homepage
│   │   ├── about.astro    # About page
│   │   ├── services/      # Service pages
│   │   ├── blog/          # Blog pages
│   │   └── ...            # Other pages
│   ├── utils/             # Utility functions
│   │   ├── clinicInfo.ts  # Clinic information
│   │   ├── services.ts    # Service definitions
│   │   ├── forms.ts       # Form handling
│   │   └── ...            # Other utilities
│   └── styles/            # Global styles
├── astro.config.mjs       # Astro configuration
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lilac-dental-website
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# reCAPTCHA Configuration
PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here

# Optional: Supabase (if using database features)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Configure Clinic Information

Update `src/utils/clinicInfo.ts` with your clinic's details:

```typescript
export const clinicInfo = {
  name: "Your Dental Practice",
  address: {
    line1: "123 Main Street",
    city: "Your City",
    state: "ST",
    zip: "12345",
    full: "123 Main Street, Your City, ST 12345"
  },
  phone: "+1234567890",
  displayPhone: "(123) 456-7890",
  email: "contact@yourpractice.com",
  // ... other settings
};
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:4321` to view the site.

## 📧 Form Integration Setup

The website includes an appointment booking system that integrates with AWS Lambda for email notifications.

### Lambda Function Setup

1. **Create AWS Lambda Function**:
   - Runtime: Node.js 18.x
   - Create a function URL for HTTP access
   - Configure CORS settings

2. **Lambda Function Code** (example):
   ```javascript
   exports.handler = async (event) => {
     // Parse form data
     const data = JSON.parse(event.body);
     
     // Send email notification
     // (implement your email service here)
     
     return {
       statusCode: 200,
       headers: {
         'Access-Control-Allow-Origin': '*',
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ success: true })
     };
   };
   ```

3. **Update Form Configuration**:
   Update the Lambda endpoint in `src/utils/forms.ts`:
   ```typescript
   const LAMBDA_ENDPOINT = "your-lambda-function-url";
   ```

### reCAPTCHA Setup

1. **Get reCAPTCHA Keys**:
   - Visit [Google reCAPTCHA](https://www.google.com/recaptcha/)
   - Create a new site with reCAPTCHA v3
   - Get your site key and secret key

2. **Configure Site Key**:
   Add your site key to `.env`:
   ```env
   PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
   ```

3. **Configure Secret Key**:
   Add your secret key to your Lambda function environment variables.

## 🖼️ Image Management

### Image Organization

Images are organized in the `public/images/` directory:

```
public/images/
├── logo.png              # Main logo
├── hero/                 # Hero section images
│   ├── dental-1.jpg
│   ├── dental-2.jpg
│   └── dental-3.jpg
├── about/               # Team photos
│   ├── dr-name1.jpg
│   └── dr-name2.jpg
└── gallery/            # Before/after images
    ├── case1-before.jpg
    ├── case1-after.jpg
    └── ...
```

### Image Specifications

- **Logo**: 200x80px, PNG with transparency
- **Hero Images**: 1920x1080px, JPG format, optimized for web
- **Team Photos**: 800x1000px, JPG format
- **Gallery Images**: 800x600px, JPG format

### Adding New Images

1. **Optimize Images**: Use tools like TinyPNG or ImageOptim
2. **Place in Correct Directory**: Follow the organization structure
3. **Update References**: Update component files to reference new images
4. **Test Responsive Behavior**: Ensure images work on all screen sizes

## 🎨 Customization

### Colors and Branding

Update the color scheme in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#f4f1f9',
        // ... your brand colors
        900: '#423058',
      },
      // ... other color schemes
    }
  }
}
```

### Typography

Fonts are configured in `src/layouts/Layout.astro`:

```typescript
import '@fontsource/montserrat/500.css';  // Headings
import '@fontsource/open-sans/400.css';  // Body text
```

### Services Configuration

Update services in `src/utils/services.ts`:

```typescript
export const services = {
  preventiveCare: {
    title: "Preventive Care",
    description: "Your description here",
    items: [
      {
        name: "Service Name",
        description: "Service description",
        href: "/services/service-slug",
        icon: "🦷"
      },
      // ... more services
    ]
  },
  // ... more categories
};
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with static files ready for deployment.

### Deployment Options

#### Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

#### Vercel
1. Connect your repository to Vercel
2. Vercel auto-detects Astro projects
3. Add environment variables in Vercel dashboard

#### Traditional Hosting
Upload the contents of the `dist/` folder to your web server.

### Environment Variables for Production

Ensure these are set in your hosting platform:

```env
PUBLIC_RECAPTCHA_SITE_KEY=your_production_recaptcha_key
```

## 📊 SEO & Analytics

### Built-in SEO Features

- **Meta Tags**: Automatic generation for all pages
- **Open Graph**: Social media sharing optimization
- **Structured Data**: JSON-LD for search engines
- **Sitemap**: Auto-generated XML sitemap
- **Robots.txt**: Search engine crawling instructions

### Adding Analytics

Add your analytics code to `src/layouts/Layout.astro`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run astro        # Run Astro CLI commands
```

### Code Quality

The project includes:
- **TypeScript**: Type checking for better code quality
- **ESLint**: Code linting (can be added)
- **Prettier**: Code formatting (can be added)

### Adding New Pages

1. **Create Page File**: Add `.astro` file in `src/pages/`
2. **Use Layout**: Import and use the base layout
3. **Add Navigation**: Update header navigation if needed
4. **Update Sitemap**: Add to `public/sitemap.xml`

Example new page:

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
---

<Layout title="New Page" description="Page description">
  <Hero title="New Page" subtitle="Page subtitle" />
  
  <div class="py-16 bg-white">
    <div class="container mx-auto px-4">
      <!-- Page content -->
    </div>
  </div>
</Layout>
```

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
- **TypeScript Errors**: Check type definitions and imports
- **Image Errors**: Ensure images exist in correct paths
- **Import Errors**: Verify file paths and extensions

#### Form Submission Issues
- **reCAPTCHA Errors**: Check site key configuration
- **Lambda Errors**: Verify endpoint URL and CORS settings
- **Network Errors**: Check browser console for detailed errors

#### Performance Issues
- **Large Images**: Optimize images before adding
- **Bundle Size**: Check for unnecessary dependencies
- **Loading Speed**: Use Astro's image optimization features

### Debug Tools

The project includes debug utilities accessible in browser console:

```javascript
// Test form submission
testFormSubmission()

// Check network connectivity
diagnoseNetwork()

// Test Lambda endpoint
testLambdaEndpoint()
```

## 📝 Content Management

### Blog Posts

Add new blog posts in `src/utils/blogPosts.ts`:

```typescript
{
  id: 'post-slug',
  title: 'Post Title',
  excerpt: 'Brief description',
  content: 'Full post content...',
  author: 'Dr. Name',
  date: '2024-01-01',
  image: '/images/blog/post-image.jpg',
  category: 'Oral Health',
  tags: ['tag1', 'tag2']
}
```

### Patient Education

Add new educational content by creating new pages in `src/pages/patient-education/`.

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/new-feature`
3. **Commit Changes**: `git commit -m 'Add new feature'`
4. **Push to Branch**: `git push origin feature/new-feature`
5. **Open Pull Request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue in the repository
- **Email**: Contact the development team

## 🔄 Updates

### Version History

- **v1.0.0**: Initial release with core features
- **v1.1.0**: Added blog functionality and patient education
- **v1.2.0**: Enhanced form handling and Lambda integration

### Keeping Updated

1. **Dependencies**: Regularly update npm packages
2. **Security**: Monitor for security vulnerabilities
3. **Performance**: Optimize images and code regularly
4. **Content**: Keep clinic information and services updated

---

**Built with ❤️ for dental practices everywhere**
