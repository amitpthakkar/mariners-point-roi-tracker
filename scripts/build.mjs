import { cp, mkdir, rm } from 'node:fs/promises';

// Publish only app assets. Function source and private import settings stay server-side.
const files = ['index.html', 'app.js', 'styles.css', 'cloud.js', 'cloud-state.js',
  'history-import.js', 'assets', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'favicon-16x16.png', 'favicon-32x32.png', 'site.webmanifest', 'westise.png',
  'bunker.svg', 'golf-flag.svg'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of files) await cp(file, 'dist/' + file, { recursive: true });
