import { build } from 'vite';
import { build as esbuild } from 'esbuild';
import path from 'path';

async function buildApp() {
  console.log('Building client...');
  await build();
  
  console.log('Building server...');
  await esbuild({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist/index.cjs',
    external: [
      'pg-native',
      'better-sqlite3',
      'mysql2',
      '@libsql/client',
      'fsevents',
      'lightningcss',
      '@babel/core',
      '@babel/preset-typescript',
      'vite',
      'esbuild',
      '../vite.config',
      './vite.config',
      '@vitejs/*',
      '@replit/*',
    ],
    sourcemap: true,
    minify: false,
  });
  
  console.log('Build completed successfully!');
}

buildApp().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
