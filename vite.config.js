import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'moodle-dev-proxy',
      configureServer(server) {
        server.middlewares.use('/api/moodle-proxy', async (req, res) => {
          try {
            const url = new URL(req.url, 'http://localhost');
            const target = url.searchParams.get('url');
            if (!target) {
              res.statusCode = 400;
              return res.end('Missing target url');
            }

            let body = [];
            for await (const chunk of req) {
              body.push(chunk);
            }
            body = Buffer.concat(body);

            const fetchResp = await fetch(target, {
              method: req.method,
              headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'User-Agent': 'MoodleMobile/4.4.0 (Windows NT 10.0; Win64; x64)',
              },
              body: ['POST', 'PUT', 'PATCH'].includes(req.method) && body.length ? body : undefined,
            });

            res.statusCode = fetchResp.status;
            fetchResp.headers.forEach((v, k) => {
              if (!['content-encoding', 'content-length'].includes(k.toLowerCase())) {
                res.setHeader(k, v);
              }
            });
            res.setHeader('Access-Control-Allow-Origin', '*');
            const data = await fetchResp.arrayBuffer();
            res.end(Buffer.from(data));
          } catch (err) {
            res.statusCode = 500;
            res.end(err.message);
          }
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5180,
    watch: {
      ignored: ['**/android/**', '**/dist/**'],
    },
  },
});
