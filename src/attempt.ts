import { AsyncEither } from "./async-either"
import { type Either, left, right } from "./either"

const AsyncFunction = Object.getPrototypeOf(
  // biome-ignore lint/suspicious/noEmptyBlockStatements: needed to get AsyncFunction constructor
  async function asyncNoop() {}
).constructor

function isAsyncFn(fn: (...args: unknown[]) => unknown): boolean {
  if (fn instanceof AsyncFunction) {
    return true
  }
  const wrapped = (fn as { getMockImplementation?: () => unknown })
    .getMockImplementation
  if (typeof wrapped === "function") {
    const impl = wrapped.call(fn)
    if (impl instanceof AsyncFunction) {
      return true
    }
  }
  return false
}

/**
 * Wraps a function in an `Either` or `AsyncEither`, catching any thrown error as a left.
 *
 * Pass a sync function to get an `Either` back.
 * Pass an async function (or one that returns a `Promise`) to get an `AsyncEither` back.
 *
 * An optional `mapError` second argument lets you transform the caught error
 * before it becomes the left value. The error parameter defaults to `Error`,
 * but you can annotate it with a custom subclass to access specific properties.
 *
 * @param fn - A function that may throw or reject.
 * @param mapError - Optional. Maps the caught error to the left type `L`.
 *
 * @example
 * // Sync — returns Either
 * attempt(() => JSON.parse(raw))
 * // Either<unknown, unknown>
 *
 * @example
 * // Async — returns AsyncEither
 * attempt(async () => fetch("/api/data").then(r => r.json()))
 * // AsyncEither<unknown, Data>
 *
 * @example
 * // With error mapping (err is Error by default)
 * attempt(() => JSON.parse(raw), (err) => err.message)
 * // Either<string, unknown>
 *
 * @example
 * // With a custom error subclass
 * attempt(
 *   () => db.users.findOne(id),
 *   (err: DatabaseError) => ({ code: err.code, message: err.message })
 * )
 * // AsyncEither<{ code: string; message: string }, User>
 */
export function attempt<L = unknown, R = unknown, E extends Error = Error>(
  fn: () => Promise<R>,
  mapError?: (error: E) => L
): AsyncEither<L, R>
export function attempt<L = unknown, R = unknown, E extends Error = Error>(
  fn: () => R,
  mapError?: (error: E) => L
): Either<L, R>
export function attempt<L = unknown, R = unknown, E extends Error = Error>(
  fn: () => R | Promise<R>,
  mapError?: (error: E) => L
): Either<L, R> | AsyncEither<L, R> {
  const toLeft = (error: unknown): L =>
    mapError ? mapError(error as E) : (error as L)

  if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
    return new AsyncEither(
      (fn() as Promise<R>)
        .then((value) => right<R, L>(value))
        .catch((error) => left<L, R>(toLeft(error)))
    )
  }

  try {
    const result = fn()
    if (result instanceof Promise) {
      return new AsyncEither(
        result
          .then((value) => right<R, L>(value))
          .catch((error) => left<L, R>(toLeft(error)))
      )
    }
    return right<R, L>(result as R)
  } catch (error) {
    return left<L, R>(toLeft(error))
  }
}
