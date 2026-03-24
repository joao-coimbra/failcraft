<div align="center">

<br />

# Failcraft

### Functional error handling for TypeScript.

`Either`-based error handling with full type inference, chainable transforms, and async support — no exceptions needed.

<br />

[![npm version](https://img.shields.io/npm/v/failcraft?style=for-the-badge&logo=npm&color=CB3837&logoColor=white)](https://www.npmjs.com/package/failcraft)
[![license](https://img.shields.io/badge/license-MIT-22C55E?style=for-the-badge)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![bun](https://img.shields.io/badge/Bun-ready-F9F1E1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)

<br />

[Install](#install) · [Either](#either) · [Chaining](#chaining) · [Async](#async) · [Try helpers](#try-helpers) · [API](#api)

<br />

</div>

---

## Install

```bash
bun add failcraft
# or
npm install failcraft
```

---

## Either

An `Either<L, R>` holds either a `Left` (error) or a `Right` (success). Use `left()` and `right()` to construct them:

```ts
import { left, right } from 'failcraft'

function divide(a: number, b: number) {
  if (b === 0) return left("division by zero")
  return right(a / b)
}

const result = divide(10, 2) // Either<string, number>

if (result.isRight()) {
  console.log(result.value) // 5
}

// Aliases for domain-friendly code
result.isSuccess() // same as isRight()
result.isError()   // same as isLeft()
```

---

## Chaining

Transform and chain computations without breaking out of the happy path:

```ts
const result = divide(10, 2)
  .transform(n => n * 100)        // maps the right value
  .andThen(n => divide(n, 4))     // chains another Either-returning fn
  .orDefault(0)                   // unwraps or falls back

// Pattern match exhaustively
divide(10, 0).match({
  left: (err) => `Error: ${err}`,
  right: (val) => `Result: ${val}`,
})

// Side-effect tap (returns this, keeps chain alive)
divide(10, 2)
  .on({ right: (val) => console.log("got", val) })
  .transform(n => n * 2)
```

---

## Async

`AsyncEither<L, R>` is a promise-based wrapper with the same chainable API:

```ts
import { right } from 'failcraft'

right(1)
  .transformAsync(async (n) => fetchUser(n))    // Either → AsyncEither
  .andThenAsync(async (user) => saveUser(user)) // async chain
  .transform((user) => user.name)               // sync step mid-chain
  .match({
    left: (err) => `Error: ${err}`,
    right: (name) => `Saved: ${name}`,
  })
  // returns Promise<string>
```

---

## Try helpers

Wrap functions that may throw without writing try/catch yourself:

```ts
import { trySync, tryAsync } from 'failcraft'

// Synchronous
const parsed = trySync(() => JSON.parse(rawJson))
// Either<unknown, unknown>

// Async
const data = tryAsync(() => fetch("/api").then(r => r.json()))
// AsyncEither<unknown, unknown>

data
  .transform((d) => d.items)
  .match({
    left: (err) => console.error(err),
    right: (items) => console.log(items),
  })
```

---

## API

### `left(value)` / `right(value)`

Constructors for `Either<L, R>`.

### `Either<L, R>`

| Method | Description |
|---|---|
| `.isLeft()` / `.isRight()` | Narrow the type to `Left` or `Right` |
| `.isError()` / `.isSuccess()` | Aliases for `.isLeft()` / `.isRight()` |
| `.transform(fn)` | Map the right value; pass left through |
| `.andThen(fn)` | Chain an `Either`-returning fn; short-circuits on left |
| `.transformAsync(fn)` | Like `transform`, but `fn` returns `Promise` → `AsyncEither` |
| `.andThenAsync(fn)` | Like `andThen`, but `fn` returns `Promise<Either>` → `AsyncEither` |
| `.orDefault(value)` | Unwrap right or return fallback |
| `.getOrThrow()` | Unwrap right or throw the left value |
| `.getOrThrowWith(fn)` | Unwrap right or throw `fn(leftValue)` |
| `.on(cases)` | Side-effect tap; returns `this` |
| `.match(cases)` | Exhaustive pattern match; returns `T` |

### `AsyncEither<L, R>`

Same interface as `Either` but every method returns `AsyncEither` or `Promise`. Extra method:

| Method | Description |
|---|---|
| `.toPromise()` | Returns the underlying `Promise<Either<L, R>>` |

### `trySync(fn)` / `tryAsync(fn)`

Wrap a possibly-throwing function. Returns `Either` or `AsyncEither` respectively.

---

## Development

Requirements: **Bun >= 1.0**

```bash
bun install          # install dependencies
bun test             # run unit tests
bun x ultracite fix  # lint + format
```

---

<div align="center">

**Built with ❤️ for the TypeScript community.**

[Contributing](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) · [MIT License](./LICENSE)

</div>
