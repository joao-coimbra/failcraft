/**
 * Handlers for both branches of an Either, each returning a value of type `T`.
 * Used by {@link BaseEither.match} to exhaustively handle left and right cases.
 */
export interface EitherMatch<L, R, T> {
  left: (value: L) => T
  right: (value: R) => T
}

/**
 * Optional side-effect handlers for an Either's branches.
 * Used by {@link BaseEither.on} to react to a value without transforming it.
 */
export type EitherOn<L, R> = Partial<EitherMatch<L, R, void>>

/**
 * Abstract base class shared by {@link Either} and {@link AsyncEither}.
 * Provides the common narrowing helpers (`isLeft`, `isRight`, `isError`, `isSuccess`),
 * the side-effect tap (`on`), and the exhaustive pattern-match (`match`).
 *
 * @typeParam L - The left (error) type.
 * @typeParam R - The right (success) type.
 */
export abstract class BaseEither<L, R> {
  abstract readonly value: L | R

  /** Returns `true` and narrows to `BaseLeft` when this is a left value. */
  abstract isLeft(): this is BaseLeft<L, R>

  /** Returns `true` and narrows to `BaseRight` when this is a right value. */
  abstract isRight(): this is BaseRight<R, L>

  /** Alias for {@link isLeft} — semantically signals an error path. */
  isError(): this is BaseLeft<L, R> {
    return this.isLeft()
  }

  /** Alias for {@link isRight} — semantically signals a success path. */
  isSuccess(): this is BaseRight<R, L> {
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
}

export abstract class BaseLeft<L, R = never> extends BaseEither<L, R> {
  constructor(readonly value: L) {
    super()
  }

  isLeft(): this is BaseLeft<L, R> {
    return true
  }

  isRight(): this is BaseRight<R, L> {
    return false
  }

  on(cases: EitherOn<L, R>): this {
    cases.left?.(this.value)
    return this
  }

  match<T>(cases: EitherMatch<L, R, T>): T {
    return cases.left(this.value)
  }
}

export abstract class BaseRight<R, L = never> extends BaseEither<L, R> {
  constructor(readonly value: R) {
    super()
  }

  isLeft(): this is BaseLeft<L, R> {
    return false
  }

  isRight(): this is BaseRight<R, L> {
    return true
  }

  on(cases: EitherOn<L, R>): this {
    cases.right?.(this.value)
    return this
  }

  match<T>(cases: EitherMatch<L, R, T>): T {
    return cases.right(this.value)
  }
}
