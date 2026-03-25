import { AsyncEither } from "./async-either"
import { just, type Maybe, type MaybeMatch, type MaybeOn } from "./maybe"

/**
 * A promise-based wrapper around {@link Maybe} with the same chainable API.
 * Created automatically by {@link Maybe.transform} or {@link Maybe.andThen}
 * when passed an async function — never instantiated directly by users.
 */
export class AsyncMaybe<T> {
  constructor(private readonly promise: Promise<Maybe<T>>) {}

  on(cases: MaybeOn<T>): AsyncMaybe<T> {
    return new AsyncMaybe(this.promise.then((maybe) => maybe.on(cases)))
  }

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

  filter(predicate: (value: T) => boolean): AsyncMaybe<T> {
    return new AsyncMaybe(this.promise.then((maybe) => maybe.filter(predicate)))
  }

  async match<U>(cases: MaybeMatch<T, U>): Promise<U> {
    return (await this.promise).match(cases)
  }

  async orDefault<U extends T>(defaultValue: U): Promise<T> {
    return (await this.promise).orDefault(defaultValue)
  }

  async orNothing(): Promise<T | undefined> {
    return (await this.promise).orNothing()
  }

  async orThrow(error?: unknown): Promise<T> {
    return (await this.promise).orThrow(error)
  }

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
