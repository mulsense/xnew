# xnew.promise

`xnew.promise` wraps a Promise to ensure its handlers (`then`, `catch`) execute within the current `xnew` scope. This provides automatic cleanup and proper context management for asynchronous operations.

## Usage

```js
const wrappedPromise = xnew.promise(promise);
```

**Parameters:**
- `promise`: A standard Promise object or unit

**Returns:**
- A wrapped Promise that executes handlers within the current `xnew` scope

## Why Use xnew.promise?

Standard Promises execute their handlers outside the `xnew` scope, which means:
- No automatic cleanup when the unit is finalized
- Cannot access `xnew` context functions
- May cause memory leaks if not managed carefully

`xnew.promise` solves these issues by ensuring handlers run within the `xnew` scope.

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
