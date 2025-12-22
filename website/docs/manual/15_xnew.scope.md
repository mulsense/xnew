# xnew.scope

`xnew.scope` preserves the current component scope for use within asynchronous operations and event handlers.

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
  xnew.nest('<div>Timer Component</div>');

  setTimeout(xnew.scope(() => {
    // The Timer component scope is preserved in this callback
    console.log('Timeout executed');
  }), 1000);
}
```

### Using with Event Listeners

```js
function Button(unit) {
  const el = xnew.nest('<button>Click me</button>');

  el.addEventListener('click', xnew.scope(() => {
    // The Button component scope is preserved on click
    console.log('Button clicked');
  }));
}
```

## Notes

- Always wrap callbacks with `xnew.scope` when using xnew APIs like `xnew.on` inside async operations or event handlers
- `xnew.scope` is unnecessary if you're already in the correct scope
