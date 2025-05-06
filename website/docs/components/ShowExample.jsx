import CodeBlock from '@theme/CodeBlock';

export default function ShowExample({ height, name, code }) {
    code = code.replace('../../thirdparty/matter/matter.min.mjs', 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/+esm');
    code = code.replace('../../thirdparty/three/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm');
    code = code.replace('../../thirdparty/pixi/pixi.min.mjs', 'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.6.6/pixi.min.mjs');
    // https://esm.sh/@dimforge/rapier2d-compat@0.16.0/es2022/rapier2d-compat.mjs
    code = code.replace('../../dist/xnew.module.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/xnew.module.js');
    code = code.replace('../../dist/addons/xpixi.module.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xpixi.module.js');
    code = code.replace('../../dist/addons/xthree.module.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xthree.module.js');
    code = code.replace('../../dist/addons/xmatter.module.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xmatter.module.js');
    code = code.replace('../../dist/addons/xutil.module.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xutil.module.js');
    code = code.replace('../../dist/addons/xaudio.module.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xaudio.module.js');

    code = code.replace('../../thirdparty/matter/matter.min.js', 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0');
    code = code.replace('../../thirdparty/three/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.176.0');
    code = code.replace('../../thirdparty/pixi/pixi.min.js', 'https://pixijs.download/v7.0.5/pixi.min.js');

    code = code.replace('../../dist/xnew.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/xnew.js');
    code = code.replace('../../dist/addons/xpixi.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xpixi.js');
    code = code.replace('../../dist/addons/xthree.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xthree.js');
    code = code.replace('../../dist/addons/xmatter.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xmatter.js');
    code = code.replace('../../dist/addons/xutil.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xutil.js');
    code = code.replace('../../dist/addons/xaudio.js', 'https://unpkg.com/@mulsense/xnew@2.6.x/dist/addons/xaudio.js');
    return (
        <>
            <iframe style={{width: '100%', height, border: 'solid 1px #DDD', borderRadius: '6px' }} src={'/xnew/' + name} ></iframe>
            <CodeBlock language='html'>{code}</CodeBlock>
        </>
    )
}