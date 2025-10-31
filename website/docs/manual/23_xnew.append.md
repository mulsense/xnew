# xnew.append

`xnew.append` creates new units as children of specified units or all units using a specific component.

## Usage

### Append to a Specific Unit

```js
const unit = xnew(Component);
xnew.append(unit, ChildComponent); // Adds ChildComponent as a child of unit
```

### Append to All Units Using a Component

```js
xnew.append(Component, ChildComponent); // Adds ChildComponent to all units using Component
```

## Examples

### Appending to a Specific Unit

```js
function ParentComponent(self) {
  self.count = 0;
}

function ChildComponent(self) {
  console.log('Child created');
}

const parent = xnew(ParentComponent);

// Add a child to the specific unit
xnew.append(parent, ChildComponent);
// Output: "Child created"
```

### Appending to All Units of a Component Type

```js
function Container(self) {
  self.name = 'Container';
}

function Item(self) {
  console.log('Item added to', self.parent.name);
}

// Create multiple containers
const container1 = xnew(Container);
const container2 = xnew(Container);

// Add Item to all units using Container component
xnew.append(Container, Item);
// Output: "Item added to Container" (twice)
```

## Use Cases

`xnew.append` is particularly useful when:

- **Dynamically adding components**: Adding new functionality to existing units after creation
- **Bulk operations**: Adding the same child component to multiple parent units at once
- **Event-driven architecture**: Responding to events by attaching new components to existing units

:::note
The newly created child units will be automatically cleaned up when their parent units are finalized.
:::
