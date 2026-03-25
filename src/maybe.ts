import { AsyncMaybe } from "./async-maybe"
import { type Either, left, right } from "./either"

/**
 * Handlers for both branches of a Maybe, each returning a value of type `U`.
 */
export interface MaybeMatch<T, U> {
  just: (value: T) => U
  nothing: () => U
}

/**
 * Optional side-effect handlers for a Maybe's branches.
 */
export type MaybeOn<T> = Partial<MaybeMatch<T, void>>

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
export abstract class Maybe<T> {
  abstract readonly value: T | undefined

  abstract isJust(): this is Just<T>

  hasValue(): this is Just<T> {
    return this.isJust()
  }

  isNothing(): this is Nothing {
    return !this.isJust()
  }

  abstract on(cases: MaybeOn<T>): this

  abstract match<U>(cases: MaybeMatch<T, U>): U

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
  abstract orDefault(defaultValue: T): T
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

export class Just<T> extends Maybe<T> {
  constructor(readonly value: T) {
    super()
  }

  isJust(): this is Just<T> {
    return true
  }

  on(cases: MaybeOn<T>): this {
    cases.just?.(this.value)
    return this
  }

  match<U>(cases: MaybeMatch<T, U>): U {
    return cases.just(this.value)
  }

  transform<U>(fn: (value: T) => Promise<U>): AsyncMaybe<U>
  transform<U>(fn: (value: T) => U): Maybe<U>
  transform<U>(fn: (value: T) => U | Promise<U>): Maybe<U> | AsyncMaybe<U> {
    const result = fn(this.value)
    if (result instanceof Promise) {
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
      return new AsyncMaybe(result)
    }
    return result
  }

  filter(predicate: (value: T) => boolean): Maybe<T> {
    return predicate(this.value) ? this : nothing()
  }

  orDefault(_defaultValue: T): T {
    return this.value
  }

  orNothing(): T {
    return this.value
  }

  orThrow(_error?: unknown): T {
    return this.value
  }

  toEither<L>(_leftValue: L): Either<L, T> {
    return right(this.value)
  }
}

export class Nothing extends Maybe<never> {
  readonly value: undefined = undefined

  isJust(): this is Just<never> {
    return false
  }

  on(cases: MaybeOn<never>): this {
    cases.nothing?.()
    return this
  }

  match<U>(cases: MaybeMatch<never, U>): U {
    return cases.nothing()
  }

  transform<U>(fn: (value: never) => Promise<U>): AsyncMaybe<U>
  transform<U>(fn: (value: never) => U): Maybe<U>
  transform<U>(fn: (value: never) => U | Promise<U>): Maybe<U> | AsyncMaybe<U> {
    // Note: () => Promise.resolve(...) without async keyword is not detected here.
    // Use async () => ... for reliable async detection on Nothing.
    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
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
      return new AsyncMaybe(Promise.resolve(this as unknown as Maybe<U>))
    }
    return this as unknown as Maybe<U>
  }

  filter(_predicate: (value: never) => boolean): Maybe<never> {
    return this as unknown as Maybe<never>
  }

  orDefault(defaultValue: never): never {
    return defaultValue
  }

  orNothing(): undefined {
    return undefined
  }

  orThrow(error?: unknown): never {
    throw error
  }

  toEither<L>(leftValue: L): Either<L, never> {
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
