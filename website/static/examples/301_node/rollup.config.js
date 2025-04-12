import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

export default {
    input: 'src/xnew-pixi.js',
    output: {
        file: 'dist/xnew-pixi.js',
        format: 'umd',
        globals: { 'pixi.js': 'PIXI' }
    },
    external: ['pixi.js'],
    plugins: [
        resolve(),
        commonjs()
    ]
};