# xnew.find

`xnew.find` retrieves all active units that were created with a specific component function. This is useful for managing, updating, or coordinating multiple instances of the same component type.

## Usage

```js
const units = xnew.find(Component);
```

**Parameters:**
- `Component`: The component function to search for

**Returns:**
- An array of all units created with the specified component function

## Example

### Basic Usage

```js
function Counter(unit) {
  xnew.nest('<div>');
  let count = 0;
  unit.element.textContent = count;

  return {
    increment() {
      count++;
      unit.element.textContent = count;
    }
  };
}

// Create multiple counters
const counter1 = xnew(Counter);
const counter2 = xnew(Counter);
const counter3 = xnew(Counter);

// Find all Counter units
const allCounters = xnew.find(Counter);
console.log(allCounters.length); // 3

// Increment all counters at once
allCounters.forEach(counter => counter.increment());
```

### Managing Multiple Instances

```js
function Player(unit, { name }) {
  xnew.nest('<div>');
  unit.element.textContent = `Player: ${name}`;

  let score = 0;

  return {
    addScore(points) {
      score += points;
      unit.element.textContent = `Player: ${name} - Score: ${score}`;
    },
    getScore() {
      return score;
    }
  };
}

// Create players
xnew(Player, { name: 'Alice' });
xnew(Player, { name: 'Bob' });
xnew(Player, { name: 'Charlie' });

// Find all players
const players = xnew.find(Player);

// Add points to all players
players.forEach(player => player.addScore(10));

// Calculate total score
const totalScore = players.reduce((sum, player) => sum + player.getScore(), 0);
console.log('Total score:', totalScore); // 30
```

## Use Cases

`xnew.find` is particularly useful for:

- **Coordinating multiple instances**: Update or control all instances of a component type
- **State synchronization**: Keep multiple components in sync
- **Broadcasting**: Send messages or events to all instances
- **Cleanup operations**: Find and remove all instances of a component
- **Statistics and monitoring**: Count or analyze active components
- **Filtering and selection**: Find specific instances based on criteria

:::tip
`xnew.find` only returns currently active units. If a unit has been finalized, it will not appear in the results.
:::
