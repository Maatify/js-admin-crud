import { build } from 'esbuild';

const common = { bundle: true, sourcemap: true, target: 'es2019', logLevel: 'info' };

await build({ ...common, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/maatify-admin-crud.esm.js' });
// Browser <script> build for non-bundled pages: exposes window.MaatifyAdminCrud
await build({ ...common, entryPoints: ['src/index.js'], format: 'iife', globalName: 'MaatifyAdminCrud', minify: true, outfile: 'dist/maatify-admin-crud.iife.min.js' });
