import { type Either, left, right } from "./either"

/**
 * Wraps a synchronous function in an `Either`, catching any thrown error as a left.
 *
 * @deprecated Use {@link attempt} instead — it handles both sync and async in a single call.
 *
 * @param fn - A function that may throw.
 * @returns `right(result)` on success, `left(error)` on throw.
 *
 * @example
 * const result = trySync(() => JSON.parse(raw))
 * // Either<unknown, ParsedType>
 */
export const trySync = <L = unknown, R = unknown>(
  fn: () => R
): Either<L, R> => {
  try {
    return right(fn())
  } catch (error) {
    return left(error as L)
  }
}

/**
 * Wraps an async function in a `Promise<Either>`, catching any rejection as a left.
 *
 * @deprecated Use {@link attempt} instead — it handles both sync and async in a single call.
 *
 * @param fn - An async function that may reject.
 * @returns A `Promise` that resolves to `right(result)` or `left(error)`.
 *
 * @example
 * const result = await tryAsync(() => fetch("/api/data").then(r => r.json()))
 * // Either<unknown, Data>
 */
export const tryAsync = <L = unknown, R = unknown>(
  fn: () => Promise<R>
): Promise<Either<L, R>> =>
  fn()
    .then((value) => right<R, L>(value))
    .catch((error) => left<L, R>(error as L))
