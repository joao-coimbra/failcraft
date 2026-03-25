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

[Install](#install) · [Either](#either) · [Chaining](#chaining) · [Async](#async) · [Maybe](#maybe) · [Result](#result) · [Try helpers](#try-helpers) · [Attempt](#attempt) · [API](#api)

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

> **Tip:** Always annotate the return type of functions that return `Either` through multiple branches. Without it, TypeScript infers a union of asymmetric types (`Left<"empty", never> | Right<number, never>`) that breaks method calls.
>
> ```ts
> // ❌ infers Left<"empty", never> | Right<number, never>
> function parse(s: string) {
>   if (!s) return left("empty")
>   return right(Number(s))
> }
>
> // ✅ explicit return type collapses the union
> function parse(s: string): Either<"empty", number> {
>   if (!s) return left("empty")
>   return right(Number(s))
> }
> ```

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

Pass an async function to `transform()` or `andThen()` and the chain automatically becomes an `AsyncEither<L, R>`. The key rule: **`await` goes once at the end of the chain**, not on each step.

```ts
import { right } from 'failcraft'

const name = await right(1)
  .transform(async (n) => fetchUser(n))    // Either → AsyncEither
  .andThen(async (user) => saveUser(user)) // still AsyncEither
  .transform((user) => user.name)          // sync step, still AsyncEither
  .orDefault("anonymous")
  // Promise<string> → await once here → string ✅
```

The Promise is kept inside `AsyncEither` during the whole chain. Every terminator — `orDefault`, `getOrThrow`, `match` — resolves it and returns `Promise<T>`, which you `await` at the end.

### `from()` — entry point for `Promise<Either>`

When you already have a `Promise<Either>` (e.g. from an async function or `tryAsync`) and want to keep chaining, use `from()` to wrap it into `AsyncEither`:

```ts
import { from } from 'failcraft'

async function findUser(id: number): Promise<Either<"not_found", User>> { ... }
async function findProfile(id: number): Promise<Either<"no_profile", Profile>> { ... }

// from() lets you chain without intermediate awaits
const name = await from(findUser(1))
  .andThen(user => findProfile(user.id))   // Promise<Either> accepted directly
  .transform(profile => profile.name)
  .orDefault("anonymous")
```

**When to use which pattern:**

```ts
// Long chain with multiple async steps → from() + single await at the end
const name = await from(findUser(1))
  .andThen(u => findProfile(u.id))
  .transform(p => p.name.toUpperCase())
  .orDefault("anonymous")

// Single async source, rest is sync → await the source directly
const result = await findUser(1)          // Either<"not_found", User>
result.transform(u => u.name).orDefault("anonymous")
```

---

## Maybe

`Maybe<T>` represents an optional value — `Just<T>` (present) or `Nothing` (absent). Unlike `null` checks, it's composable and chainable:

```ts
import { maybe, just, nothing } from 'failcraft'

// maybe() wraps any value — null/undefined become Nothing, everything else Just
// Note: falsy values like 0 and "" become Just (only null/undefined → Nothing)
const name = maybe(user.nickname)  // Maybe<string>

name
  .transform(s => s.toUpperCase())           // maps if Just, skips if Nothing
  .filter(s => s.length > 2)                // Nothing if predicate fails
  .orDefault("ANONYMOUS")                   // unwrap with fallback

// Pattern match
name.match({
  just: (n) => `Hello, ${n}!`,
  nothing: () => "Hello, stranger!",
})

// Convert to Either
name.toEither("no nickname set")  // Either<string, string>
```

`transform()` and `andThen()` also accept async functions, returning `AsyncMaybe<T>`:

```ts
maybe(userId)
  .andThen(async (id) => fetchUser(id))   // Maybe → AsyncMaybe
  .transform((user) => user.name)
  .orDefault("unknown")
  // returns Promise<string>
```

---

## Result

`Result<T, E>` is a semantic alias for `Either<E, T>` with success-first parameters and `ok()`/`err()` constructors — ideal when you want readable error handling without custom classes:

```ts
import { ok, err, type Result } from 'failcraft'

async function findUser(id: number): Promise<Result<User, "not_found">> {
  const user = await db.users.findOne({ id })
  return user ? ok(user) : err("not_found")
}

const result = await findUser(42)

result.match({
  right: (user) => `Found: ${user.name}`,
  left: (e) => `Error: ${e}`,              // e is typed as "not_found"
})
```

Since `Result<T, E>` is just `Either<E, T>`, the entire `Either` API is available — `transform`, `andThen`, `orDefault`, `match`, and async overloads all work without any additional imports.

---

## Try helpers

Wrap functions that may throw without writing try/catch yourself:

```ts
import { trySync, tryAsync } from 'failcraft'

// Synchronous
const parsed = trySync(() => JSON.parse(rawJson))
// Either<unknown, unknown>

// Async — tryAsync returns Promise<Either>, compatible with from()
const data = await tryAsync(() => fetch("/api").then(r => r.json()))
// Either<unknown, unknown>

data
  .transform((d) => d.items)
  .match({
    left: (err) => console.error(err),
    right: (items) => console.log(items),
  })
```

---

## Attempt

`attempt()` is a unified try/catch wrapper that automatically detects whether the function is sync or async, and accepts an optional `mapError` to transform the caught value:

```ts
import { attempt } from 'failcraft'

// Sync — returns Either<unknown, unknown>
const parsed = attempt(() => JSON.parse(rawJson))

// Async — returns AsyncEither<unknown, Data>
const data = await attempt(async () => fetch("/api/data").then(r => r.json()))

// With error mapping — narrow the left type
const user = await attempt(
  () => db.users.findOne(id),
  (err) => err instanceof DatabaseError ? err.code : "UNKNOWN"
)
// AsyncEither<string, User>
```

Use `attempt()` when you want a single import that handles both sync and async throws with optional error shaping. Use `trySync`/`tryAsync` for simpler cases where you don't need error mapping.

---

## API

### `left(value)` / `right(value)`

Constructors that return `Left<L, R>` and `Right<R, L>` respectively. Both are subtypes of `Either<L, R>`, so the full `Either` API is always available.

### `Either<L, R>`

| Method | Description |
|---|---|
| `.isLeft()` / `.isRight()` | Narrow the type to `Left` or `Right` |
| `.isError()` / `.isSuccess()` | Aliases for `.isLeft()` / `.isRight()` |
| `.transform(fn)` | Map the right value; async `fn` returns `AsyncEither` |
| `.andThen(fn)` | Chain an `Either`-returning fn; async `fn` returns `AsyncEither` |
| `.orDefault(value)` | Unwrap right or return fallback |
| `.getOrThrow()` | Unwrap right or throw the left value |
| `.getOrThrowWith(fn)` | Unwrap right or throw `fn(leftValue)` |
| `.toMaybe()` | Convert to `Maybe<R>` — right becomes `Just`, left becomes `Nothing` |
| `.on(cases)` | Side-effect tap; returns `this` |
| `.match(cases)` | Exhaustive pattern match; returns `T` |

### `AsyncEither<L, R>`

Same interface as `Either` but every method returns `AsyncEither` or `Promise`. Extra method:

| Method | Description |
|---|---|
| `.toPromise()` | Returns the underlying `Promise<Either<L, R>>` |

### `from(promise)`

Wraps a `Promise<Either<L, R>>` into a chainable `AsyncEither<L, R>`, or a `Promise<Maybe<T>>` into a chainable `AsyncMaybe<T>`. Use this as the entry point whenever you have a `Promise<Either>` or `Promise<Maybe>` from an `async` function and want to keep chaining without intermediate `await` calls. The `await` goes once at the very end on the terminator (`orDefault`, `getOrThrow`, `match`).

### `Maybe<T>`

| Method | Description |
|---|---|
| `.isJust()` / `.isNothing()` | Narrow the type |
| `.transform(fn)` | Map the value; async `fn` returns `AsyncMaybe` |
| `.andThen(fn)` | Chain a `Maybe`-returning fn; async `fn` returns `AsyncMaybe` |
| `.filter(predicate)` | Return `Nothing` when predicate fails |
| `.orDefault(value)` | Unwrap or return fallback |
| `.orNothing()` | Unwrap to `T \| undefined` |
| `.orThrow(error)` | Unwrap or throw |
| `.toEither(leftValue)` | Convert to `Either` — `Just` → `right`, `Nothing` → `left` |
| `.on(cases)` | Side-effect tap; returns `this` |
| `.match(cases)` | Exhaustive pattern match; returns `T` |

### `maybe(value)` / `just(value)` / `nothing()`

`just(value)` returns `Just<T>`, `nothing()` returns `Nothing`, and `maybe(value)` returns `Maybe<NonNullable<T>>` — mapping `null`/`undefined` to `Nothing`, everything else to `Just`.

### `AsyncMaybe<T>`

Same interface as `Maybe` but every method returns `AsyncMaybe` or `Promise`. Extra method:

| Method | Description |
|---|---|
| `.toPromise()` | Returns the underlying `Promise<Maybe<T>>` |

### `Result<T, E>`

Type alias: `Result<T, E>` ≡ `Either<E, T>`. Use with `ok(value)` / `err(error)` constructors.

### `trySync(fn)` / `tryAsync(fn)`

Wrap a possibly-throwing function. `trySync` returns `Either`, `tryAsync` returns `Promise<Either>`.

### `attempt(fn, mapError?)`

Unified try/catch wrapper that auto-detects sync vs async from the function signature. Returns `Either<L, R>` for sync functions and `AsyncEither<L, R>` for async ones. The optional `mapError` transforms the caught `unknown` error into the left type `L`.

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
