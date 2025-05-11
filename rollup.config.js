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
];