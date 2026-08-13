
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/insight-pick/',
  plugins: [react()],
  define: {
    // Ensure process.env is available for API_KEY
    'process.env': process.env
  }
})
