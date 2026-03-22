import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. Import the Tailwind v4 plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),      // 2. React plugin
    tailwindcss(), // 3. Tailwind v4 plugin (handles DaisyUI via CSS)
  ],
})