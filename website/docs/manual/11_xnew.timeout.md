# xnew.timeout

`xnew.timeout` creates a delayed execution timer that runs a callback function after a specified delay. Unlike regular `setTimeout`, callbacks execute within the current `xnew` scope, providing automatic cleanup and context preservation.

## Usage

```js
const timeout = xnew.timeout(callback, delay);
```

**Parameters:**
- `callback`: Function to execute after the delay
- `delay`: Time in milliseconds before execution

**Returns:**
- A timeout object with a `clear()` method to cancel the timeout

## Example

### Basic Delayed Execution

```js
xnew('<div>', (unit) => {
  unit.element.textContent = 'Click me!';

  unit.on('click', () => {
    unit.element.textContent = 'Clicked! Resetting in 2 seconds...';

    xnew.timeout(() => {
      unit.element.textContent = 'Click me!';
    }, 2000);
  });
});
```

### Canceling a Timeout

```js
xnew('<button>', (unit) => {
  unit.element.textContent = 'Start countdown';

  let timeout;

  unit.on('click', () => {
    // Cancel previous timeout if exists
    if (timeout) {
      timeout.clear();
    }

    unit.element.textContent = 'Countdown started...';

    timeout = xnew.timeout(() => {
      unit.element.textContent = 'Done!';
    }, 3000);
  });
});
```

## Automatic Cleanup

When a unit is finalized, all its timeouts are automatically cleared:

```js
const unit = xnew((unit) => {
  xnew.timeout(() => {
    console.log('This will never execute');
  }, 5000);

  // Finalize after 1 second
  xnew.timeout(() => {
    unit.finalize(); // Automatically clears the 5-second timeout
  }, 1000);
});
```

:::tip
All timeouts are automatically cleaned up when their parent unit is finalized, preventing memory leaks and ensuring callbacks don't execute after component destruction.
:::
