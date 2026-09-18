import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// One-off config used only to export a single self-contained HTML file for
// sharing outside the dev environment (e.g. PTL-Console-Prototype.html).
// Builds a plain IIFE bundle instead of the default ES module output, since
// <script type="module"> is blocked by browsers when the HTML is opened
// directly via file:// (double-click) rather than served over http(s).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-standalone',
    rollupOptions: {
      input: 'index.standalone.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
      },
    },
  },
})
