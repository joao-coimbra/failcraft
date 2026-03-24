/**
 * Minimal stub — full implementation added in a later step.
 * @internal
 */

export interface Maybe<T> {
  readonly value: T | undefined
  isJust(): this is Just<T>
  isNothing(): this is Nothing<T>
}

export class Just<T> implements Maybe<T> {
  constructor(readonly value: T) {}
  isJust(): this is Just<T> {
    return true
  }
  isNothing(): this is Nothing<T> {
    return false
  }
}

export class Nothing<T = never> implements Maybe<T> {
  readonly value: undefined = undefined
  isJust(): this is Just<T> {
    return false
  }
  isNothing(): this is Nothing<T> {
    return true
  }
}

export const just = <T>(value: T): Maybe<T> => new Just(value)
export const nothing = <T = never>(): Maybe<T> => new Nothing<T>()
export const maybe = <T>(value: T | null | undefined): Maybe<NonNullable<T>> =>
  value == null ? nothing<NonNullable<T>>() : just(value as NonNullable<T>)
