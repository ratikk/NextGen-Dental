# Image Management Guide for Lilac Dental Website

## Directory Structure

All images should be placed in the `public/images` directory with the following structure:

```
public/images/
├── logo.png              # Main website logo
├── hero/                 # Hero images for all pages
│   ├── dental-1.jpg
│   ├── dental-2.jpg
│   └── dental-3.jpg
├── about/               # Team member photos
│   ├── dr-suman.jpg
│   └── dr-kiranmayee.jpg
└── gallery/            # Before/After images for smile gallery
    ├── case1-before.jpg
    ├── case1-after.jpg
    └── ...
```

## Image Specifications

### Logo
- File: `public/images/logo.png`
- Recommended size: 200x80px
- Format: PNG with transparency
- Used in: Header, Footer

### Hero Images
- Directory: `public/images/hero/`
- Files: dental-1.jpg, dental-2.jpg, dental-3.jpg
- Recommended size: 1920x1080px
- Format: JPG
- Used in:
  - Homepage hero slider
  - Services page headers
  - About page header
  - Contact page header

### Team Photos
- Directory: `public/images/about/`
- Files:
  - dr-suman.jpg
  - dr-kiranmayee.jpg
- Recommended size: 800x1000px
- Format: JPG
- Used in: About page

### Smile Gallery Images
- Directory: `public/images/gallery/`
- Naming convention: case{number}-{before|after}.jpg
- Recommended size: 800x600px
- Format: JPG
- Used in: Smile Gallery page

## Page-specific Image Usage

### Home Page
- Hero slider images: `public/images/hero/dental-*.jpg`
- Update references in: `src/pages/index.astro`

### About Page
- Hero image: `public/images/hero/dental-2.jpg`
- Team photos: `public/images/about/dr-*.jpg`
- Update references in: `src/pages/about.astro`

### Smile Gallery
- Before/After images: `public/images/gallery/*`
- Update references in: `src/pages/smile-gallery.astro`

### Services Pages
- Hero images: `public/images/hero/dental-*.jpg`
- Update references in respective service pages under `src/pages/services/`

## Image Optimization

1. Optimize all images before uploading using tools like:
   - TinyPNG
   - ImageOptim
   - Squoosh

2. Follow these guidelines:
   - Keep file sizes under 200KB for hero images
   - Use appropriate compression (80-90% quality for JPG)
   - Maintain aspect ratios
   - Include alt text for all images

## Updating Images

1. Prepare your new images according to specifications above
2. Place them in the appropriate directory under `public/images/`
3. Update references in the corresponding page files
4. Test the website to ensure images load correctly
5. Check responsive behavior on different screen sizes

## Important Notes

- Always backup original images before replacing
- Maintain consistent naming conventions
- Test loading performance after updates
- Ensure all images have proper alt text for accessibility
- Keep image file sizes optimized for web performance