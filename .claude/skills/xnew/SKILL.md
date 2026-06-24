---
name: xnew
description: Coding rules and conventions for writing or modifying code that uses the xnew library — component functions, the unit lifecycle, DOM nesting/events, custom events, scope/timers, context/find, scene navigation, and sync (multiplayer). Use this BEFORE writing or changing any xnew code in src/, examples/, addons/, or tests/. Also update it whenever an xnew mistake is found so the same mistake does not recur.
---

# xnew coding

This skill carries the **coding rules for the xnew library** so that any xnew
implementation starts from the same conventions and known pitfalls.

## How to use it

1. **Before** writing or modifying any code that uses xnew (`xnew()`,
   `xnew.extend`, `unit.on`, `sync.*`, a component function `(unit, props) => …`,
   an addon, or a `basics/` component), **read [coding.md](./coding.md)** in full.
   It is short and prevents the recurring mistakes this codebase has already hit.
2. Follow those rules while implementing. When a rule and the existing code
   disagree, prefer the existing neighboring code and flag the discrepancy.

## Keep it alive (important)

`coding.md` is a **living document**. Whenever you (or the user) discover that an
xnew mistake was made — a bug, a wrong assumption about the API, a review
comment, a test that caught something, a footgun — **add or sharpen a rule in
the "Pitfalls / lessons learned" section of [coding.md](./coding.md)** so the
same mistake cannot happen again.

When adding a lesson:

- State the rule as an imperative ("Do X", "Never Y"), not a story.
- Add one line of *why* (the failure it prevents) and, if useful, a tiny snippet.
- Put it under the right topic heading; only use "Pitfalls" for cross-cutting ones.
- Keep it terse — this file is read before every xnew task, so signal over prose.

The companion file [.claude/CLAUDE.md](../../CLAUDE.md) (one level up) holds the
project's tech stack, directory layout, and the `src/` file-header convention —
this skill does not repeat those.
