import CodeBlock from '@theme/CodeBlock';

export default function ShowExample({ height, name, code }) {
    code = code.replace('../../thirdparty/matter/matter.min.mjs', 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/+esm');
    code = code.replace('../../thirdparty/three/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm');
    code = code.replace('../../thirdparty/pixi/pixi.min.mjs', 'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.6.6/pixi.min.mjs');
    // https://esm.sh/@dimforge/rapier2d-compat@0.16.0/es2022/rapier2d-compat.mjs
    code = code.replace('../../dist/xnew.mjs', 'https://unpkg.com/xnew@3.0.x/dist/xnew.mjs');
    code = code.replace('../../dist/addons/xpixi.mjs', 'https://unpkg.com/xnew@3.0.x/dist/addons/xpixi.mjs');
    code = code.replace('../../dist/addons/xthree.mjs', 'https://unpkg.com/xnew@3.0.x/dist/addons/xthree.mjs');
    code = code.replace('../../dist/addons/xmatter.mjs', 'https://unpkg.com/xnew@3.0.x/dist/addons/xmatter.mjs');
    code = code.replace('../../dist/addons/xutil.mjs', 'https://unpkg.com/xnew@3.0.x/dist/addons/xutil.mjs');
    code = code.replace('../../dist/addons/xaudio.mjs', 'https://unpkg.com/xnew@3.0.x/dist/addons/xaudio.mjs');

    code = code.replace('../../thirdparty/matter/matter.min.js', 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0');
    code = code.replace('../../thirdparty/three/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.176.0');
    code = code.replace('../../thirdparty/pixi/pixi.min.js', 'https://pixijs.download/v7.0.5/pixi.min.js');
    code = code.replace('../../thirdparty/three-vrm/three-vrm.module.min.js', 'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3/lib/three-vrm.module.min.js');

    code = code.replace('../../dist/xnew.js', 'https://unpkg.com/xnew@3.0.x/dist/xnew.js');
    code = code.replace('../../dist/addons/xpixi.js', 'https://unpkg.com/xnew@3.0.x/dist/addons/xpixi.js');
    code = code.replace('../../dist/addons/xthree.js', 'https://unpkg.com/xnew@3.0.x/dist/addons/xthree.js');
    code = code.replace('../../dist/addons/xmatter.js', 'https://unpkg.com/xnew@3.0.x/dist/addons/xmatter.js');
    code = code.replace('../../dist/addons/xutil.js', 'https://unpkg.com/xnew@3.0.x/dist/addons/xutil.js');
    code = code.replace('../../dist/addons/xaudio.js', 'https://unpkg.com/xnew@3.0.x/dist/addons/xaudio.js');
 
    code = code.replace('../../thirdparty/tailwindcss/playcdn.js', 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4');
 
 
    return (
        <>
            <iframe style={{width: '100%', height, border: 'solid 1px #DDD', borderRadius: '6px' }} src={'/xnew/' + name} ></iframe>
            <CodeBlock language='html'>{code}</CodeBlock>
        </>
    )
}