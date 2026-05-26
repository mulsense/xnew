# xnew.context

`xnew.context` lets descendant components read shared data from an ancestor without passing it through every layer. It's the xnew answer to prop-drilling.

Set up a "provider" component that holds state, create it once near the root, and any descendant can retrieve it by name — even deeply nested ones.

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

- **Theme / config** — a single `Theme` component at the root, consumed anywhere below
- **Game state** — score, level, or player data shared across the scene tree
- **Scene management** — passing a `Flow` controller down to child scenes without explicit props
- **Dependency injection** — services like audio or input that many components need

:::tip
`xnew.context` looks up the unit hierarchy until it finds a matching provider. A child can create its own provider with the same component to shadow the parent's value locally, without affecting any other branch.
:::