import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  minify: false,
  splitting: false,
  onSuccess: async () => {
    const src = path.resolve('src/templates');
    const dest = path.resolve('dist/templates');
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  },
});
