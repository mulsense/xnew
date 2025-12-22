# xnew.scope

`xnew.scope` is 

## Usage

```js
xnew.scope(callback);
```

**Parameters:**
- `callback`:

**Returns:**
- 

## Example


```js
function Timeout(unit) {
  xnew.nest('<div>');

  setTimeout(xnew.scope(() => {
    console.log('timeout');
  }), 1000);
}

```
