# xnew.extend

`xnew.extend` adds functionality from another component to the current unit. This allows you to compose components by mixing multiple behaviors together.

## Syntax

```js
xnew.extend(component, props);
```

- **component**: A component function to extend with
- **props**: Additional properties passed to the component function

## How It Works

When you call `xnew.extend(Component)`, it:
1. Executes the component function immediately
2. Adds the returned properties/methods to the current unit
3. Registers any event handlers (like `update`, `start`, `finalize`)
4. If a property already exists, the **later definition overwrites** the earlier one

## Basic Example

```js
// Define a reusable component
function Logger(unit) {

  return {
    log(message) {
      console.log('Logger:', message);
    },
  };
}

// Use the component
const unit = xnew((unit) => {
  xnew.extend(Logger); // Add Logger functionality

  unit.log('Hello!'); // Can use the log method immediately
});

// Result: Logger: Hello!
```

## Overriding Properties

When multiple components define the same property, the **last one wins**:

```js
function Base(unit) {

  return {
    greet() {
      console.log('base greet');
    },
  };
}

const unit = xnew((unit) => {
  xnew.extend(Base); // Add Base functionality first

  return {
    greet() {
      console.log('derived greet'); // This overwrites Base.greet
    },
  };
});

unit.greet(); // Output: "derived greet" (overridden)
```

## Multiple Event Handlers

Event handlers from different components are **all executed**, not overridden:

```js
function Base(unit) {
  unit.on('start', () => {
    console.log('base start');
  });

}

const unit = xnew((unit) => {
  xnew.extend(Base);

  unit.on('start', () => {
    console.log('derived start');
  });

});

// When update event fires:
// Output:
//   "base start"      (from Base component)
//   "derived start"   (from main component)
```

## Passing Arguments

You can pass properties to the extended component:

```js
function Counter(unit, { initialValue = 0 }) {
  let count = initialValue;

  return {
    increment() {
      count++;
      console.log('Count:', count);
    },
    getCount() {
      return count;
    },
  };
}

const unit = xnew((unit) => {
  xnew.extend(Counter, { initialValue: 10 }); // Start counter at 10

  unit.increment(); // Count: 11
  console.log(unit.getCount()); // 11
});
```

## Use Cases

`xnew.extend` is useful for:
- **Mixins**: Adding reusable behaviors (logging, animation, input handling)
- **Component composition**: Combining multiple features into one unit
- **Code reuse**: Sharing common functionality across different components

:::note
`xnew.extend` can only be called during component initialization (inside the component function). You cannot call it after the unit is created.
:::

