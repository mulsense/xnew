import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
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
            typescript({ tsconfig: 'tsconfig.json' }),
            copyto('./dist/xnew.js', './examples/dist/xnew.js'),
            copyto('./dist/xnew.mjs', './examples/dist/xnew.mjs'),
        ]
    },
    {
        input: './src/index.ts',
        output: {
            file: './dist/xnew.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            copyto('./dist/xnew.d.ts', './examples/dist/xnew.d.ts'),
        ]
    },
    {
        input: './src/addons/xpixi.ts',
        output: [
            {
                file: './dist/addons/xpixi.js',
                format: 'umd',
                extend: true,
                name: 'xpixi',
                globals: { '@mulsense/xnew': 'xnew', 'pixi.js': 'PIXI' },
            },
            {
                file: './dist/addons/xpixi.mjs',
                format: 'es',
            },
        ],
        external: ['@mulsense/xnew', 'pixi.js'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.json' }),
            copyto('./dist/addons/xpixi.js', './examples/dist/addons/xpixi.js'),
            copyto('./dist/addons/xpixi.mjs', './examples/dist/addons/xpixi.mjs'),
        ],
    },
    {
        input: './src/addons/xpixi.ts',
        output: {
            file: './dist/addons/xpixi.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            copyto('./dist/addons/xpixi.d.ts', './examples/dist/addons/xpixi.d.ts'),
        ]
    },
    {
        input: './src/addons/xthree.ts',
        output: [
            {
                file: './dist/addons/xthree.js',
                format: 'umd',
                extend: true,
                name: 'xthree',
                globals: { '@mulsense/xnew': 'xnew', 'three': 'THREE' },
            },
            {
                file: './dist/addons/xthree.mjs',
                format: 'es',
            },
        ],
        external: ['@mulsense/xnew', 'three'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.json' }),
            copyto('./dist/addons/xthree.js', './examples/dist/addons/xthree.js'),
            copyto('./dist/addons/xthree.mjs', './examples/dist/addons/xthree.mjs'),
        ],
    },
    {
        input: './src/addons/xthree.ts',
        output: {
            file: './dist/addons/xthree.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            copyto('./dist/addons/xthree.d.ts', './examples/dist/addons/xthree.d.ts'),
        ]
    },
    {
        input: './src/addons/xmatter.ts',
        output: [
            {
                file: './dist/addons/xmatter.js',
                format: 'umd',
                extend: true,
                name: 'xmatter',
                globals: { '@mulsense/xnew': 'xnew', 'matter-js': 'Matter' },
            },
            {
                file: './dist/addons/xmatter.mjs',
                format: 'es',
            },
        ],
        external: ['@mulsense/xnew', 'matter-js'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.json' }),
            copyto('./dist/addons/xmatter.js', './examples/dist/addons/xmatter.js'),
            copyto('./dist/addons/xmatter.mjs', './examples/dist/addons/xmatter.mjs'),
        ],
    },
    {
        input: './src/addons/xmatter.ts',
        output: {
            file: './dist/addons/xmatter.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            copyto('./dist/addons/xmatter.d.ts', './examples/dist/addons/xmatter.d.ts'),
        ]
    },
    {
        input: './src/addons/xrapier2d.ts',
        output: [
            {
                file: './dist/addons/xrapier2d.js',
                format: 'umd',
                extend: true,
                name: 'xrapier2d',
                globals: { '@mulsense/xnew': 'xnew', '@dimforge/rapier2d-compat': 'RAPIER' },
            },
            {
                file: './dist/addons/xrapier2d.mjs',
                format: 'es',
            },
        ],
        external: ['@mulsense/xnew', '@dimforge/rapier2d-compat'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.json' }),
            copyto('./dist/addons/xrapier2d.js', './examples/dist/addons/xrapier2d.js'),
            copyto('./dist/addons/xrapier2d.mjs', './examples/dist/addons/xrapier2d.mjs'),
        ],
    },
    {
        input: './src/addons/xrapier2d.ts',
        output: {
            file: './dist/addons/xrapier2d.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            copyto('./dist/addons/xrapier2d.d.ts', './examples/dist/addons/xrapier2d.d.ts'),
        ]
    },
    {
        input: './src/addons/xrapier3d.ts',
        output: [
            {
                file: './dist/addons/xrapier3d.js',
                format: 'umd',
                extend: true,
                name: 'xrapier3d',
                globals: { '@mulsense/xnew': 'xnew', '@dimforge/rapier3d-compat': 'RAPIER' },
            },
            {
                file: './dist/addons/xrapier3d.mjs',
                format: 'es',
            },
        ],
        external: ['@mulsense/xnew', '@dimforge/rapier3d-compat'],
        plugins: [
            typescript({ tsconfig: 'tsconfig.json' }),
            copyto('./dist/addons/xrapier3d.js', './examples/dist/addons/xrapier3d.js'),
            copyto('./dist/addons/xrapier3d.mjs', './examples/dist/addons/xrapier3d.mjs'),
        ],
    },
    {
        input: './src/addons/xrapier3d.ts',
        output: {
            file: './dist/addons/xrapier3d.d.ts',
            format: 'es',
        },
        plugins: [
            dts(),
            copyto('./dist/addons/xrapier3d.d.ts', './examples/dist/addons/xrapier3d.d.ts'),
        ]
    },
];