# API Reference

## Imports

```ts
import { type Either, type Left, type Right, left, right, trySync, tryAsync } from 'failcraft'
```

`Either`, `Left`, `Right` are **type-only**. `left`, `right`, `trySync`, `tryAsync` are runtime values.

---

## `left(value)` / `right(value)`

Constructors for `Either<L, R>`.

```ts
const fail = left("not found")   // Either<string, never>
const ok   = right(42)           // Either<never, number>
```

---

## `Either<L, R>`

Abstract type — always a `Left<L>` or `Right<R>` at runtime.

### Narrowing

| Method | Returns | Description |
|---|---|---|
| `.isLeft()` | `this is Left<L, R>` | True when left |
| `.isRight()` | `this is Right<R, L>` | True when right |
| `.isError()` | `this is Left<L, R>` | Alias for `isLeft()` |
| `.isSuccess()` | `this is Right<R, L>` | Alias for `isRight()` |

### Transformation (right only — left passes through)

| Method | Returns | Description |
|---|---|---|
| `.transform(fn)` | `Either<L, T>` | Maps right value synchronously |
| `.andThen(fn)` | `Either<L, T>` | Chains an `Either`-returning fn; flattens |
| `.transformAsync(fn)` | `AsyncEither<L, T>` | Maps right value asynchronously |
| `.andThenAsync(fn)` | `AsyncEither<L, T>` | Chains an async `Either`-returning fn |

### Unwrapping

| Method | Returns | Description |
|---|---|---|
| `.orDefault(value)` | `R` | Returns right value or fallback |
| `.getOrThrow()` | `R` | Returns right or throws left value |
| `.getOrThrowWith(fn)` | `R` | Returns right or throws `fn(leftValue)` |

### Pattern matching

| Method | Returns | Description |
|---|---|---|
| `.match({ left, right })` | `T` | Exhaustive — both branches required |
| `.on({ left?, right? })` | `this` | Side-effect tap; returns `this` for chaining |

---

## `AsyncEither<L, R>`

Promise-based wrapper. **Never construct directly** — obtain from `transformAsync`, `andThenAsync`, or `tryAsync`.

| Method | Returns | Description |
|---|---|---|
| `.transform(fn)` | `AsyncEither<L, T>` | Sync map on resolved right |
| `.andThen(fn)` | `AsyncEither<L, T>` | Sync Either chain on resolved right |
| `.transformAsync(fn)` | `AsyncEither<L, T>` | Async map on resolved right |
| `.andThenAsync(fn)` | `AsyncEither<L, T>` | Async Either chain on resolved right |
| `.match({ left, right })` | `Promise<T>` | Exhaustive match; returns Promise |
| `.on({ left?, right? })` | `AsyncEither<L, R>` | Side-effect tap |
| `.orDefault(value)` | `Promise<R>` | Resolves to right or fallback |
| `.getOrThrow()` | `Promise<R>` | Resolves to right or rejects with left |
| `.getOrThrowWith(fn)` | `Promise<R>` | Resolves to right or rejects with `fn(left)` |
| `.toPromise()` | `Promise<Either<L, R>>` | Unwraps to raw `Promise<Either>` |

---

## `trySync(fn)`

```ts
trySync<L, R>(fn: () => R): Either<L, R>
```

Executes `fn` inside a try/catch. Returns `right(result)` on success, `left(error)` on throw.

`fn` **must be wrapped in `() =>`** — arguments are evaluated before the function call.

---

## `tryAsync(fn)`

```ts
tryAsync<L, R>(fn: () => Promise<R>): AsyncEither<L, R>
```

Wraps a Promise factory. Returns `AsyncEither` resolving to `right(value)` or `left(error)`.
