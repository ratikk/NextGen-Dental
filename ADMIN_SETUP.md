# Admin CMS Setup Guide

## Overview

Your NextGen Dental website now has a secure, authenticated content management system (CMS) built with Supabase. Only authenticated admin users can edit content, while the public can view the website.

## Security Features

- **Authentication Required**: All content modifications require login
- **Secure Admin Dashboard**: Protected admin interface at `/admin/dashboard`
- **Row Level Security**: Database-level security ensures only authenticated users can modify content
- **Public Read Access**: Website visitors can view content without authentication
- **User Tracking**: All changes are tracked with user ID and timestamp

## Creating Your Admin Account

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Add User** button

### Step 2: Create Admin User

Fill in the following details:
- **Email**: Your admin email (e.g., `admin@nextgendental.com`)
- **Password**: Create a strong password
- **Auto Confirm User**: ✅ Check this box (important!)
- **Email Confirm**: Leave unchecked

Click **Create User**

### Step 3: Test Login

1. Visit your website at `/admin/login`
2. Enter your admin email and password
3. Click **Sign in**
4. You should be redirected to `/admin/dashboard`

## Using the Admin Dashboard

### Accessing the Dashboard

**URL**: `https://nextgendentalaustintx.com/admin/login`

After logging in, you'll see tabs for different content sections:

### 1. Homepage Tab

Edit your homepage content:
- **Hero Heading**: Main heading on homepage
- **Hero Subheading**: Tagline below the main heading
- **Primary CTA Text**: Text for the main call-to-action button
- **Secondary CTA Text**: Text for the secondary button
- **Welcome Heading**: Heading for the welcome section
- **Welcome Text**: Welcome section content
- **Features Heading**: Heading for features section

Click **Save Changes** to update.

### 2. Site Settings Tab

Manage your practice information:
- **Site Name**: Name of your dental practice
- **Tagline**: Short description/tagline
- **Phone**: Contact phone number
- **Email**: Contact email address
- **Address**: Physical address
- **Office Hours**: Operating hours (supports multiple lines)
- **Emergency Message**: Message for emergencies

Click **Save Changes** to update.

### 3. Services Tab

Manage your dental services (coming soon in full version):
- Add new services
- Edit existing services
- Set featured services
- Add descriptions and content

### 4. Blog Posts Tab

Create and manage blog content (coming soon).

### 5. Team Tab

Manage team member profiles (coming soon).

### 6. Gallery Tab

Manage before/after photos (coming soon).

## Content Management Workflow

1. **Login**: Access `/admin/login` with your credentials
2. **Edit Content**: Navigate to the appropriate tab
3. **Make Changes**: Update text fields as needed
4. **Save**: Click the Save button
5. **Verify**: Changes appear immediately on your live site

## Database Structure

Your content is stored in secure Supabase tables:

- `cms_homepage` - Homepage content
- `cms_site_settings` - Contact and practice information
- `cms_services` - Service pages
- `cms_blog_posts` - Blog articles
- `cms_team_members` - Staff profiles
- `cms_gallery_items` - Before/after photos
- `cms_patient_education` - Educational content

## Security Details

### Row Level Security (RLS) Policies

All tables have RLS enabled with these policies:

**Read (SELECT)**:
- ✅ Public can read (for website display)
- No authentication required

**Write (INSERT/UPDATE/DELETE)**:
- ❌ Public cannot write
- ✅ Only authenticated users can write
- All changes tracked with user ID

### Authentication Flow

1. User visits `/admin/login`
2. Enters email and password
3. Supabase verifies credentials
4. On success: Redirected to dashboard
5. On failure: Error message displayed

### Session Management

- Sessions persist across page refreshes
- Auto-redirect to login if session expires
- Sign out button clears session

## Adding More Admin Users

To add additional admin users:

1. Go to Supabase Dashboard > Authentication > Users
2. Click **Add User**
3. Enter email and password
4. Check **Auto Confirm User**
5. Click **Create User**

Each admin user has full access to edit all content.

## Static Site Deployment

The website builds as a static site with content baked in at build time:

1. Admin edits content in dashboard
2. Content saved to Supabase database
3. Run build: `npm run build`
4. Static HTML generated with latest content from database
5. Deploy `dist/` folder to S3

**Important**: After making content changes, rebuild and redeploy the site to see changes on the live website.

## Automated Rebuild (Optional)

For automatic rebuilds when content changes, you can:

1. Set up a webhook in Supabase (Database > Webhooks)
2. Configure it to trigger on table updates
3. Have the webhook call your CI/CD pipeline
4. Pipeline automatically rebuilds and deploys

## Troubleshooting

### Can't Login

- Verify email and password are correct
- Check that **Auto Confirm User** was enabled when creating the user
- Check Supabase Dashboard > Authentication > Users to see if user exists

### Changes Not Showing on Website

- Content changes require a rebuild
- Run `npm run build` after making changes
- Redeploy the `dist/` folder to S3

### Database Connection Error

- Verify `.env` file has correct Supabase credentials:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase project is active

### Session Expired

- Simply log in again
- Sessions expire after period of inactivity

## Environment Variables

Required environment variables (already configured in `.env`):

```
PUBLIC_SUPABASE_URL=your-project-url.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Support

For Supabase documentation: https://supabase.com/docs
For authentication issues: Check Supabase Dashboard > Authentication section

## Summary

✅ **Secure CMS Implemented**
- Authentication-protected admin dashboard
- Row-level security on all content
- User tracking for all changes
- Public read access for website visitors

**Next Steps:**
1. Create your admin user in Supabase Dashboard
2. Login at `/admin/login`
3. Edit your content
4. Rebuild and deploy your site
