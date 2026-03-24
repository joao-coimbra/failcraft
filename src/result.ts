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

/** Creates a successful `Result` (maps to `right`). */
export const ok = <const T, E = Error>(value: T): Result<T, E> =>
  right<T, E>(value)

/** Creates a failed `Result` (maps to `left`). */
export const err = <const E, T = never>(error: E): Result<T, E> =>
  left<E, T>(error)
