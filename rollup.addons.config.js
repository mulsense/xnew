import typescript from '@rollup/plugin-typescript';
import { cpSync } from 'fs';

function copyto(src, dst) {
    return {
        name: 'copyto',
        writeBundle() {
            cpSync(src, dst, { recursive: true, force: true });
        },
    };
}

export default [
    {
        input: './src/addons/xpixi.ts',
        output: [
            {
                file: './dist/addons/xpixi.js',
                format: 'umd',
                extend: true,
                name: 'xpixi',
                globals: { 'xnew': 'xnew', 'pixi.js': 'PIXI' },
            },
            {
                file: './dist/addons/xpixi.mjs',
                format: 'es',
            },
        ],
        external: ['xnew', 'pixi.js'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.addons.json' }),
            copyto('./dist/addons/xpixi.d.ts', './examples/dist/addons/xpixi.d.ts'),
            copyto('./dist/addons/xpixi.js', './examples/dist/addons/xpixi.js'),
            copyto('./dist/addons/xpixi.mjs', './examples/dist/addons/xpixi.mjs'),
        ],
    },
    {
        input: './src/addons/xthree.ts',
        output: [
            {
                file: './dist/addons/xthree.js',
                format: 'umd',
                extend: true,
                name: 'xthree',
                globals: { 'xnew': 'xnew', 'three': 'THREE' },
            },
            {
                file: './dist/addons/xthree.mjs',
                format: 'es',
            },
        ],
        external: ['xnew', 'three'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.addons.json' }),
            copyto('./dist/addons/xthree.d.ts', './examples/dist/addons/xthree.d.ts'),
            copyto('./dist/addons/xthree.js', './examples/dist/addons/xthree.js'),
            copyto('./dist/addons/xthree.mjs', './examples/dist/addons/xthree.mjs'),
        ],
    },
    {
        input: './src/addons/xmatter.ts',
        output: [
            {
                file: './dist/addons/xmatter.js',
                format: 'umd',
                extend: true,
                name: 'xmatter',
                globals: { 'xnew': 'xnew', 'matter-js': 'Matter' },
            },
            {
                file: './dist/addons/xmatter.mjs',
                format: 'es',
            },
        ],
        external: ['xnew', 'matter-js'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.addons.json' }),
            copyto('./dist/addons/xmatter.d.ts', './examples/dist/addons/xthree.d.ts'),
            copyto('./dist/addons/xmatter.js', './examples/dist/addons/xmatter.js'),
            copyto('./dist/addons/xmatter.mjs', './examples/dist/addons/xmatter.mjs'),
        ],
    },
    {
        input: './src/addons/xaudio.ts',
        output: [
            {
                file: './dist/addons/xaudio.js',
                format: 'umd',
                extend: true,
                name: 'xaudio',
                globals: { 'xnew': 'xnew' },
            },
            {
                file: './dist/addons/xaudio.mjs',
                format: 'es',
            },
        ],
        external: ['xnew'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.addons.json' }),
            copyto('./dist/addons/xaudio.d.ts', './examples/dist/addons/xaudio.d.ts'),
            copyto('./dist/addons/xaudio.js', './examples/dist/addons/xaudio.js'),
            copyto('./dist/addons/xaudio.mjs', './examples/dist/addons/xaudio.mjs'),
        ],
    },
];