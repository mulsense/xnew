---
sidebar_position: 501
---

# xaudio

`xaudio` is an addon for `xnew` that provides audio-related features.

## Setup
### Via CDN
Include the following scripts in your HTML file:
```html
<script src="https://unpkg.com/xnew@3.0.x/dist/xnew.js"></script>
<script src="https://unpkg.com/xnew@3.0.x/dist/addons/xaudio.js"></script>
```

### Via CDN (ESM)
Use the ES module version with an import map:
```html
<script type="importmap">
{
  "imports": {
    "xnew": "https://unpkg.com/xnew@3.0.x/dist/xnew.mjs",
    "xnew/addons/xaudio": "https://unpkg.com/xnew@3.0.x/dist/addons/xaudio.mjs"
  }
}
</script>

<script type="module">
import xnew from 'xnew';
import xaudio from 'xnew/addons/xaudio';

// Your code here
</script>
```

### Via npm
Install `xnew` using npm:
```bash
npm install xnew@3.0.x
```

Then import `xnew` and `xaudio` in your JavaScript file:
```js
import xnew from 'xnew';
import xaudio from 'xnew/addons/xaudio';
```

## synthesizer

<iframe style={{width:'100%',height:'900px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/6_others/602_synthesizer/index.html" ></iframe>
