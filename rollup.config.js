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
        ],
        watch: {
            clearScreen: false,
        }
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
        ],
        watch: {
            clearScreen: false,
        }
    },
];