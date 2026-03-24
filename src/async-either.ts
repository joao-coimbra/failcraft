import { type Either, type EitherMatch, type EitherOn, right } from "./either"

/**
 * A promise-based wrapper around {@link Either} that keeps the same chainable
 * API without requiring `await` at every step.
 *
 * Instances are created automatically by {@link tryAsync}, and can be awaited
 * via {@link AsyncEither.toPromise}.
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
   * Accepts both sync and async functions; always returns `AsyncEither`.
   */
  transform<T>(
    fn: ((value: R) => T) | ((value: R) => Promise<T>)
  ): AsyncEither<L, T>
  transform<T>(fn: (value: R) => T | Promise<T>): AsyncEither<L, T> {
    return new AsyncEither(
      this.promise.then((either): Either<L, T> | Promise<Either<L, T>> => {
        if (!either.isRight()) {
          return either as unknown as Either<L, T>
        }
        const result = fn(either.value)
        if (result instanceof Promise) {
          return result.then((v) => right<T, L>(v))
        }
        return right<T, L>(result as T)
      })
    )
  }

  /**
   * Chains a computation returning an `Either`, flattening the result.
   * Accepts both sync and async functions; always returns `AsyncEither`.
   * Short-circuits on left.
   */
  andThen<T>(
    fn: ((value: R) => Either<L, T>) | ((value: R) => Promise<Either<L, T>>)
  ): AsyncEither<L, T>
  andThen<T>(
    fn: (value: R) => Either<L, T> | Promise<Either<L, T>>
  ): AsyncEither<L, T> {
    return new AsyncEither(
      this.promise.then((either): Either<L, T> | Promise<Either<L, T>> => {
        if (!either.isRight()) {
          return either as unknown as Either<L, T>
        }
        return fn(either.value)
      })
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

/**
 * Wraps a `Promise<Either<L, R>>` into an {@link AsyncEither} for fluent chaining.
 *
 * Use `from()` when you already have a `Promise<Either>` — typically the return
 * value of an `async` function — and want to keep chaining `transform`, `andThen`,
 * or other methods without intermediate `await` calls.
 *
 * The Promise stays hidden inside `AsyncEither` for the whole chain.
 * Every terminator (`orDefault`, `getOrThrow`, `match`) resolves it and returns
 * a `Promise<T>`, which you `await` once at the very end.
 *
 * @example
 * // Chain multiple async sources with a single await
 * const name = await from(findUser(1))
 *   .andThen(user => findProfile(user.id))
 *   .transform(profile => profile.name)
 *   .orDefault("anonymous")
 *
 * @example
 * // Also works with tryAsync
 * const data = await from(tryAsync(() => fetch("/api").then(r => r.json())))
 *   .transform(d => d.items)
 *   .orDefault([])
 */
export const from = <L, R>(promise: Promise<Either<L, R>>): AsyncEither<L, R> =>
  new AsyncEither(promise)
