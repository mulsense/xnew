# xnew.promise

`xnew.promise` ties a standard Promise to the current component so its `.then()` / `.catch()` handlers run in the component's scope. If the component is destroyed before the Promise resolves, the pending handlers are dropped — no stale DOM writes, no crashes.

## Usage

```js
const wrappedPromise = xnew.promise(promise);
```

**Parameters:**
- `promise`: A standard Promise object or unit

**Returns:**
- A wrapped Promise that executes handlers within the current `xnew` scope

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
