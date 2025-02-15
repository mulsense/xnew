import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy';

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: 'dist/xnew.js',
                format: 'umd',
                extend: true,
                name: 'xnew', // name: 'window
                freeze: false,
            },
            {
                file: 'dist/xnew.module.js',
                format: 'esm',
                extend: true,
                name: 'xnew', // name: 'window
                freeze: false
            },
        ],
        plugins: [
            // resolve(), // resolve node_modules
            // commonjs() // CommonJS -> ES6
            copy({
                targets: [
                  { src: 'dist/xnew.js', dest: 'website/static/dist' }
                ]
            })
        ]
    },
    {
        input: 'src/addons/xthree.js',
        output: [
            {
                file: 'dist/addons/xthree.js',
                format: 'umd',
                extend: true,
                name: 'xthree',
                freeze: false,
            }
        ],
        external: ['xnew'],
        plugins: [
            // resolve(), // resolve node_modules
            // commonjs() // CommonJS -> ES6
            copy({
                targets: [
                  { src: 'dist/addons/xthree.js', dest: 'website/static/dist/addons' }
                ]
            })
        ]
    }
];