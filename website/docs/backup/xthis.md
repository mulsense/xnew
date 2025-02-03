---
sidebar_position: 10
---

# xthis
`xthis` get the `unit` in current scope.

## example
```js
xnew(() => {
  const unit1 = xthis;

  const unit2 = xnew(() => {
    const unit2 = xthis;

    // ...
  });  
});
```

## scope issues
In some callback functions, appropriate parent unit may not be set.  

:::note
In the following, appropriate parent is set.
the units are created as children of `unit1`.
```js
xnew(() => {
  const unit1 = xthis;

  const unit2 = xnew(Component);
  unit2.parent; // unit1

  unit1.on('click', () => {
    const unit3 = xnew(Component);
    unit3.parent; // unit1;
  });

  xnew.timer(() => {
    const unit4 = xnew(Component);
    unit4.parent; // unit1;
  }, 1000);


  // use callback functions except for unit method
  setTimeout(() => {
    const unit5 = xnew(unit1, Component); // parent unit is set intentionally
    unit5.parent; // unit1;
  }, 1000);

  window.addEventListener('click', () => {
    const unit6 = xnew(unit1, Component); // parent unit is set intentionally
    unit6.parent; // unit1
  });
});
```
:::

:::warning
In the following, appropriate parent is not(?) set.  
the units are not created as children of `unit1`.
```js
xnew(() => {
  const unit1 = xthis;

  // use callback functions except for unit method
  window.addEventListener('click', () => {
    const unit2 = xnew(Component); // parent unit is not set
    unit2.parent; // null
  });

  setTimeout(() => {
    const unit3 = xnew(Component); // parent unit is not set
    unit3.parent; // null
  }, 1000);



  const another = xnew(Component);
  another.on('click', () => {
    const unit4 = xnew(Component);
    unit4.parent; // another
  });
})
```
:::
