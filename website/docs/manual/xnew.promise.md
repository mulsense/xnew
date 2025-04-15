---
sidebar_position: 11
---

# xnew.promise
`xnew.promise` find units using a component function.
`update` proccess will not start until this promise is resolved.
```js
xnew.promise(promise);
```

## example
```js
xnew((self) => {
  xnew.promise(new Promise((resolve, reject) => {
    xnew.timer(() => resolve(1), 1000);
  }))
  .then((result) => {
    console.log(result); // 1
  });
});

```
 