import { AsyncEither } from "./async-either"
import type { AsyncMaybe } from "./async-maybe"
import type { Either } from "./either"
import type { Maybe } from "./maybe"

/**
 * Wraps a `Promise<Either<L, R>>` into an {@link AsyncEither} for fluent chaining.
 *
 * @example
 * const name = await from(findUser(1))
 *   .andThen(user => findProfile(user.id))
 *   .transform(profile => profile.name)
 *   .orDefault("anonymous")
 */
export function from<L, R>(promise: Promise<Either<L, R>>): AsyncEither<L, R>

/**
 * Wraps a `Promise<Maybe<T>>` into an {@link AsyncMaybe} for fluent chaining.
 *
 * @example
 * const name = await from(findUser(1))
 *   .transform(user => user.name)
 *   .orDefault("anonymous")
 */
export function from<T>(promise: Promise<Maybe<T>>): AsyncMaybe<T>

export function from(
  promise: Promise<Either<unknown, unknown> | Maybe<unknown>>
): AsyncEither<unknown, unknown> | AsyncMaybe<unknown> {
  return new AsyncEither(promise as Promise<Either<unknown, unknown>>)
}
