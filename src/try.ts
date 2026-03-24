import { AsyncEither } from "./async-either"
import { type Either, left, right } from "./either"

/**
 * Wraps a synchronous function in an `Either`, catching any thrown error as a left.
 *
 * @param fn - A function that may throw.
 * @returns `right(result)` on success, `left(error)` on throw.
 *
 * @example
 * const result = trySync(() => JSON.parse(raw))
 * // Either<unknown, ParsedType>
 */
export const trySync = <const L = unknown, const R = unknown>(
  fn: () => R
): Either<L, R> => {
  try {
    return right(fn())
  } catch (error) {
    return left(error as L)
  }
}

/**
 * Wraps an async function in an {@link AsyncEither}, catching any rejection as a left.
 *
 * @param fn - An async function that may reject.
 * @returns An `AsyncEither` that resolves to `right(result)` or `left(error)`.
 *
 * @example
 * const result = tryAsync(() => fetch("/api/data").then(r => r.json()))
 * // AsyncEither<unknown, Data>
 */
export const tryAsync = <const L = unknown, const R = unknown>(
  fn: () => Promise<R>
): AsyncEither<L, R> => {
  return new AsyncEither(
    fn()
      .then((value) => right<R, L>(value))
      .catch((error) => left<L, R>(error as L))
  )
}
