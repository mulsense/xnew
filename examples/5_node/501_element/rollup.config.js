import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
export default [
    {
        input: 'index.ts',
        output: [
            {
                file: 'index.js',
                format: 'umd',
                name: 'myApp',
            },
        ],
        plugins: [
            resolve(),
            typescript()
        ],
    },
    
];