import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import fs from 'fs/promises';
import path from 'path';
import type { Plugin } from 'vite';

// Create a custom plugin for file saving
const fileSaverPlugin = (): Plugin => ({
  name: 'file-saver',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith('/api/save-document')) {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { name, fileData, documentType, firstFive } = JSON.parse(body);

            // Create the full path
            const basePath = path.join('D:', 'bike_desktops', 'bike_desktop', 'src', 'assets', 'owner_documents');
            const ownerDir = path.join(basePath, name);
            const fileExtension = documentType === '8a_document' || documentType === '7_12_document' ? 'pdf' : 'jpg';
            const filePath = path.join(ownerDir, `${documentType}_${firstFive}.${fileExtension}`);

            // Create directory if it doesn't exist
            await fs.mkdir(ownerDir, { recursive: true });

            // Remove the data URL prefix and save the file
            if (documentType === '8a_document' || documentType === '7_12_document') {
              // For PDF files
              const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '');
              await fs.writeFile(filePath, base64Data, 'base64');
            } else {
              // For images
              const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
              await fs.writeFile(filePath, base64Data, 'base64');
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                path: filePath
              })
            );
          } catch (error) {
            console.error('Error saving document:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: String(error)
              })
            );
          }
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  // IMPORTANT: Always use relative paths for production build
  base: './',
  plugins: [
    react(),
    viteTsconfigPaths(),
    fileSaverPlugin() // Keep your custom plugin
  ],
  define: {
    global: 'window'
  },
  resolve: {
    alias: [
      // Your existing alias configurations
    ]
  },
  server: {
    // this ensures that the browser opens upon server start
    open: !process.env.ELECTRON_DEV, // Don't open browser when running with Electron
    // this sets a default port to 3000
    port: 5173,
    strictPort: true // Ensure it always uses port 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Ensure assets are referenced correctly in Electron
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Ensure consistent naming and paths
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
