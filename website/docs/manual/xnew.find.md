---
sidebar_position: 9
---

# xnew.find
`xnew.find` find units using a component function.

```js
xnew.find(Component); // component function
```

## example
```js
const unit1 = xnew(Component);
const unit2 = xnew(Component);

xnew.find(Component); // [unit1, unit2]

function Component(self) {
}

```
