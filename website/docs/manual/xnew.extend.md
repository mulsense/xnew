---
sidebar_position: 3
---

# xnew.extend
It extend the component function using another one.

```js
xnew.extend(component, ...args);
```
## example

```js
// base component function
function Base(self) {
  return {
    update() {
      console.log('base update');
    },
    hoge() {
      console.log('base hoge');
    },
  }
}
```
```js
const unit = xnew((self) => {
  xnew.extend(Base);

  return {
    update() {
      console.log('derived update');
    },
    // error
    // hoge() {
    //   console.log('derived hoge');
    // },
  }
});

unit.hoge();
// base hoge

// base update
// derived update

// ... update loop

```
:::tip
If system properties (`promise`, `start`, `update`, `stop`, `finalize`) defined in both component functions,
  the properties are automatically merged.
:::
