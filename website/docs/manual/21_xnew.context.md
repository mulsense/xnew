# xnew.context

`xnew.context` provides a way to share data across nested units through a hierarchical context system. Child units can access context values from their ancestors, and can override them locally without affecting parent values.

## Usage

### Get Context Value
```js
const value = xnew.context(component);
```

**Parameters:**
- `component`: Component function for the context property

**Returns:**
- When getting: The context value, or `undefined` if not found

## How It Works

- Context values are inherited from parent to child units
- Child units can override context values locally
- Overriding in a child doesn't affect the parent's value
- Context lookup searches up the unit hierarchy until a value is found

## Example

### Data Share

```js
xnew((unit) => {
  xnew(Data, { value: 1 });
  xnew(Child);
});

function Data(unit, { value }) {
  return {
    get value() { return value; }
  }
}

function Child(unit) {
  const data = xnew.context(Data);
  
  // data.value
}

```

### Nested Context Override

```js
xnew((unit) => {
  xnew(Data, { value: 1 });
  xnew(Child1);
});

function Data(unit, { value }) {
  return {
    get value() { return value; }
  }
}

function Child1(unit) {
  const data = xnew.context(Data);
  // data.value == 1
  
  xnew(Data, { value: 2 });
  xnew(Child2);
}

function Child2(unit) {
  const data = xnew.context(Data);
  
  // data.value == 2
}
```

## Use Cases

`xnew.context` is particularly useful for:

- **Data**: Data share

:::tip
Use `xnew.context` to avoid prop drilling - passing data through many layers of components. Context values are automatically available to all descendant units.
:::