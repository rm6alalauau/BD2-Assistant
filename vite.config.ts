import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  resolve: {
    alias: {
    },
  },
  define: {
  },
  build: {
    rollupOptions: {
      input: {
        // We need manually specify entry points for extra scripts we inject
        'bridge.ts': resolve(__dirname, 'src/content/bridge.ts'),
        'spine-loader': resolve(__dirname, 'src/spine-loader/index.ts')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: (id) => {
          // Force spine-loader and its dependencies (everything in src/spine-loader or imported by it) into one file
          // PixiJS and Spine are imported by spine-loader.
          if (id.includes('spine-loader') || id.includes('pixi') || id.includes('spine')) {
            return 'spine-loader';
          }
          // All other vendor stuff (if any) used by popup etc can go to vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
  },
})
