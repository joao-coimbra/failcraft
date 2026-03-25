// Either

// AsyncEither — exported as type only; appears in inferred types when
// transform(async fn) or andThen(async fn) is called on Either.
// Use from() as the explicit entry-point when wrapping a Promise<Either>.
export type { AsyncEither } from "./async-either"
export { from } from "./async-either"
// AsyncMaybe — exported as type only; same pattern as AsyncEither.
export type { AsyncMaybe } from "./async-maybe"
export { attempt } from "./attempt"
export type { Either, Left, Right } from "./either"
export { left, right } from "./either"
// Maybe
export type { Just, Maybe, Nothing } from "./maybe"
export { just, maybe, nothing } from "./maybe"
// Result — semantic alias for Either with success-first params
export type { Result } from "./result"
export { err, ok } from "./result"
// Try helpers
export { tryAsync, trySync } from "./try"
