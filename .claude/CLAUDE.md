# xnew

A JavaScript / TypeScript library for component-oriented programming.
Well-suited for applications with dynamic scenes and game development.

## Concept

xnew is a **component-oriented** library: an application is built by composing
small, self-contained components, each bundling its own DOM, lifecycle, and
events into a single unit that can be created and disposed as one.

## Tech Stack

- Language: TypeScript 5
- Bundler: Rollup 3 (emits ESM / CJS / d.ts)
- Testing: Jest 29 + jest-environment-jsdom + ts-jest
- Transpiler: Babel (@babel/preset-env)

## Addons

Integrations for games and interactive apps.

- `addons/xpixi` — PixiJS 8
- `addons/xthree` — Three.js
- `addons/xmatter` — matter-js (2D physics)
- `addons/xrapier2d` — Rapier 2D
- `addons/xrapier3d` — Rapier 3D

## Directory Layout

- `src/core/` — `xnew` core, `unit`, event, time, map
- `src/basics/` — built-in parts: Scene / Screen / Panel / Controller / SVG / Transition / Volume
- `src/addons/` — third-party library integrations
- `src/utils/` — image / audio utilities
- `examples/` — runnable samples
- `website/` — Docusaurus documentation site
- `test/` — Jest tests

## Scripts

- `npm test` — run Jest
- `npm run build` — build with Rollup
- `npm run dev` — Rollup in watch mode
