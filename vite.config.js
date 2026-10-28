import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nominatim Geocoding proxy plugin with proper User-Agent and Referer headers
function nominatimGeocodePlugin() {
  return {
    name: 'vite-plugin-nominatim-geocode',
    configureServer(server) {
      server.middlewares.use('/api/geocode', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://127.0.0.1:5173');
          const type = url.searchParams.get('type');

          let targetUrl = '';
          if (type === 'reverse') {
            const lat = url.searchParams.get('lat');
            const lon = url.searchParams.get('lon');
            targetUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
          } else if (type === 'search') {
            const q = url.searchParams.get('q');
            const countrycodes = url.searchParams.get('countrycodes') || 'pk';
            targetUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=${countrycodes}&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid geocode type' }));
            return;
          }

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Dineflow-Restaurant-Platform/1.0 (contact@dineflow.pk)',
              'Referer': 'http://127.0.0.1:5173/',
              'Accept-Language': 'en,ur;q=0.9',
            },
          });

          const data = await response.text();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = response.status;
          res.end(data);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

// Authentication & Reversible Password Management API plugin
function authApiPlugin() {
  const handler = async (req, res, next) => {
    if (req.url && (req.url.startsWith('/api/auth') || req.url.startsWith('/api/admin'))) {
      try {
        const { handleAuthApi } = await import('./server/authHandler.js');
        return await handleAuthApi(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        return;
      }
    }
    next();
  };

  return {
    name: 'vite-plugin-auth-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// Nearby Dishes Marketplace API plugin
function nearbyDishesPlugin() {
  const handler = async (req, res, next) => {
    if (req.url && req.url.startsWith('/api/nearby/dishes')) {
      try {
        const { handleNearbyDishesApi } = await import('./server/nearbyDishesHandler.js');
        return await handleNearbyDishesApi(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        return;
      }
    }
    next();
  };

  return {
    name: 'vite-plugin-nearby-dishes',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nominatimGeocodePlugin(),
    authApiPlugin(),
    nearbyDishesPlugin(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'lucide-react',
      'leaflet',
    ],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('@geoman-io')) {
              return 'vendor-geoman';
            }
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('jsqr') || id.includes('canvg')) {
              return 'vendor-qr-tools';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
});
