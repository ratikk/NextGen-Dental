# Keystatic CMS Setup Guide

## Overview

Keystatic has been integrated into your NextGen Dental site with all content schemas configured. Content is stored as YAML files in your repository.

## Current Configuration

Your Keystatic is configured for **local file editing**. This means:
- Content is stored as YAML files in `src/content/`
- No admin interface needed - edit files directly
- All content is version controlled in Git
- Perfect for static site deployment

## Why File-Based Instead of Admin UI?

For static S3 deployments, file-based editing is the best approach:
- No server required - pure static hosting
- Content changes tracked in Git history
- Can edit in any text editor or GitHub UI
- Automated deployments on Git push

## How to Edit Content

### Method 1: Edit YAML Files Directly

All content is in `src/content/`:
- `src/content/homepage.yaml` - Homepage content
- `src/content/site-settings.yaml` - Contact info, hours
- `src/content/services/` - Service pages
- `src/content/blog/` - Blog posts
- `src/content/team/` - Team member profiles
- `src/content/gallery/` - Before/after cases

### Method 2: Edit on GitHub

1. Go to your repository: `https://github.com/ratikk/NextGen-Dental`
2. Navigate to `src/content/`
3. Click any YAML file
4. Click the pencil icon to edit
5. Commit changes

Your CI/CD pipeline will automatically rebuild and deploy.

## What You Can Edit

### Homepage Content
- Hero heading and subheading
- CTA button text
- Welcome section
- Features heading

### Site Settings
- Contact information
- Office hours
- Emergency message
- Address

### Services
- Create/edit service pages
- Set featured services
- Add service descriptions with rich text

### Blog Posts
- Write and publish blog posts
- Add featured images
- Assign authors and categories
- Rich text editor with formatting

### Team Members
- Add/edit dentist profiles
- Upload professional photos
- List specialties
- Write biographies

### Gallery Cases
- Upload before/after photos
- Categorize cases
- Add descriptions
- Mark featured cases

### Patient Education
- Create educational content
- Organize by category
- Rich text with images

## Content Examples

### Example: Editing Homepage Hero

Edit `src/content/homepage.yaml`:

```yaml
heroHeading: Your Smile is Our Priority
heroSubheading: >-
  Experience exceptional dental care in a comfortable environment.
ctaPrimaryText: Book Appointment
ctaSecondaryText: Learn More
```

### Example: Adding a Blog Post

Create `src/content/blog/my-new-post.yaml`:

```yaml
title: my-new-post
description: A brief excerpt about the post
date: '2024-03-27'
author: dr-kiranmayee
category: cosmetic
featured: false
image: /images/blog/my-image.jpg
content:
  - type: heading
    level: 2
    children:
      - type: text
        text: Your Heading Here
  - type: paragraph
    children:
      - type: text
        text: Your content goes here...
```

## Deployment Workflow

1. **Edit Content**: Modify YAML files locally or on GitHub
2. **Commit Changes**: Git commit and push to repository
3. **Auto Deploy**: Your CI/CD pipeline rebuilds the site
4. **Live Update**: Changes appear on your live site

## Tips

- Content is type-safe and validated by schemas
- Images go in `public/images/` subdirectories
- YAML format is human-readable and Git-friendly
- Use GitHub's web editor for quick edits
- All changes are tracked in Git history

## Support

For YAML syntax help: https://yaml.org/
For Keystatic schemas: https://keystatic.com/docs
