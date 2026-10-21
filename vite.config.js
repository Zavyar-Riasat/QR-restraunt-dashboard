import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Nominatim Geocoding proxy plugin with proper User-Agent and Referer headers
function nominatimGeocodePlugin() {
  return {
    name: 'vite-plugin-nominatim-geocode',
    configureServer(server) {
      server.middlewares.use('/api/geocode', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost:5173');
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
              'User-Agent': 'DineHQ-Restaurant-Platform/1.0 (contact@dinehq.pk)',
              'Referer': 'http://localhost:5173/',
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nominatimGeocodePlugin(),
  ],
});
