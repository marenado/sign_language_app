import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build' 
  },
  base: '/', 
  server: {
    port: 3000,
    // proxy: {
    //   '/api': { target: 'https://signlearn.onrender.com', changeOrigin: true, secure: false }
    // }
  }
});
