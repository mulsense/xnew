# xnew.fetch

`xnew.fetch` is a wrapper around the standard `fetch` API that executes within the current `xnew` scope. It provides automatic cleanup, proper context management, and seamless integration with other `xnew` functions.

## Usage

```js
xnew.fetch(url, options);
```

**Parameters:**
- `url`: The URL to fetch from
- `options`: Optional fetch options (same as standard fetch API)

**Returns:**
- A Promise that resolves to the Response object (automatically wrapped in xnew scope)

## Why Use xnew.fetch?

Standard `fetch` executes outside the `xnew` scope, which means:
- No automatic cleanup when the unit is finalized
- Cannot use `xnew` context functions in handlers
- May cause memory leaks if not managed carefully

`xnew.fetch` solves these issues by ensuring the entire fetch chain runs within the `xnew` scope.

## Example

### Basic Data Fetching

```js
function UserProfile(unit, { userId }) {
  xnew.nest('<div>');
  unit.element.textContent = 'Loading...';

  xnew.fetch(`/api/users/${userId}`)
    .then(response => response.json())
    .then(user => {
      unit.element.textContent = '';

      xnew('<h2>', user.name);
      xnew('<p>', `Email: ${user.email}`);
    })
    .catch(error => {
      unit.element.textContent = `Error: ${error.message}`;
      unit.element.style.color = 'red';
    });
}

xnew(UserProfile, { userId: 123 });
```

:::tip
Always use `xnew.fetch` instead of standard `fetch` when working within `xnew` components to ensure proper scope management and automatic cleanup.
:::
