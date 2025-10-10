# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Settings

### Auto-approve
- `Read`: Auto-approve reading all project files
- `Glob`: Auto-approve file pattern searches
- `Grep`: Auto-approve content searches
- `Bash`: Auto-approve build and test commands (`npm run build`, `npm run dev`, `npm test`, `npm run build:addons`, `npm run dev:addons`, `npx jest`, `npx rollup`)

### Skip Permissions
- `Edit`: Skip edit permissions for all source files
- `Write`: Skip write permissions for new files

## Project Overview

`xnew` is a JavaScript library for component-oriented programming, designed for applications with dynamic scenes and games. It provides a flexible architecture based on `Unit` components that can be composed hierarchically.

## Build & Development Commands

### Core Library
- **Build**: `npm run build` - Builds the main library using Rollup
- **Watch mode**: `npm run dev` - Builds and watches for changes
- **Test**: `npm test` - Runs all tests with Jest

### Addons
- **Build addons**: `npm run build:addons` - Builds all addon packages (xpixi, xthree, xmatter, xaudio, xutil)
- **Watch addons**: `npm run dev:addons` - Watches and rebuilds addons on changes

### Testing
- **Run all tests**: `npm test`
- **Run specific test**: `npx jest test/[filename].test.ts`
- Tests use Jest with jsdom environment and ts-jest preset

## Architecture

### Core Structure

The library is built around the `Unit` class (src/core/unit.ts), which is the fundamental building block:

- **Unit**: A component that manages lifecycle (invoked → initialized → started ↔ stopped → finalized), event handling, and DOM element relationships
- **UnitScope**: Manages execution context and allows context values to be shared up/down the component tree
- **UnitComponent**: Tracks component-to-unit relationships for finding units by component
- **UnitEvent**: Manages event listeners with automatic cleanup and scope preservation
- **UnitPromise**: Wraps promises with scope-aware callbacks

### Main API (src/core/xnew.ts)

The `xnew()` function creates Units with flexible argument patterns:
- `xnew(component)` - Create with component at current scope
- `xnew(parent, component)` - Create as child of parent
- `xnew(element, component)` - Attach component to DOM element
- `xnew(parent, '<div>', component)` - Create new DOM element

Key methods:
- `xnew.nest(html)` - Creates nested HTML elements inside component (only during invocation)
- `xnew.extend(component)` - Adds component functionality to current unit (only during invocation)
- `xnew.context(key, value?)` - Sets/gets context values that propagate through component tree
- `xnew.find(component)` - Finds all units using a specific component
- `xnew.promise(promise)` - Wraps promises with scope-aware callbacks
- `xnew.timeout/interval(callback, delay)` - Scope-aware timers
- `xnew.transition(callback, interval, easing)` - Animation transitions with easing

### Addon System

Addons extend xnew with integration for external libraries:
- **xpixi** (src/addons/xpixi.ts): PixiJS renderer integration
- **xthree** (src/addons/xthree.ts): Three.js 3D renderer integration
- **xmatter** (src/addons/xmatter.ts): Matter.js physics integration
- **xaudio** (src/addons/xaudio.ts): Web Audio API wrapper
- **xutil** (src/addons/xutil.ts): Utility functions

Addons use the context system to share renderer/scene state. They follow a pattern:
1. `initialize()` - Sets up the root context (renderer, scene, etc.)
2. `nest()` - Adds objects to the scene hierarchy using context
3. Getters for accessing shared state (renderer, scene, camera)

### Build System

Two separate build configurations:
- **rollup.config.js**: Builds core library (xnew.js/xnew.mjs) from src/index.ts, excluding addons
- **rollup.addons.config.js**: Builds each addon separately with external dependencies (xnew, pixi.js, three, matter-js)

Both configs copy output to `examples/dist/` for use in example HTML files.

### TypeScript Configuration

- **tsconfig.json**: Main library config, excludes addons
- **tsconfig.addons.json**: Separate config for building addons

## Project Structure

- `src/core/` - Core library (xnew.ts, unit.ts, time.ts, map.ts)
- `src/basics/` - Built-in components (Screen, UserEvent, ResizeEvent, Modal, WorkSpace, etc.)
- `src/addons/` - Optional integrations with external libraries
- `examples/` - HTML examples demonstrating usage
- `test/` - Jest unit tests
- `dist/` - Build output (not in repo)
- `website/` - Documentation site (Docusaurus)

## Component Lifecycle

Units go through these states:
1. **invoked** - Component function is being called, `xnew.nest()` and `xnew.extend()` are available
2. **initialized** - Component setup complete
3. **started** - `start` event fired, unit is running
4. **stopped** - `stop` event fired, unit paused
5. **finalized** - Cleanup complete, unit destroyed

Components define behavior by returning an object with methods/properties from their function.

## Key Patterns

- **Scope preservation**: All callbacks (events, timers, promises) execute in their original scope using `UnitScope.snapshot()` and `UnitScope.execute()`
- **Context propagation**: Use `xnew.context(key, value)` to store values that child components can access with `xnew.context(key)`
- **Automatic cleanup**: Event listeners and child units are automatically cleaned up on finalize
- **Component finding**: `xnew.find(Component)` returns all active units using that component function
