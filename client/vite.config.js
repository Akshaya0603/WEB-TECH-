import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '../server');

export default defineConfig(({ mode }) => {
  // Read HTTPS / PORT from server/.env so client and API always use the same protocol
  const env = loadEnv(mode, serverDir, '');
  const useHttps = env.HTTPS === 'true';
  const apiPort = env.PORT || 5000;
  const cert = (f) => fs.readFileSync(path.join(serverDir, 'certs', f));

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Same self-signed certificate as the API (created by: cd server && npm run make-cert)
      https: useHttps ? { key: cert('localhost-key.pem'), cert: cert('localhost.pem') } : undefined,
      proxy: {
        '/api': {
          target: `${useHttps ? 'https' : 'http'}://localhost:${apiPort}`,
          secure: false, // accept our own self-signed certificate on localhost
        },
      },
    },
  };
});
