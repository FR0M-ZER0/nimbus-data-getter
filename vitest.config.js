import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 1. Diz ao Vitest para rodar como um app Node.js (não um navegador)
    environment: 'node',
    
    // 2. Diz ao Vitest para IGNORAR a pasta do Prisma
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/generated/prisma/**'
    ],
  },
});