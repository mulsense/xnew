# xnew.promise

`xnew.promise` ties a Promise to the current component so its `.then()` / `.catch()` handlers run in the component's scope. If the component is destroyed before the Promise resolves, the pending handlers are dropped — no stale DOM writes, no crashes.

## Usage

```js
const promise = xnew.promise(source);
```

**Parameters:**
- `source`: a standard Promise, or a unit (aggregates all promises registered on that unit)

**Returns:**
- A wrapped Promise that runs its handlers within the current `xnew` scope

## Examples

### Wrapping a Promise

```js
xnew((unit) => {
  xnew.promise(fetch('/api/data'))
    .then((res) => unit.element.textContent = 'loaded')
    .catch((err) => unit.element.textContent = 'error');
});
```

### Deferred (resolve manually)

Called with no argument, it returns `{ resolve, reject }` so you can settle it whenever you like.

```js
function Loader(unit) {
  const deferred = xnew.promise();

  unit.on('click', () => deferred.resolve('done'));

  return { ready: () => unit.promise };
}
```

### Aggregating on a unit

Promises registered on a unit can be awaited together via `unit.promise`.

```js
const unit = xnew((u) => {
  xnew.promise(loadImage());
  xnew.promise(loadSound());
});

unit.promise.then(() => console.log('all assets ready'));
```
