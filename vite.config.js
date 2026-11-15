import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dir, 'index.html'),
        resq: resolve(__dir, 'resq.html'),
        login: resolve(__dir, 'login.html'),
        commandLogin: resolve(__dir, 'command-login.html'),
        command: resolve(__dir, 'command.html')
      }
    }
  }
});
