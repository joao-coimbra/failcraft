import type { AsyncEither } from "./async-either"
import { BaseEither, BaseLeft, BaseRight } from "./base-either"

export type { EitherMatch, EitherOn } from "./base-either"

/**
 * A synchronous discriminated union representing either a failure (`Left`)
 * or a success (`Right`).
 *
 * Use the {@link left} and {@link right} constructors to create instances,
 * and methods like {@link Either.transform transform}, {@link Either.andThen andThen},
 * and {@link Either.match match} to work with the value.
 *
 * @typeParam L - The left (error) type.
 * @typeParam R - The right (success) type.
 */
export abstract class Either<L, R> extends BaseEither<L, R> {
  /**
   * Maps the right value through `fn`, leaving a left untouched.
   *
   * @example
   * right(2).transform(n => n * 3) // right(6)
   * left("err").transform(n => n * 3) // left("err")
   */
  abstract transform<T>(fn: (value: R) => T): Either<L, T>

  /**
   * Chains a computation that itself returns an `Either`, flattening the result.
   * Short-circuits on left.
   *
   * @example
   * right(2).andThen(n => (n > 0 ? right(n * 3) : left("negative"))) // right(6)
   */
  abstract andThen<T>(fn: (value: R) => Either<L, T>): Either<L, T>

  /**
   * Like {@link transform}, but the mapping function returns a `Promise`.
   * Produces an {@link AsyncEither} so async chains remain composable.
   */
  abstract transformAsync<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T>

  /**
   * Like {@link andThen}, but the chained computation is async.
   * Produces an {@link AsyncEither}.
   */
  abstract andThenAsync<T>(
    fn: (value: R) => Promise<Either<L, T>>
  ): AsyncEither<L, T>

  /**
   * Returns the right value if present, otherwise returns `defaultValue`.
   *
   * @param defaultValue - Fallback value, must be assignable to `R`.
   */
  abstract orDefault<T extends R>(defaultValue: T): R

  /**
   * Unwraps the right value, or throws the left value directly if this is a left.
   *
   * @throws The left value.
   */
  abstract getOrThrow(): R

  /**
   * Unwraps the right value, or throws the result of `fn(leftValue)` if this is a left.
   *
   * @param fn - Transforms the left value into the thrown error.
   * @throws The return value of `fn`.
   */
  abstract getOrThrowWith(fn: (value: L) => unknown): R
}

export class Left<L, R = never> extends BaseLeft<L, R> {
  declare readonly value: L

  transform<T>(_fn: (value: R) => T): Either<L, T> {
    return this as unknown as Either<L, T>
  }

  andThen<T>(_fn: (value: R) => Either<L, T>): Either<L, T> {
    return this as unknown as Either<L, T>
  }

  transformAsync<T>(_fn: (value: R) => Promise<T>): AsyncEither<L, T> {
    const { AsyncEither } = require("./async-either")
    return new AsyncEither(Promise.resolve(this as unknown as Either<L, T>))
  }

  andThenAsync<T>(_fn: (value: R) => Promise<Either<L, T>>): AsyncEither<L, T> {
    const { AsyncEither } = require("./async-either")
    return new AsyncEither(Promise.resolve(this as unknown as Either<L, T>))
  }

  orDefault<T extends R>(defaultValue: T): R {
    return defaultValue
  }

  getOrThrow(): R {
    throw this.value
  }

  getOrThrowWith(fn: (value: L) => unknown): R {
    throw fn(this.value)
  }
}

export class Right<R, L = never> extends BaseRight<R, L> {
  declare readonly value: R

  transform<T>(fn: (value: R) => T): Either<L, T> {
    return right(fn(this.value))
  }

  andThen<T>(fn: (value: R) => Either<L, T>): Either<L, T> {
    return fn(this.value)
  }

  transformAsync<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T> {
    const { AsyncEither } = require("./async-either")
    return new AsyncEither(fn(this.value).then((v) => right<T, L>(v)))
  }

  andThenAsync<T>(fn: (value: R) => Promise<Either<L, T>>): AsyncEither<L, T> {
    const { AsyncEither } = require("./async-either")
    return new AsyncEither(fn(this.value))
  }

  orDefault<T extends R>(_defaultValue: T): R {
    return this.value
  }

  getOrThrow(): R {
    return this.value
  }

  getOrThrowWith(_fn: (value: L) => unknown): R {
    return this.value
  }
}

/**
 * Creates a `Left` (error/failure) instance of `Either`.
 *
 * @example
 * const result = left("not found") // Either<string, never>
 */
export const left = <const L, R = never>(value: L): Either<L, R> =>
  new Left(value)

/**
 * Creates a `Right` (success) instance of `Either`.
 *
 * @example
 * const result = right(42) // Either<never, number>
 */
export const right = <const R, L = never>(value: R): Either<L, R> =>
  new Right(value)
