# xnew.scope

`xnew.scope` captures the current component context and returns a wrapper that restores it when called. Use this when you need to call xnew APIs inside a raw `setTimeout`, `setInterval`, or a native `addEventListener` — places where the xnew scope would otherwise be lost.

In most cases you won't need this: `xnew.timeout`, `xnew.interval`, and `unit.on` all preserve scope automatically. `xnew.scope` is the escape hatch for when you're using browser APIs directly.

## Basic Usage

```js
xnew.scope(callback);
```

**Parameters:**
- `callback` - Function to execute with preserved scope

**Returns:**
- Wrapped function with preserved scope

## Why It's Needed

In asynchronous operations like `setTimeout` or event listeners, the xnew component context is normally lost. `xnew.scope` ensures the correct component scope is maintained within these async callbacks.

## Examples

### Preserving Scope in setTimeout

```js
function Timer(unit) {
  xnew.nest('<div>', 'Timer Component');

  setTimeout(xnew.scope(() => {
    // The Timer component scope is preserved in this callback
    console.log('Timeout executed');
  }), 1000);
}
```

### Using with Event Listeners

```js
function Button(unit) {
  const el = xnew.nest('<button>', 'Click me');

  el.addEventListener('click', xnew.scope(() => {
    // The Button component scope is preserved on click
    console.log('Button clicked');
  }));
}
```

## Notes

- Always wrap callbacks with `xnew.scope` when using xnew APIs like `xnew.on` inside async operations or event handlers
- `xnew.scope` is unnecessary if you're already in the correct scope
