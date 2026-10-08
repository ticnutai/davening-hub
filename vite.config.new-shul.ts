import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { copyFileSync, cpSync } from 'node:fs';

/** Offline APK entry only. No inherited PWA, updater, deployment or public APKs. */
export default defineConfig({
  publicDir: false,
  plugins: [react(), {
    name: 'new-shul-offline-assets',
    closeBundle() {
      const out = path.resolve('dist-new-shul');
      cpSync('public/new-shul-assets', path.join(out, 'new-shul-assets'), { recursive: true });
      cpSync('public-tv/fonts', path.join(out, 'public-tv/fonts'), { recursive: true });
      copyFileSync(path.join(out, 'new-shul.html'), path.join(out, 'index.html'));
    },
  }],
  resolve: { alias: { '@': path.resolve('src'), '@community': path.resolve('src/community') } },
  define: {
    'import.meta.env.VITE_NEW_SHUL_LOCAL': JSON.stringify('true'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(''),
    __APP_VERSION__: JSON.stringify('0.1.3'), __APP_BUILD_ID__: JSON.stringify('new-shul-4'),
  },
  build: { outDir: 'dist-new-shul', rollupOptions: { input: path.resolve('new-shul.html') } },
});
