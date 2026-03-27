import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME',
  },

  collections: {
    services: collection({
      label: 'Services',
      slugField: 'title',
      path: 'src/content/services/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({
          label: 'Short Description',
          multiline: true
        }),
        icon: fields.text({ label: 'Icon Name' }),
        featured: fields.checkbox({
          label: 'Featured Service',
          defaultValue: false
        }),
        content: fields.document({
          label: 'Content',
          formatting: true,
          dividers: true,
          links: true,
          images: {
            directory: 'public/images/services',
            publicPath: '/images/services/',
          },
        }),
      },
    }),

    blogPosts: collection({
      label: 'Blog Posts',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({
          label: 'Excerpt',
          multiline: true
        }),
        date: fields.date({ label: 'Publish Date' }),
        author: fields.select({
          label: 'Author',
          options: [
            { label: 'Dr. Kiranmayee Bandla', value: 'dr-kiranmayee' },
            { label: 'Dr. Suman Vemuri', value: 'dr-suman' },
          ],
          defaultValue: 'dr-kiranmayee',
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'General Dentistry', value: 'general' },
            { label: 'Cosmetic Dentistry', value: 'cosmetic' },
            { label: 'Oral Health', value: 'oral-health' },
            { label: 'Patient Tips', value: 'tips' },
          ],
          defaultValue: 'general',
        }),
        featured: fields.checkbox({
          label: 'Featured Post',
          defaultValue: false
        }),
        image: fields.image({
          label: 'Featured Image',
          directory: 'public/images/blog',
          publicPath: '/images/blog/',
        }),
        content: fields.document({
          label: 'Content',
          formatting: true,
          dividers: true,
          links: true,
          images: {
            directory: 'public/images/blog',
            publicPath: '/images/blog/',
          },
        }),
      },
    }),

    patientEducation: collection({
      label: 'Patient Education',
      slugField: 'title',
      path: 'src/content/patient-education/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({
          label: 'Description',
          multiline: true
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Procedures', value: 'procedures' },
            { label: 'Oral Health', value: 'oral-health' },
            { label: 'Prevention', value: 'prevention' },
          ],
          defaultValue: 'oral-health',
        }),
        content: fields.document({
          label: 'Content',
          formatting: true,
          dividers: true,
          links: true,
          images: {
            directory: 'public/images/education',
            publicPath: '/images/education/',
          },
        }),
      },
    }),

    galleryItems: collection({
      label: 'Gallery Cases',
      slugField: 'title',
      path: 'src/content/gallery/*',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Veneers', value: 'veneers' },
            { label: 'Implants', value: 'implants' },
            { label: 'Whitening', value: 'whitening' },
            { label: 'Orthodontics', value: 'orthodontics' },
            { label: 'Cosmetic', value: 'cosmetic' },
            { label: 'Crowns', value: 'crowns' },
            { label: 'Fillings', value: 'fillings' },
          ],
          defaultValue: 'cosmetic',
        }),
        description: fields.text({
          label: 'Case Description',
          multiline: true
        }),
        beforeImage: fields.image({
          label: 'Before Image',
          directory: 'public/images/gallery',
          publicPath: '/images/gallery/',
        }),
        afterImage: fields.image({
          label: 'After Image',
          directory: 'public/images/gallery',
          publicPath: '/images/gallery/',
        }),
        featured: fields.checkbox({
          label: 'Featured Case',
          defaultValue: false
        }),
      },
    }),

    team: collection({
      label: 'Team Members',
      slugField: 'name',
      path: 'src/content/team/*',
      format: { contentField: 'bio' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        title: fields.text({ label: 'Professional Title' }),
        image: fields.image({
          label: 'Photo',
          directory: 'public/images/team',
          publicPath: '/images/team/',
        }),
        credentials: fields.text({
          label: 'Credentials',
          multiline: true
        }),
        specialties: fields.array(
          fields.text({ label: 'Specialty' }),
          { label: 'Specialties', itemLabel: props => props.value }
        ),
        bio: fields.document({
          label: 'Biography',
          formatting: true,
          dividers: true,
          links: true,
        }),
      },
    }),
  },

  singletons: {
    homepage: {
      label: 'Homepage',
      path: 'src/content/homepage',
      schema: {
        heroHeading: fields.text({
          label: 'Hero Heading',
          defaultValue: 'Your Smile is Our Priority'
        }),
        heroSubheading: fields.text({
          label: 'Hero Subheading',
          multiline: true,
          defaultValue: 'Experience exceptional dental care in a comfortable, modern environment.'
        }),
        ctaPrimaryText: fields.text({
          label: 'Primary CTA Text',
          defaultValue: 'Book Appointment'
        }),
        ctaSecondaryText: fields.text({
          label: 'Secondary CTA Text',
          defaultValue: 'Learn More'
        }),
        welcomeHeading: fields.text({
          label: 'Welcome Section Heading',
          defaultValue: 'Welcome to NextGen Dental'
        }),
        welcomeText: fields.document({
          label: 'Welcome Section Content',
          formatting: true,
          links: true,
        }),
        featuresHeading: fields.text({
          label: 'Features Section Heading',
          defaultValue: 'Why Choose NextGen Dental?'
        }),
      },
    },

    siteSettings: {
      label: 'Site Settings',
      path: 'src/content/site-settings',
      schema: {
        siteName: fields.text({
          label: 'Site Name',
          defaultValue: 'NextGen Dental'
        }),
        tagline: fields.text({
          label: 'Tagline',
          defaultValue: 'Modern Dental Care in Buda, TX'
        }),
        phone: fields.text({
          label: 'Phone Number',
          defaultValue: '(512) 523-4000'
        }),
        email: fields.text({
          label: 'Email',
          defaultValue: 'info@nextgendental.com'
        }),
        address: fields.text({
          label: 'Address',
          multiline: true,
          defaultValue: '123 Main St\nBuda, TX 78610'
        }),
        hours: fields.document({
          label: 'Office Hours',
          formatting: true,
        }),
        emergencyMessage: fields.text({
          label: 'Emergency Message',
          multiline: true
        }),
      },
    },
  },
});
