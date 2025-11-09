# xnew.interval

`xnew.interval` creates a repeating timer that executes a callback function at regular intervals. Unlike regular `setInterval`, callbacks execute within the current `xnew` scope, providing automatic cleanup and context preservation.

## Usage

```js
const interval = xnew.interval(callback, delay);
```

**Parameters:**
- `callback`: Function to execute at each interval
- `delay`: Time in milliseconds between executions

**Returns:**
- An interval object with a `clear()` method to stop the interval

## Example

### Basic Counter

```js
xnew('<div>', (unit) => {
  let count = 0;
  unit.element.textContent = count;

  xnew.interval(() => {
    count++;
    unit.element.textContent = count;
  }, 1000); // Update every second
});
```

### Canceling an Interval

```js
xnew('<div>', (unit) => {
  let count = 0;
  unit.element.textContent = 'Starting countdown...';

  const interval = xnew.interval(() => {
    count++;
    unit.element.textContent = `Count: ${count}`;

    // Stop after 10 iterations
    if (count >= 10) {
      interval.clear();
      unit.element.textContent = 'Countdown complete!';
    }
  }, 500);
});
```

## Automatic Cleanup

When a unit is finalized, all its intervals are automatically cleared:

```js
const unit = xnew((unit) => {
  xnew.interval(() => {
    console.log('This will stop when unit is finalized');
  }, 1000);
});

// Finalize after 5 seconds - interval automatically stops
xnew.timeout(() => {
  unit.finalize();
}, 5000);
```

:::tip
All intervals are automatically cleaned up when their parent unit is finalized, preventing memory leaks and ensuring proper resource management.
:::
