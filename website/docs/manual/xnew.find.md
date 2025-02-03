---
sidebar_position: 8
---

# xnew.find
`xnew.find` find units using a component function.

```js
xnew.find(Component); // component function
```

## example
```js

const unit1 = xnew(A);
const unit2 = xnew(A);

function Component(self) {
}

xnew.find(Component); // [unit1, unit2]        

```
