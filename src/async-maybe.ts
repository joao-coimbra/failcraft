import { AsyncEither } from "./async-either"
import { just, type Maybe, type MaybeMatch, type MaybeOn } from "./maybe"

/**
 * A promise-based wrapper around {@link Maybe} with the same chainable API.
 *
 * Created automatically by {@link Maybe.transform} or {@link Maybe.andThen}
 * when passed an async function — never instantiated directly by users.
 *
 * @typeParam T - The type of the present value.
 */
export class AsyncMaybe<T> {
  constructor(private readonly promise: Promise<Maybe<T>>) {}

  /**
   * Runs the matching side-effect handler for whichever branch resolves,
   * then passes the `Maybe` through unchanged.
   *
   * @param cases - Partial handlers; omit a branch to ignore it.
   */
  on(cases: MaybeOn<T>): AsyncMaybe<T> {
    return new AsyncMaybe(this.promise.then((maybe) => maybe.on(cases)))
  }

  /**
   * Maps the value through `fn` once the promise resolves.
   * Accepts both sync and async functions; always returns `AsyncMaybe`.
   * Short-circuits on Nothing.
   */
  transform<U>(
    fn: ((value: T) => U) | ((value: T) => Promise<U>)
  ): AsyncMaybe<U>
  transform<U>(fn: (value: T) => U | Promise<U>): AsyncMaybe<U> {
    return new AsyncMaybe(
      this.promise.then((maybe): Maybe<U> | Promise<Maybe<U>> => {
        if (!maybe.isJust()) {
          return maybe as unknown as Maybe<U>
        }
        const result = fn(maybe.value)
        if (result instanceof Promise) {
          return result.then((v) => just<U>(v))
        }
        return just<U>(result as U)
      })
    )
  }

  /**
   * Chains a computation returning a `Maybe`, flattening the result.
   * Accepts both sync and async functions; always returns `AsyncMaybe`.
   * Short-circuits on Nothing.
   */
  andThen<U>(
    fn: ((value: T) => Maybe<U>) | ((value: T) => Promise<Maybe<U>>)
  ): AsyncMaybe<U>
  andThen<U>(fn: (value: T) => Maybe<U> | Promise<Maybe<U>>): AsyncMaybe<U> {
    return new AsyncMaybe(
      this.promise.then((maybe): Maybe<U> | Promise<Maybe<U>> => {
        if (!maybe.isJust()) {
          return maybe as unknown as Maybe<U>
        }
        return fn(maybe.value)
      })
    )
  }

  /**
   * Resolves to `just(value)` when predicate passes, `nothing()` when it fails.
   *
   * @param predicate - Test applied to the present value.
   */
  filter(predicate: (value: T) => boolean): AsyncMaybe<T> {
    return new AsyncMaybe(this.promise.then((maybe) => maybe.filter(predicate)))
  }

  /**
   * Exhaustively pattern-matches the resolved Maybe, returning a `Promise`
   * of the handler's result.
   *
   * @param cases - Both `just` and `nothing` handlers must be provided.
   */
  async match<U>(cases: MaybeMatch<T, U>): Promise<U> {
    return (await this.promise).match(cases)
  }

  /**
   * Resolves to the present value, or `defaultValue` if Nothing.
   *
   * @param defaultValue - Fallback value, must be assignable to `T`.
   */
  async orDefault<U extends T>(defaultValue: U): Promise<T> {
    return (await this.promise).orDefault(defaultValue)
  }

  /**
   * Resolves to the present value, or `undefined` if Nothing.
   */
  async orNothing(): Promise<T | undefined> {
    return (await this.promise).orNothing()
  }

  /**
   * Resolves to the present value, or throws `error` if Nothing.
   *
   * @param error - Value to throw when Nothing. Defaults to `undefined`.
   * @throws The provided `error`.
   */
  async orThrow(error?: unknown): Promise<T> {
    return (await this.promise).orThrow(error)
  }

  /**
   * Converts the resolved `Maybe` to an `AsyncEither`.
   * `just(value)` → `right(value)`, `nothing()` → `left(leftValue)`.
   *
   * @param leftValue - Value to use as the left (error) side when Nothing.
   */
  toEither<L>(leftValue: L): AsyncEither<L, T> {
    return new AsyncEither(
      this.promise.then((maybe) => maybe.toEither(leftValue))
    )
  }

  /** @internal */
  toPromise(): Promise<Maybe<T>> {
    return this.promise
  }
}
