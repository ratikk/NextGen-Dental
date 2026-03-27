# Keystatic CMS Setup Guide

## Overview

Keystatic has been integrated into your NextGen Dental site. It provides a beautiful admin interface for managing all your content without touching code.

## Accessing the Admin Panel

1. **Local Development**: Visit `http://localhost:4321/keystatic`
2. **Production**: Visit `https://your-domain.com/keystatic`

## First-Time Setup

### 1. Configure GitHub Repository

Edit `keystatic.config.ts` and update the storage configuration:

```typescript
storage: {
  kind: 'github',
  repo: 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME', // Update this
},
```

Replace with your actual GitHub username and repository name.

### 2. GitHub OAuth Setup (Production Only)

For production deployment, you need to set up GitHub OAuth:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: NextGen Dental CMS
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/keystatic/github/oauth/callback`
4. Save the Client ID and Client Secret
5. Add these as environment variables in your deployment:
   - `PUBLIC_KEYSTATIC_GITHUB_CLIENT_ID`
   - `PUBLIC_KEYSTATIC_GITHUB_CLIENT_SECRET`

### 3. Local Development (No OAuth Required)

For local development, Keystatic uses local file storage automatically. No GitHub authentication needed.

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

## Content Workflow

1. **Edit Content**: Use the Keystatic admin panel to make changes
2. **Preview**: Changes are saved as Git commits
3. **Deploy**: Push to GitHub triggers automatic rebuild on S3

## Rich Text Editor Features

- **Formatting**: Bold, italic, headings, lists
- **Links**: Add internal and external links
- **Images**: Upload and embed images
- **Structure**: Dividers, code blocks, quotes

## Tips

- All content is stored in `src/content/` as YAML files
- Images are stored in `public/images/`
- Every edit creates a Git commit
- You can revert changes using Git history
- Content is type-safe and validated

## Support

For Keystatic documentation, visit: https://keystatic.com/docs

## Next Steps

1. Update the GitHub repo configuration in `keystatic.config.ts`
2. Test locally at `/keystatic`
3. Set up GitHub OAuth for production
4. Start editing your content!
