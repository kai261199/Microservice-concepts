import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/orders': 'http://localhost:5001',
      '/api/payments': 'http://localhost:5002',
      '/api/inventory': 'http://localhost:5003',
    },
  },
});
