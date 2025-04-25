---
sidebar_position: 501
---

# xaudio

## setup
### via cdn
```html
<script src="https://unpkg.com/xnew@2.5.x/dist/xnew.js"></script>
<script src="https://unpkg.com/xnew@2.5.x/dist/addons/xaudio.js"></script>
```

### via cdn (ESM)
```html
<script type="importmap">
{
  "imports": {
    "xnew": "https://unpkg.com/xnew@2.5.x/dist/xnew.module.js",
    "xnew/addons/xaudio": "https://unpkg.com/xnew@2.5.x/dist/addons/xaudio.module.js"
  }
}
</script>

<script type="module">
import xnew from 'xnew'
import xaudio from 'xnew/addons/xaudio'

// ...
</script>
```

### via npm
```bash
npm install xnew@2.5.x
```
```js
import xnew from 'xnew'
import xaudio from 'xnew/addons/xaudio'
```

## synthesizer

<iframe style={{width:'100%',height:'900px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/501_synthesizer/index.html" ></iframe>
