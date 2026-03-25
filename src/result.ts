import type { Either } from "./either"
import { left, right } from "./either"

/**
 * A semantic alias for {@link Either} with success-first type parameters.
 * `Result<T, E>` ≡ `Either<E, T>`.
 *
 * @typeParam T - The success (value) type.
 * @typeParam E - The error type.
 *
 * @example
 * async function findUser(id: number): Promise<Result<User, "not_found">> {
 *   const user = await db.users.findOne({ id })
 *   return user ? ok(user) : err("not_found")
 * }
 */
export type Result<T, E = Error> = Either<E, T>

/**
 * Creates a successful `Result` (wraps a value as `right`).
 *
 * @example
 * ok(user)        // Result<User, never>
 * ok(user) satisfies Result<User, "not_found">
 */
export const ok = <const T, E = Error>(value: T): Result<T, E> =>
  right<T, E>(value)

/**
 * Creates a failed `Result` (wraps an error as `left`).
 *
 * @example
 * err("not_found")   // Result<never, "not_found">
 * err(new Error("unexpected"))  // Result<never, Error>
 */
export const err = <const E, T = never>(error: E): Result<T, E> =>
  left<E, T>(error)
