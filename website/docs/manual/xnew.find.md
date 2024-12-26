---
sidebar_position: 8
---

# xnew.find
`xnew.find` find xnodes using a component function.

```js
xnew.find(Component); // component function
```

## example
```js

const xnode1 = xnew(A);
const xnode2 = xnew(A);

function Component() {
}

xnew.find(Component); // [xnode1, xnode2]        

```
