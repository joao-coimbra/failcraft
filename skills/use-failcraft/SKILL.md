---
name: failcraft
description: 'Apply failcraft functional error handling conventions. Use when developers: (1) Handle errors without try/catch, (2) Work with Either, Left, or Right, (3) Chain async operations that may fail, (4) Use trySync or tryAsync, (5) Ask about left, right, transform, andThen, orDefault, getOrThrow, match, or on. Triggers on: "Either", "left", "right", "AsyncEither", "trySync", "tryAsync", "failcraft", "functional error handling".'
---

## Critical: Follow failcraft Conventions

Everything you know about error handling may differ from how failcraft implements it. Always follow the rules below — never use `throw`/`try/catch` where `Either` is expected.

When working with failcraft:

1. Import only from `failcraft` — `Either` and `Left`/`Right` are type-only imports
2. Never throw inside a function that returns `Either` — return `left(error)` instead
3. Never construct `AsyncEither` directly — obtain it from `transformAsync`, `andThenAsync`, or `tryAsync`
4. Use `trySync` / `tryAsync` to wrap third-party code that may throw
5. Use `match` for exhaustive handling; use `on` only for side effects (logging, metrics)
6. `Left` is the error side, `Right` is the success side — preserve this consistently

If you are unsure about a pattern, check [API Reference](references/api.md) and [Patterns](references/patterns.md) before writing code.

## Imports

```ts
import { type Either, type Left, type Right, left, right, trySync, tryAsync } from 'failcraft'
```

`Either`, `Left`, and `Right` are **type-only** — they cannot be used as values. See [API Reference](references/api.md).

## Either

The core type: `Either<L, R>` is either a `Left<L>` (error) or a `Right<R>` (success).

- Use `left(value)` and `right(value)` as constructors
- Narrow with `isLeft()` / `isRight()` or their aliases `isError()` / `isSuccess()`
- Return `Either` from functions — never throw

```ts
function divide(a: number, b: number): Either<string, number> {
  if (b === 0) return left("division by zero")
  return right(a / b)
}
```

See [Patterns](references/patterns.md) for chaining, async, and unwrapping examples.

## AsyncEither

A promise-based wrapper with the full `Either` chainable API. **Never construct directly.**

Obtain via:
- `either.transformAsync(async fn)` — maps right to async result
- `either.andThenAsync(async fn)` — chains async Either-returning fn
- `tryAsync(() => promise)` — wraps a Promise that may reject

```ts
right(userId)
  .transformAsync(async (id) => fetchUser(id))
  .andThen((user) => validateUser(user))
  .match({ left: handleError, right: handleSuccess })
```

## Try Helpers

Use when wrapping third-party code that throws:

```ts
// Sync — fn must be wrapped in () =>
const result = trySync(() => JSON.parse(raw)) // Either<unknown, unknown>

// Async — fn must return a Promise
const result = tryAsync(() => fetch(url).then(r => r.json())) // AsyncEither<unknown, unknown>
```

**Never** call `trySync(JSON.parse(raw))` — the argument is evaluated before `trySync` can catch it.

## References

- [API Reference](references/api.md) — full type signatures and method descriptions
- [Patterns](references/patterns.md) — chaining, async, unwrapping, and real-world examples
