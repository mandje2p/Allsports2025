import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify("AIzaSyD_KUrg1y57dHNq-NnH63ykikKGLIuKnq8"),
        'process.env.GEMINI_API_KEY': JSON.stringify("AIzaSyD_KUrg1y57dHNq-NnH63ykikKGLIuKnq8")
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});