import typescript from '@rollup/plugin-typescript';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/xnew.js',
                format: 'umd',
                extend: true,
                name: 'xnew',
                freeze: false,
            },
            {
                file: 'dist/xnew.mjs',
                format: 'esm',
                extend: true,
                name: 'xnew',
                freeze: false
            }
        ],
        plugins: [
            typescript()
        ],
    },
    // {
    //     input: 'src/addons/xpixi.ts',
    //     output: [
    //         {
    //             file: 'dist/addons/xpixi.js',
    //             format: 'umd',
    //             extend: true,
    //             name: 'xpixi',
    //             freeze: false,
    //             // globals: { 'xnew': 'xnew', 'pixi.js': 'PIXI' },
    //         },
    //         {
    //             file: 'dist/addons/xpixi.mjs',
    //             format: 'esm',
    //             extend: true,
    //             name: 'xpixi',
    //             freeze: false
    //         },
    //     ],
    //     external: ['xnew', 'pixi.js', '../index'],
    //     plugins: [
    //         typescript({ tsconfig: 'tsconfig.addons.json' })
    //     ],
    // },
];