import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://lilacdentalaustintx.com',
  server: {
    host: '0.0.0.0',
    port: 4321,
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  vite: {
    server: {
      https: true,
      timeout: 300000
    },
    ssr: {
      noExternal: ['swiper', '@supabase/supabase-js']
    },
    build: {
      rollupOptions: {
        output: {
          inlineDynamicImports: false
        }
      }
    }
  },
  integrations: [
    tailwind(),
    sitemap({
      canonicalURL: 'https://lilacdentalaustintx.com'
    }),
     react()
  ],
  output: 'static',
  build: {
    format: 'directory'
  }
});
