import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: 'dist/xnew.js',
                format: 'umd',
                extend: true,
                name: 'xnew',
                freeze: false,
            },
            {
                file: 'dist/xnew.module.js',
                format: 'esm',
                extend: true,
                name: 'xnew',
                freeze: false
            },
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
                globals: { 'xnew': 'xnew' },
            },
            {
                file: 'dist/addons/xthree.module.js',
                format: 'esm',
                extend: true,
                name: 'xthree',
                freeze: false
            },
        ],
        external: ['xnew']
    },
    {
        input: 'src/addons/xpixi.js',
        output: [
            {
                file: 'dist/addons/xpixi.js',
                format: 'umd',
                extend: true,
                name: 'xpixi',
                freeze: false,
                globals: { 'xnew': 'xnew' },
            },
            {
                file: 'dist/addons/xpixi.module.js',
                format: 'esm',
                extend: true,
                name: 'xpixi',
                freeze: false
            },
        ],
        external: ['xnew'],
    },
    {
        input: 'src/addons/xmatter.js',
        output: [
            {
                file: 'dist/addons/xmatter.js',
                format: 'umd',
                extend: true,
                name: 'xmatter',
                freeze: false,
                globals: { 'xnew': 'xnew', 'matter-js': 'Matter' },
            },
            {
                file: 'dist/addons/xmatter.module.js',
                format: 'esm',
                extend: true,
                name: 'xmatter',
                freeze: false
            },
        ],
        external: ['xnew', 'matter-js'],
    }
];