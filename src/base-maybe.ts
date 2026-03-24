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

/**
 * Abstract base class shared by {@link Maybe}.
 */
export abstract class BaseMaybe<T> {
  abstract readonly value: T | undefined
  abstract isJust(): this is BaseJust<T>
  abstract isNothing(): this is BaseNothing<T>
  abstract on(cases: MaybeOn<T>): this
  abstract match<U>(cases: MaybeMatch<T, U>): U
}

export abstract class BaseJust<T> extends BaseMaybe<T> {
  constructor(readonly value: T) {
    super()
  }
  isJust(): this is BaseJust<T> {
    return true
  }
  isNothing(): this is BaseNothing<T> {
    return false
  }
  on(cases: MaybeOn<T>): this {
    cases.just?.(this.value)
    return this
  }
  match<U>(cases: MaybeMatch<T, U>): U {
    return cases.just(this.value)
  }
}

export abstract class BaseNothing<T> extends BaseMaybe<T> {
  readonly value: undefined = undefined
  isJust(): this is BaseJust<T> {
    return false
  }
  isNothing(): this is BaseNothing<T> {
    return true
  }
  on(cases: MaybeOn<T>): this {
    cases.nothing?.()
    return this
  }
  match<U>(cases: MaybeMatch<T, U>): U {
    return cases.nothing()
  }
}
