import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [tailwind(), sitemap(), react()],
  // ✅ UPDATED: The correct domain
  site: 'https://nextgendentalaustintx.com', 
  output: 'static',
  server: {
    host: '0.0.0.0'
  },
  // Performance: Keep CSS inside HTML to stop "Render Blocking" warnings
  build: {
    inlineStylesheets: 'always',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    remotePatterns: [{ protocol: "https" }],
  },
  vite: {
    build: {
      cssCodeSplit: false,
    },
    ssr: {
      noExternal: ['swiper', 'aos'],
    },
  }
});
