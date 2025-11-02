import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
    {
        input: './src/index.ts',
        output: [
            {
                file: './dist/index.js',
                format: 'es',
            },
        ],
        external: ['@mulsense/xnew', '@mulsense/xnew/addons/xpixi', 'pixi.js'],
        plugins: [
            resolve(),
            commonjs(),
            typescript()
        ],
    },
    // {
    //     input: './src/index.ts',
    //     output: [
    //         {
    //             file: './dist/index_iife.js',
    //             format: 'iife',
    //             inlineDynamicImports: true,
    //         }
    //     ],
    //     plugins: [
    //         resolve(),
    //         commonjs(),
    //         typescript()
    //     ],
    // },
];