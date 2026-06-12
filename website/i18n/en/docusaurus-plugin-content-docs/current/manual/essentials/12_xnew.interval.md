# xnew.interval

`xnew.interval` is `setInterval` with automatic cleanup. The interval stops on its own when the owning unit is finalized — no need to stash the ID and call `clearInterval` manually.

## Usage

```js
const timer = xnew.interval(callback, duration, iterations);
```

**Parameters:**
- `callback`: Function to execute at each interval
- `duration`: Time in milliseconds between executions
- `iterations` *(optional)*: number of times to run. `0` (default) means unlimited

**Returns:**
- A timer object with a `clear()` method to stop it

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
