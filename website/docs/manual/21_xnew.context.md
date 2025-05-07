# xnew.context

The `xnew.context` function allows you to set and retrieve context properties that can be accessed across nested units.

## Usage

### Setting a Context Property
```js
xnew.context(name, value);
```

### Getting a Context Property
```js
xnew.context(name);
```

## Example

The following example demonstrates how `xnew.context` works across nested units:

```js
xnew((self) => {
  // Set a context property
  xnew.context('hoge', 1);
  console.log(xnew.context('hoge')); // Output: 1

  xnew((self) => {
    // Retrieve the context property from the parent unit
    console.log(xnew.context('hoge')); // Output: 1

    xnew((self) => {
      // Override the context property in the current unit
      xnew.context('hoge', 2);
      console.log(xnew.context('hoge')); // Output: 2

      xnew(() => {
        // Retrieve the overridden context property
        console.log(xnew.context('hoge')); // Output: 2
      });
    });

    // Context property reverts to the parent unit's value
    console.log(xnew.context('hoge')); // Output: 1
  });
});
```