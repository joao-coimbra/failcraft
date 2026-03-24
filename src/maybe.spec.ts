import { describe, expect, mock, test } from "bun:test"
import { Just, just, type Maybe, maybe, Nothing, nothing } from "./maybe"

function toMaybe(hasValue: boolean): Maybe<number> {
  return hasValue ? just(10) : nothing()
}

describe("Maybe", () => {
  describe("when Just", () => {
    const result = toMaybe(true)

    test("should be a Just instance", () => {
      expect(result).toBeInstanceOf(Just)
    })
    test("isJust() should return true", () => {
      expect(result.isJust()).toBe(true)
    })
    test("isNothing() should return false", () => {
      expect(result.isNothing()).toBe(false)
    })
    test("value should hold the value", () => {
      expect(result.value).toBe(10)
    })
    test("on() should call the just handler", () => {
      const handler = mock()
      result.on({ just: handler })
      expect(handler).toHaveBeenCalledWith(10)
    })
    test("on() should not call the nothing handler", () => {
      const handler = mock()
      result.on({ nothing: handler })
      expect(handler).not.toHaveBeenCalled()
    })
    test("on() should return this", () => {
      expect(result.on({})).toBe(result)
    })
    test("match() should call the just branch", () => {
      const output = result.match({
        just: (v) => `value:${v}`,
        nothing: () => "nothing",
      })
      expect(output).toBe("value:10")
    })
    test("transform() should map the value", () => {
      const mapped = result.transform((n) => n * 2)
      expect(mapped.value).toBe(20)
      expect(mapped.isJust()).toBe(true)
    })
    test("transform() with async fn should return AsyncMaybe resolving to just", async () => {
      const asyncResult = await result.transform(async (n) => n * 2).toPromise()
      expect(asyncResult.isJust()).toBe(true)
      expect(asyncResult.value).toBe(20)
    })
    test("andThen() should chain to a new just", () => {
      const chained = result.andThen((n) => just(n + 5))
      expect(chained.value).toBe(15)
      expect(chained.isJust()).toBe(true)
    })
    test("andThen() should short-circuit to nothing when fn returns nothing", () => {
      const chained = result.andThen(() => nothing())
      expect(chained.isNothing()).toBe(true)
    })
    test("andThen() with async fn should return AsyncMaybe resolving to just", async () => {
      const asyncResult = await result
        .andThen(async (n) => just(n + 5))
        .toPromise()
      expect(asyncResult.isJust()).toBe(true)
      expect(asyncResult.value).toBe(15)
    })
    test("filter() should return just when predicate passes", () => {
      const filtered = result.filter((n) => n > 5)
      expect(filtered.isJust()).toBe(true)
      expect(filtered.value).toBe(10)
    })
    test("filter() should return nothing when predicate fails", () => {
      expect(result.filter((n) => n > 100).isNothing()).toBe(true)
    })
    test("orDefault() should return the value", () => {
      expect(result.orDefault(0)).toBe(10)
    })
    test("orNothing() should return the value", () => {
      expect(result.orNothing()).toBe(10)
    })
    test("orThrow() should return the value", () => {
      expect(result.orThrow(new Error("fail"))).toBe(10)
    })
    test("toEither() should return right with the value", () => {
      const either = result.toEither("missing")
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(10)
    })
  })

  describe("when Nothing", () => {
    const result = toMaybe(false)

    test("should be a Nothing instance", () => {
      expect(result).toBeInstanceOf(Nothing)
    })
    test("isJust() should return false", () => {
      expect(result.isJust()).toBe(false)
    })
    test("isNothing() should return true", () => {
      expect(result.isNothing()).toBe(true)
    })
    test("value should be undefined", () => {
      expect(result.value).toBeUndefined()
    })
    test("on() should call the nothing handler", () => {
      const handler = mock()
      result.on({ nothing: handler })
      expect(handler).toHaveBeenCalled()
    })
    test("on() should not call the just handler", () => {
      const handler = mock()
      result.on({ just: handler })
      expect(handler).not.toHaveBeenCalled()
    })
    test("on() should return this", () => {
      expect(result.on({})).toBe(result)
    })
    test("match() should call the nothing branch", () => {
      const output = result.match({
        just: (v) => `value:${v}`,
        nothing: () => "nothing",
      })
      expect(output).toBe("nothing")
    })
    test("transform() should not call fn and return nothing", () => {
      const fn = mock((n: number) => n * 2)
      const mapped = result.transform(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(mapped.isNothing()).toBe(true)
    })
    test("transform() with async fn should return AsyncMaybe resolving to nothing", async () => {
      const fn = mock(async (n: number) => n * 2)
      const asyncResult = await result.transform(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(asyncResult.isNothing()).toBe(true)
    })
    test("andThen() should not call fn and return nothing", () => {
      const fn = mock((n: number) => just(n + 5))
      const chained = result.andThen(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(chained.isNothing()).toBe(true)
    })
    test("andThen() with async fn should return AsyncMaybe resolving to nothing", async () => {
      const fn = mock(async (n: number) => just(n + 5))
      const asyncResult = await result.andThen(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(asyncResult.isNothing()).toBe(true)
    })
    test("filter() should return nothing regardless of predicate", () => {
      expect(result.filter(() => true).isNothing()).toBe(true)
    })
    test("orDefault() should return the default value", () => {
      expect(result.orDefault(99)).toBe(99)
    })
    test("orNothing() should return undefined", () => {
      expect(result.orNothing()).toBeUndefined()
    })
    test("orThrow() should throw the provided error", () => {
      expect(() => result.orThrow(new Error("missing"))).toThrow("missing")
    })
    test("toEither() should return left with the provided value", () => {
      const either = result.toEither("missing")
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("missing")
    })
  })

  describe("maybe() constructor", () => {
    test("maybe(10) should return just(10)", () => {
      const m = maybe(10)
      expect(m.isJust()).toBe(true)
      expect(m.value).toBe(10)
    })
    test("maybe(null) should return nothing()", () => {
      expect(maybe(null).isNothing()).toBe(true)
    })
    test("maybe(undefined) should return nothing()", () => {
      expect(maybe(undefined).isNothing()).toBe(true)
    })
    test("maybe(0) should return just(0) — falsy but valid", () => {
      const m = maybe(0)
      expect(m.isJust()).toBe(true)
      expect(m.value).toBe(0)
    })
    test("maybe('') should return just('') — falsy but valid", () => {
      const m = maybe("")
      expect(m.isJust()).toBe(true)
      expect(m.value).toBe("")
    })
  })
})
