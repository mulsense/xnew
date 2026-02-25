# xnew.transition

`xnew.transition` creates smooth animations by executing a callback function repeatedly over a specified duration. The callback receives a progress value that transitions from 0 to 1, which can be used to animate properties smoothly.

## Usage

```js
const transition = xnew.transition(callback, interval, easing);
```

**Parameters:**
- `callback({ value })`: Function called on each frame with progress value (0.0 to 1.0)
- `duration`: Animation duration interval in milliseconds (default: 0)
- `easing`: Easing function name (default: 'linear')

**Returns:**
- A transition object with:
  - `clear()`: Cancel the transition
  - `timeout(callback, interval)`: Chain another timeout
  - `transition(callback, interval, easing)`: Chain another transition

## Available Easing Functions

- `'linear'` - Constant speed
- `'ease'` - Slow start and end, fast middle
- `'ease-in'` - Slow start
- `'ease-out'` - Slow end
- `'ease-in-out'` - Slow start and end

## Example

### Fade In Animation

```js
xnew('<div>', (unit) => {
  unit.element.textContent = 'Fading in...';
  unit.element.style.opacity = '0';

  xnew.transition(({ value }) => {
    unit.element.style.opacity = value;
  }, 2000, 'ease-in');
});
```
### Canceling Transitions

```js
xnew('<div>', (unit) => {
  unit.element.textContent = 'Click to stop animation';

  const transition = xnew.transition(({ value }) => {
    unit.element.style.opacity = 1 - value;
  }, 5000, 'linear');

  unit.on('click', () => {
    transition.clear();
    unit.element.textContent = 'Animation stopped';
  });
});
```

## Automatic Cleanup

When a unit is finalized, all its transitions are automatically cleared:

```js
const unit = xnew((unit) => {
  xnew.transition(({ value }) => {
    console.log('Progress:', value);
  }, 5000, 'linear');
});

// Finalize after 2 seconds - transition automatically stops
xnew.timeout(() => {
  unit.finalize();
}, 2000);
```

:::tip
All transitions are automatically cleaned up when their parent unit is finalized. This prevents animations from continuing after a component is destroyed.
:::
