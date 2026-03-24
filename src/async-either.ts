import type { Either, EitherMatch, EitherOn } from "./either"

/**
 * A promise-based wrapper around {@link Either} that keeps the same chainable
 * API without requiring `await` at every step.
 *
 * Instances are created automatically by {@link Either.transformAsync},
 * {@link Either.andThenAsync}, {@link tryAsync}, and can be awaited via
 * {@link AsyncEither.toPromise}.
 *
 * @typeParam L - The left (error) type.
 * @typeParam R - The right (success) type.
 */
export class AsyncEither<L, R> {
  constructor(private readonly promise: Promise<Either<L, R>>) {}

  /**
   * Runs the matching side-effect handler for whichever branch resolves,
   * then passes the `Either` through unchanged.
   *
   * @param cases - Partial handlers; omit a branch to ignore it.
   */
  on(cases: EitherOn<L, R>): AsyncEither<L, R> {
    return new AsyncEither(this.promise.then((either) => either.on(cases)))
  }

  /**
   * Maps the right value through `fn` once the promise resolves.
   * Leaves a left untouched.
   *
   * @param fn - Synchronous mapping function.
   */
  transform<T>(fn: (value: R) => T): AsyncEither<L, T> {
    return new AsyncEither(this.promise.then((either) => either.transform(fn)))
  }

  /**
   * Chains a synchronous computation that returns an `Either`, flattening the result.
   * Short-circuits on left.
   *
   * @param fn - Returns the next `Either` in the chain.
   */
  andThen<T>(fn: (value: R) => Either<L, T>): AsyncEither<L, T> {
    return new AsyncEither(this.promise.then((either) => either.andThen(fn)))
  }

  /**
   * Like {@link transform}, but the mapping function returns a `Promise`.
   *
   * @param fn - Async mapping function.
   */
  transformAsync<T>(fn: (value: R) => Promise<T>): AsyncEither<L, T> {
    return new AsyncEither(
      this.promise.then((either) => either.transformAsync(fn).toPromise())
    )
  }

  /**
   * Like {@link andThen}, but the chained computation is async.
   *
   * @param fn - Returns a `Promise<Either>` for the next step.
   */
  andThenAsync<T>(fn: (value: R) => Promise<Either<L, T>>): AsyncEither<L, T> {
    return new AsyncEither(
      this.promise.then((either) => either.andThenAsync(fn).toPromise())
    )
  }

  /**
   * Exhaustively pattern-matches the resolved Either, returning a `Promise`
   * of the handler's result.
   *
   * @param cases - Both `left` and `right` handlers must be provided.
   */
  async match<T>(cases: EitherMatch<L, R, T>): Promise<T> {
    return (await this.promise).match(cases)
  }

  /**
   * Resolves to the right value, or `defaultValue` if left.
   *
   * @param defaultValue - Fallback value, must be assignable to `R`.
   */
  async orDefault<T extends R>(defaultValue: T): Promise<R> {
    return (await this.promise).orDefault(defaultValue)
  }

  /**
   * Resolves to the right value, or rejects with the left value if left.
   *
   * @throws The left value.
   */
  async getOrThrow(): Promise<R> {
    return (await this.promise).getOrThrow()
  }

  /**
   * Resolves to the right value, or rejects with the result of `fn(leftValue)`.
   *
   * @param fn - Transforms the left value into the thrown error.
   * @throws The return value of `fn`.
   */
  async getOrThrowWith(fn: (value: L) => unknown): Promise<R> {
    return (await this.promise).getOrThrowWith(fn)
  }

  /** @internal */
  toPromise(): Promise<Either<L, R>> {
    return this.promise
  }
}
