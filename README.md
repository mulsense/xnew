# xnew
`xnew` is a JavaScript library for component-oriented programming.  
It allows you to structure your code as a collection of simple, reusable components.

[**Visit the xnew website**](https://mulsense.github.io/xnew)

<div>
    <img src="website/static/img/introduction.svg" width="500" alt="xnew introduction" />
</div>

## Setup

### Via CDN
Include the following script in your HTML file:
```html
<script src="https://unpkg.com/xnew@2.5.x/dist/xnew.js"></script>
```

### Via CDN (ESM)
Use the ES module version with an import map:
```html
<script type="importmap">
{
    "imports": {
        "xnew": "https://unpkg.com/xnew@2.5.x/dist/xnew.module.js"
    }
}
</script>

<script type="module">
import xnew from 'xnew';

// Your code here
</script>
```

### Via npm
Install `xnew` using npm:
```bash
npm install xnew@2.5.x
```

Then import it in your JavaScript file:
```js
import xnew from 'xnew';
```
