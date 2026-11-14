import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from any folder or a file:// URL.
export default defineConfig({ plugins: [react()], base: './' });
