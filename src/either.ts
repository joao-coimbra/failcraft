import { AsyncEither } from "./async-either"
import { just, type Maybe, nothing } from "./maybe"

/**
 * Handlers for both branches of an Either, each returning a value of type `T`.
 * Used by {@link Either.match} to exhaustively handle left and right cases.
 */
export interface EitherMatch<L, R, T> {
  left: (value: L) => T
  right: (value: R) => T
}

/**
 * Optional side-effect handlers for an Either's branches.
 * Used by {@link Either.on} to react to a value without transforming it.
 */
export type EitherOn<L, R> = Partial<EitherMatch<L, R, void>>

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
export abstract class Either<L, R> {
  abstract readonly value: L | R

  /** Returns `true` and narrows to `Left` when this is a left value. */
  abstract isLeft(): this is Left<L, R>

  /** Returns `true` and narrows to `Right` when this is a right value. */
  abstract isRight(): this is Right<R, L>

  /** Alias for {@link isLeft} — semantically signals an error path. */
  isError(): this is Left<L, R> {
    return this.isLeft()
  }

  /** Alias for {@link isRight} — semantically signals a success path. */
  isSuccess(): this is Right<R, L> {
    return this.isRight()
  }

  /**
   * Runs the matching side-effect handler for whichever branch this is,
   * then returns `this` unchanged — useful for logging or debugging mid-chain.
   *
   * @param cases - Partial handlers; omit a branch to ignore it.
   */
  abstract on(cases: EitherOn<L, R>): this

  /**
   * Exhaustively pattern-matches this Either, returning the result of
   * whichever branch handler is called.
   *
   * @param cases - Both `left` and `right` handlers must be provided.
   */
  abstract match<T>(cases: EitherMatch<L, R, T>): T

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
  abstract orDefault(defaultValue: R): R

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

export class Left<L, R = never> extends Either<L, R> {
  constructor(readonly value: L) {
    super()
  }

  isLeft(): this is Left<L, R> {
    return true
  }

  isRight(): this is Right<R, L> {
    return false
  }

  on(cases: EitherOn<L, R>): this {
    cases.left?.(this.value)
    return this
  }

  match<T>(cases: EitherMatch<L, R, T>): T {
    return cases.left(this.value)
  }

  transform<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T>
  transform<T>(fn: (value: R) => T): Either<L, T>
  transform<T>(
    fn: (value: R) => T | Promise<T>
  ): Either<L, T> | AsyncEither<L, T> {
    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
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
      return new AsyncEither(Promise.resolve(this as unknown as Either<L, T>))
    }
    return this as unknown as Either<L, T>
  }

  toMaybe(): Maybe<R> {
    return nothing()
  }

  orDefault(defaultValue: R): R {
    return defaultValue
  }

  getOrThrow(): R {
    throw this.value
  }

  getOrThrowWith(fn: (value: L) => unknown): R {
    throw fn(this.value)
  }
}

export class Right<R, L = never> extends Either<L, R> {
  constructor(readonly value: R) {
    super()
  }

  isLeft(): this is Left<L, R> {
    return false
  }

  isRight(): this is Right<R, L> {
    return true
  }

  on(cases: EitherOn<L, R>): this {
    cases.right?.(this.value)
    return this
  }

  match<T>(cases: EitherMatch<L, R, T>): T {
    return cases.right(this.value)
  }

  transform<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T>
  transform<T>(fn: (value: R) => T): Either<L, T>
  transform<T>(
    fn: (value: R) => T | Promise<T>
  ): Either<L, T> | AsyncEither<L, T> {
    const result = fn(this.value)
    if (result instanceof Promise) {
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
      return new AsyncEither(result)
    }
    return result
  }

  toMaybe(): Maybe<R> {
    return just(this.value)
  }

  orDefault(_defaultValue: R): R {
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
