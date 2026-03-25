import type { AsyncEither } from "./async-either"
import { BaseEither, BaseLeft, BaseRight } from "./base-either"
import { just, type Maybe, nothing } from "./maybe"

export type { EitherMatch, EitherOn } from "./base-either"

const AsyncFunction = Object.getPrototypeOf(
  // biome-ignore lint/suspicious/noEmptyBlockStatements: needed to get AsyncFunction constructor
  async function asyncNoop() {}
).constructor

function isAsyncFn(fn: (...args: unknown[]) => unknown): boolean {
  if (fn instanceof AsyncFunction) {
    return true
  }
  // Fallback for wrapped functions (e.g. test mocks) that expose getMockImplementation
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
   * Pass an async function to automatically get an {@link AsyncEither} back.
   *
   * @example
   * right(2).transform(n => n * 3)           // Either<L, number>
   * right(2).transform(async n => n * 3)     // AsyncEither<L, number>
   */
  abstract transform<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T>
  abstract transform<T>(fn: (value: R) => T): Either<L, T>

  /**
   * Chains a computation returning an `Either`, flattening the result.
   * Pass an async function to automatically get an {@link AsyncEither} back.
   * Short-circuits on left.
   */
  abstract andThen<T>(
    fn: (value: R) => Promise<Either<L, T>>
  ): AsyncEither<L, T>
  abstract andThen<T>(fn: (value: R) => Either<L, T>): Either<L, T>

  /**
   * Converts this `Either` to a `Maybe`.
   * right(value) → just(value), left → nothing().
   */
  abstract toMaybe(): Maybe<R>

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

  transform<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T>
  transform<T>(fn: (value: R) => T): Either<L, T>
  transform<T>(
    fn: (value: R) => T | Promise<T>
  ): Either<L, T> | AsyncEither<L, T> {
    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
      const { AsyncEither } = require("./async-either")
      return new AsyncEither(Promise.resolve(this as unknown as Either<L, T>))
    }
    return this as unknown as Either<L, T>
  }

  andThen<T>(fn: (value: R) => Promise<Either<L, T>>): AsyncEither<L, T>
  andThen<T>(fn: (value: R) => Either<L, T>): Either<L, T>
  andThen<T>(
    fn: (value: R) => Either<L, T> | Promise<Either<L, T>>
  ): Either<L, T> | AsyncEither<L, T> {
    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
      const { AsyncEither } = require("./async-either")
      return new AsyncEither(Promise.resolve(this as unknown as Either<L, T>))
    }
    return this as unknown as Either<L, T>
  }

  toMaybe(): Maybe<R> {
    return nothing()
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

  transform<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T>
  transform<T>(fn: (value: R) => T): Either<L, T>
  transform<T>(
    fn: (value: R) => T | Promise<T>
  ): Either<L, T> | AsyncEither<L, T> {
    const result = fn(this.value)
    if (result instanceof Promise) {
      const { AsyncEither } = require("./async-either")
      return new AsyncEither(result.then((v) => right<T, L>(v)))
    }
    return right(result as T) as Either<L, T>
  }

  andThen<T>(fn: (value: R) => Promise<Either<L, T>>): AsyncEither<L, T>
  andThen<T>(fn: (value: R) => Either<L, T>): Either<L, T>
  andThen<T>(
    fn: (value: R) => Either<L, T> | Promise<Either<L, T>>
  ): Either<L, T> | AsyncEither<L, T> {
    const result = fn(this.value)
    if (result instanceof Promise) {
      const { AsyncEither } = require("./async-either")
      return new AsyncEither(result)
    }
    return result
  }

  toMaybe(): Maybe<R> {
    return just(this.value)
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
export const left = <L, R = never>(value: L): Left<L, R> => new Left(value)

/**
 * Creates a `Right` (success) instance of `Either`.
 *
 * @example
 * const result = right(42) // Either<never, number>
 */
export const right = <R, L = never>(value: R): Right<R, L> => new Right(value)
