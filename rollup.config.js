import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';

export default {
  entry: 'lib/index.js',
  dest: 'dist/bundle.js',
  format: 'es',
  plugins: [
    resolve({
      main: true,
      browser: true
    }),
    commonjs(),
    globals(),
    builtins()
  ]
};
