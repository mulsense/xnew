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
            {
                file: 'examples/dist/xnew.js',
                format: 'umd',
                extend: true,
                name: 'xnew',
                freeze: false,
            },
            {
                file: 'examples/dist/xnew.module.js',
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
                globals: { 'xnew': 'xnew', 'three': 'THREE' },
            },
            {
                file: 'dist/addons/xthree.module.js',
                format: 'esm',
                extend: true,
                name: 'xthree',
                freeze: false
            },
            {
                file: 'examples/dist/addons/xthree.js',
                format: 'umd',
                extend: true,
                name: 'xthree',
                freeze: false,
                globals: { 'xnew': 'xnew', 'three': 'THREE' },
            },
            {
                file: 'examples/dist/addons/xthree.module.js',
                format: 'esm',
                extend: true,
                name: 'xthree',
                freeze: false
            },
        ],
        external: ['xnew', 'three'],
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
                globals: { 'xnew': 'xnew', 'pixi.js': 'PIXI' },
            },
            {
                file: 'dist/addons/xpixi.module.js',
                format: 'esm',
                extend: true,
                name: 'xpixi',
                freeze: false
            },
            {
                file: 'examples/dist/addons/xpixi.js',
                format: 'umd',
                extend: true,
                name: 'xpixi',
                freeze: false,
                globals: { 'xnew': 'xnew', 'pixi.js': 'PIXI' },
            },
            {
                file: 'examples/dist/addons/xpixi.module.js',
                format: 'esm',
                extend: true,
                name: 'xpixi',
                freeze: false
            },
        ],
        external: ['xnew', 'pixi.js'],
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
            {
                file: 'examples/dist/addons/xmatter.js',
                format: 'umd',
                extend: true,
                name: 'xmatter',
                freeze: false,
                globals: { 'xnew': 'xnew', 'matter-js': 'Matter' },
            },
            {
                file: 'examples/dist/addons/xmatter.module.js',
                format: 'esm',
                extend: true,
                name: 'xmatter',
                freeze: false
            },
        ],
        external: ['xnew', 'matter-js'],
    },
    {
        input: 'src/addons/xutil.js',
        output: [
            {
                file: 'dist/addons/xutil.js',
                format: 'umd',
                extend: true,
                name: 'xutil',
                freeze: false,
                globals: { 'xnew': 'xnew' },
            },
            {
                file: 'dist/addons/xutil.module.js',
                format: 'esm',
                extend: true,
                name: 'xutil',
                freeze: false
            },
            {
                file: 'examples/dist/addons/xutil.js',
                format: 'umd',
                extend: true,
                name: 'xutil',
                freeze: false,
                globals: { 'xnew': 'xnew' },
            },
            {
                file: 'examples/dist/addons/xutil.module.js',
                format: 'esm',
                extend: true,
                name: 'xutil',
                freeze: false
            },
        ],
        external: ['xnew'],
    },
    {
        input: 'src/addons/xaudio.js',
        output: [
            {
                file: 'dist/addons/xaudio.js',
                format: 'umd',
                extend: true,
                name: 'xaudio',
                freeze: false,
                globals: { 'xnew': 'xnew' },
            },
            {
                file: 'dist/addons/xaudio.module.js',
                format: 'esm',
                extend: true,
                name: 'xaudio',
                freeze: false
            },
            {
                file: 'examples/dist/addons/xaudio.js',
                format: 'umd',
                extend: true,
                name: 'xaudio',
                freeze: false,
                globals: { 'xnew': 'xnew' },
            },
            {
                file: 'examples/dist/addons/xaudio.module.js',
                format: 'esm',
                extend: true,
                name: 'xaudio',
                freeze: false
            },
        ],
        external: ['xnew'],
    }
];