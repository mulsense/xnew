import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import { rmSync, cpSync } from 'fs';

function cleanup(target) {
    return {
        name: 'cleanup', 
        writeBundle() {
            rmSync(target, { recursive: true, force: true });
        },
    };
}

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
        input: './src/index.ts',
        output: [
            {
                file: './dist/xnew.js',
                format: 'umd',
                extend: true,
                name: 'xnew',
            },
            {
                file: './dist/xnew.mjs',
                format: 'es',
            }
        ],
        plugins: [
            typescript(),
            copyto('./dist/xnew.js', './examples/dist/xnew.js'),
            copyto('./dist/xnew.mjs', './examples/dist/xnew.mjs'),
        ],
    },
    {
        input: './dist/types/index.d.ts',
        output: {
            file: './dist/xnew.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            cleanup('./dist/types'),
            copyto('./dist/xnew.d.ts', './examples/dist/xnew.d.ts'),
        ],
    },
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
            copyto('./dist/addons/xthree.js', './examples/dist/addons/xthree.js'),
            copyto('./dist/addons/xthree.mjs', './examples/dist/addons/xthree.mjs'),
        ],
    }
];