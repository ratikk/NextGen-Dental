import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [tailwind(), sitemap(), react()],
  site: 'https://lilacdentalaustintx.com',
  output: 'static',
  server: {
    host: '0.0.0.0'
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp', // This is correct for custom config
      // You can add config here if needed
      // config: { ... }
    }
  }
});