# xnew.promise

`xnew.promise` wraps a standard Promise so its `.then()` / `.catch()` handlers run inside the current xnew component scope. If the component is finalized before the Promise resolves, the handlers are silently discarded — no stale callbacks, no crashes.

## Usage

```js
const wrappedPromise = xnew.promise(promise);
```

**Parameters:**
- `promise`: A standard Promise object or unit

**Returns:**
- A wrapped Promise that executes handlers within the current `xnew` scope

## Why Use xnew.promise?

A plain `Promise` resolves asynchronously — by the time `.then()` runs, the component that started the request might already be gone. Without extra bookkeeping, that leads to stale DOM writes, missing elements, or subtle bugs.

`xnew.promise` ties the Promise to the component. When the unit is finalized, pending handlers are dropped automatically.

## Example

### Basic Usage

```js
xnew((unit) => {
  xnew.promise(new Promise((resolve, reject) => {
    xnew.timeout(() => resolve('Success!'), 1000);
  }))
  .then((result) => {
    console.log(result); // "Success!"
    // This handler runs within the current xnew scope
  })
  .catch((error) => {
    console.error(error);
    // This handler also runs within the current xnew scope
  });
});
```

:::tip
Use `xnew.promise` for general Promise handling. For HTTP requests specifically, use `xnew.fetch` which provides a more convenient API for fetching data.
:::
