import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import { cpSync } from 'fs';

const configs = [];
export default configs;

append('', 'index', 'xnew');
append('addons/', 'xpixi', 'xpixi',  { '@mulsense/xnew': 'xnew', 'pixi.js': 'PIXI' });
append('addons/', 'xthree', 'xthree', { '@mulsense/xnew': 'xnew', 'three': 'THREE' });
append('addons/', 'xmatter', 'xmatter', { '@mulsense/xnew': 'xnew', 'matter-js': 'Matter' });
append('addons/', 'xrapier2d', 'xrapier2d', { '@mulsense/xnew': 'xnew', '@dimforge/rapier2d-compat': 'RAPIER' });
append('addons/', 'xrapier3d', 'xrapier3d', { '@mulsense/xnew': 'xnew', '@dimforge/rapier3d-compat': 'RAPIER' });

function append(dir, src, name, globals = {}) {
    // ESM build — from source (named exports: `import { xnew } from ...`).
    configs.push({
        input: `./src/${dir}${src}.ts`,
        output: [
            { file: `./dist/${dir}${name}.mjs`, format: 'es', },
        ],
        external: Object.keys(globals),
        plugins: [
            typescript({ removeComments: true }),
            copyto(`./dist/${dir}${name}.mjs`, `./examples/dist/${dir}${name}.mjs`),
        ],
    });
    // UMD build — from the `.umd` wrapper, whose default export keeps the global
    // (`window.xnew` / `window.xpixi` …) the callable function / object it has always been.
    configs.push({
        input: `./src/${dir}${src}.umd.ts`,
        output: [
            { file: `./dist/${dir}${name}.js`, format: 'umd', extend: true, name, globals, exports: 'default', },
        ],
        external: Object.keys(globals),
        plugins: [
            typescript({ removeComments: true }),
            copyto(`./dist/${dir}${name}.js`, `./examples/dist/${dir}${name}.js`),
        ],
    });
    configs.push({
        input: `./src/${dir}${src}.ts`,
        output: { file: `./dist/${dir}${name}.d.ts`, format: 'es', },
        plugins: [
            dts({ compilerOptions: { removeComments: true } }),
            copyto(`./dist/${dir}${name}.d.ts`, `./examples/dist/${dir}${name}.d.ts`),
        ]
    });
    function copyto(src, dst) {
        return {
            name: 'copyto',
            writeBundle() { cpSync(src, dst, { recursive: true, force: true }); },
        };
    }
}
