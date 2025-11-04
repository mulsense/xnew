# xnew.context

`xnew.context` provides a way to share data across nested units through a hierarchical context system. Child units can access context values from their ancestors, and can override them locally without affecting parent values.

## Usage

### Set Context Value
```js
xnew.context(name, value);
```

### Get Context Value
```js
const value = xnew.context(name);
```

**Parameters:**
- `name`: String key for the context property
- `value`: Any value to store in the context (optional, used when setting)

**Returns:**
- When getting: The context value, or `undefined` if not found

## How It Works

- Context values are inherited from parent to child units
- Child units can override context values locally
- Overriding in a child doesn't affect the parent's value
- Context lookup searches up the unit hierarchy until a value is found

## Example

### Theme System

```js
function ThemedComponent(unit) {
  const theme = xnew.context('theme') || 'light';

  xnew.nest('<div>');
  unit.element.style.background = theme === 'dark' ? '#333' : '#fff';
  unit.element.style.color = theme === 'dark' ? '#fff' : '#333';
  unit.element.textContent = `Theme: ${theme}`;
}

// Set global theme
xnew((unit) => {
  xnew.context('theme', 'dark');

  xnew(ThemedComponent); // Uses dark theme
  xnew(ThemedComponent); // Uses dark theme

  // Override theme for specific section
  xnew((unit) => {
    xnew.context('theme', 'light');
    xnew(ThemedComponent); // Uses light theme
  });
});
```

### Nested Context Override

```js
xnew((unit) => {
  xnew.context('color', 'red');
  console.log(xnew.context('color')); // "red"

  xnew((unit) => {
    // Inherits parent's value
    console.log(xnew.context('color')); // "red"

    // Override locally
    xnew.context('color', 'blue');
    console.log(xnew.context('color')); // "blue"

    xnew((unit) => {
      // Inherits overridden value
      console.log(xnew.context('color')); // "blue"
    });
  });

  // Parent value unchanged
  console.log(xnew.context('color')); // "red"
});
```

## Use Cases

`xnew.context` is particularly useful for:

- **Theming**: Share color schemes, fonts, and styling configurations
- **Configuration**: Provide default settings that can be overridden
- **Authentication**: Pass user information and permissions down the tree
- **Localization**: Share language settings across components
- **API Configuration**: Share base URLs, headers, or authentication tokens
- **Feature Flags**: Enable/disable features based on context

:::tip
Use `xnew.context` to avoid prop drilling - passing data through many layers of components. Context values are automatically available to all descendant units.
:::