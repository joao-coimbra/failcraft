# Patterns

## Returning Either from a function

Never throw — return `left` for errors, `right` for success.

```ts
import { type Either, left, right } from 'failcraft'

function findUser(id: string): Either<string, User> {
  const user = db.find(id)
  if (!user) return left("user not found")
  return right(user)
}
```

---

## Chaining with transform / andThen

Use `transform` to map the right value, `andThen` to chain another `Either`-returning function.
Left values short-circuit — subsequent steps are skipped.

```ts
findUser(id)
  .transform((user) => user.email)          // Either<string, string>
  .andThen((email) => validateEmail(email)) // Either<string, Email>
  .orDefault("fallback@example.com")
```

---

## Pattern matching

Use `match` when you need a value from both branches:

```ts
const message = findUser(id).match({
  left: (err) => `Error: ${err}`,
  right: (user) => `Hello, ${user.name}`,
})
```

Use `on` for side effects only — it returns `this` and does not transform:

```ts
findUser(id)
  .on({ left: (err) => logger.warn(err) })
  .transform((user) => user.name)
```

---

## Narrowing with type guards

```ts
const result = findUser(id)

if (result.isRight()) {
  console.log(result.value.name) // typed as User
}

if (result.isError()) {
  console.log(result.value) // typed as string
}
```

---

## Async chains

Transition to `AsyncEither` via `transformAsync` or `andThenAsync`, then keep chaining:

```ts
import { right } from 'failcraft'

right(userId)
  .transformAsync(async (id) => fetchUser(id))     // AsyncEither<never, User>
  .andThen((user) => validateRole(user))           // sync step mid-chain
  .andThenAsync(async (user) => saveAuditLog(user))
  .match({
    left: (err) => Response.error(err),
    right: (user) => Response.json(user),
  })
  // Promise<Response>
```

---

## Wrapping third-party code

Use `trySync` / `tryAsync` at the boundary — never inside domain logic.

```ts
import { trySync, tryAsync } from 'failcraft'

// Sync — always wrap in () =>
const parsed = trySync(() => JSON.parse(raw))
// Either<unknown, unknown>

// Async
const data = tryAsync(() => fetch(url).then(r => r.json()))
// AsyncEither<unknown, unknown>

// Common: cast the error type
const result = trySync<ValidationError, Config>(() => parseConfig(raw))
```

---

## Unwrapping

```ts
// Provide a fallback
const name = findUser(id).orDefault(guestUser).name

// Throw if you're certain it's right (e.g. in tests)
const user = findUser(id).getOrThrow()

// Throw a custom error
const user = findUser(id).getOrThrowWith((err) => new NotFoundError(err))
```

---

## Composing multiple Eithers

```ts
function createOrder(userId: string, productId: string): Either<string, Order> {
  return findUser(userId)
    .andThen((user) => findProduct(productId).transform((product) => ({ user, product })))
    .andThen(({ user, product }) => buildOrder(user, product))
}
```
