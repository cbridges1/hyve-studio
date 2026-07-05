import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this as a project site (https://<user>.github.io/hyve-studio/),
// so production builds need every asset path prefixed with /hyve-studio/. Local dev
// keeps serving from / so `npm run dev` doesn't require the subpath.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/hyve-studio/' : '/',
  plugins: [react()],
}))
