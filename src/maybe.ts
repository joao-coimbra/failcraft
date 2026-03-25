import type { AsyncMaybe } from "./async-maybe"
import { BaseJust, BaseMaybe, BaseNothing } from "./base-maybe"
import type { Either } from "./either"

export type { MaybeMatch, MaybeOn } from "./base-maybe"

// biome-ignore lint/suspicious/noEmptyBlockStatements: needed to obtain AsyncFunction constructor
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: unknown[]
) => unknown

function isAsyncFn(fn: (...args: unknown[]) => unknown): boolean {
  if (fn instanceof AsyncFunction) {
    return true
  }
  // Fallback for test mocks that wrap async functions
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
 * A synchronous discriminated union representing either a present value (`Just`)
 * or absence (`Nothing`).
 */
export abstract class Maybe<T> extends BaseMaybe<T> {
  /**
   * Maps the value through `fn`, leaving Nothing untouched.
   * Pass an async function to automatically get an {@link AsyncMaybe} back.
   */
  abstract transform<U>(fn: (value: T) => Promise<U>): AsyncMaybe<U>
  abstract transform<U>(fn: (value: T) => U): Maybe<U>

  /**
   * Chains a computation that itself returns a `Maybe`, flattening the result.
   * Pass an async function to automatically get an {@link AsyncMaybe} back.
   * Short-circuits on Nothing.
   */
  abstract andThen<U>(fn: (value: T) => Promise<Maybe<U>>): AsyncMaybe<U>
  abstract andThen<U>(fn: (value: T) => Maybe<U>): Maybe<U>

  /** Returns `just(value)` when predicate passes, `nothing()` when it fails. */
  abstract filter(predicate: (value: T) => boolean): Maybe<T>
  /** Returns the value if Just, otherwise returns `defaultValue`. */
  abstract orDefault<U extends T>(defaultValue: U): T
  /** Returns the value if Just, otherwise returns `undefined`. */
  abstract orNothing(): T | undefined
  /** Returns the value if Just, otherwise throws `error`. */
  abstract orThrow(error?: unknown): T
  /**
   * Converts this `Maybe` to an `Either`.
   * just(value) → right(value), nothing() → left(leftValue).
   */
  abstract toEither<L>(leftValue: L): Either<L, T>
}

export class Just<T> extends BaseJust<T> {
  declare readonly value: T

  transform<U>(fn: (value: T) => Promise<U>): AsyncMaybe<U>
  transform<U>(fn: (value: T) => U): Maybe<U>
  transform<U>(fn: (value: T) => U | Promise<U>): Maybe<U> | AsyncMaybe<U> {
    const result = fn(this.value)
    if (result instanceof Promise) {
      const { AsyncMaybe } = require("./async-maybe")
      return new AsyncMaybe(result.then((v: U) => just<U>(v)))
    }
    return just(result as U)
  }

  andThen<U>(fn: (value: T) => Promise<Maybe<U>>): AsyncMaybe<U>
  andThen<U>(fn: (value: T) => Maybe<U>): Maybe<U>
  andThen<U>(
    fn: (value: T) => Maybe<U> | Promise<Maybe<U>>
  ): Maybe<U> | AsyncMaybe<U> {
    const result = fn(this.value)
    if (result instanceof Promise) {
      const { AsyncMaybe } = require("./async-maybe")
      return new AsyncMaybe(result)
    }
    return result
  }

  filter(predicate: (value: T) => boolean): Maybe<T> {
    return predicate(this.value) ? this : nothing()
  }

  orDefault<U extends T>(_defaultValue: U): T {
    return this.value
  }

  orNothing(): T {
    return this.value
  }

  orThrow(_error?: unknown): T {
    return this.value
  }

  toEither<L>(_leftValue: L): Either<L, T> {
    const { right } = require("./either")
    return right(this.value)
  }
}

export class Nothing extends BaseNothing<never> {
  transform<U>(fn: (value: never) => Promise<U>): AsyncMaybe<U>
  transform<U>(fn: (value: never) => U): Maybe<U>
  transform<U>(fn: (value: never) => U | Promise<U>): Maybe<U> | AsyncMaybe<U> {
    // Note: () => Promise.resolve(...) without async keyword is not detected here.
    // Use async () => ... for reliable async detection on Nothing.
    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
      const { AsyncMaybe } = require("./async-maybe")
      return new AsyncMaybe(Promise.resolve(this as unknown as Maybe<U>))
    }
    return this as unknown as Maybe<U>
  }

  andThen<U>(fn: (value: never) => Promise<Maybe<U>>): AsyncMaybe<U>
  andThen<U>(fn: (value: never) => Maybe<U>): Maybe<U>
  andThen<U>(
    fn: (value: never) => Maybe<U> | Promise<Maybe<U>>
  ): Maybe<U> | AsyncMaybe<U> {
    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
      const { AsyncMaybe } = require("./async-maybe")
      return new AsyncMaybe(Promise.resolve(this as unknown as Maybe<U>))
    }
    return this as unknown as Maybe<U>
  }

  filter(_predicate: (value: never) => boolean): Maybe<never> {
    return this as unknown as Maybe<never>
  }

  orDefault<U extends never>(defaultValue: U): never {
    return defaultValue
  }

  orNothing(): undefined {
    return undefined
  }

  orThrow(error?: unknown): never {
    throw error
  }

  toEither<L>(leftValue: L): Either<L, never> {
    const { left } = require("./either")
    return left(leftValue)
  }
}

/** Creates a `Just` (present value) instance of `Maybe`. */
export const just = <T>(value: T): Just<T> => new Just(value)

/** Creates a `Nothing` (absent value) instance of `Maybe`. */
export const nothing = (): Nothing => new Nothing()

/**
 * Creates a `Maybe` from a nullable value.
 * Uses `!= null` check: `0`, `false`, and `""` correctly produce `just()`.
 *
 * @example
 * maybe(user.middleName) // Maybe<string>
 * maybe(0)               // just(0)
 * maybe(null)            // nothing()
 */
export const maybe = <T>(value?: T | null): Maybe<NonNullable<T>> =>
  value == null ? nothing() : just(value)
