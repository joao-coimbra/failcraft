import { describe, expect, mock, test } from "bun:test"
import { just, type Maybe, nothing } from "./maybe"

function toMaybe(hasValue: boolean): Maybe<number> {
  return hasValue ? just(10) : nothing()
}

describe("AsyncMaybe", () => {
  describe("when Just", () => {
    const async$ = toMaybe(true).transform(async (n) => n)

    test("toPromise() should resolve to a just Maybe", async () => {
      const maybe = await async$.toPromise()
      expect(maybe.isJust()).toBe(true)
      expect(maybe.value).toBe(10)
    })
    test("on() should call the just handler", async () => {
      const handler = mock()
      await async$.on({ just: handler }).toPromise()
      expect(handler).toHaveBeenCalledWith(10)
    })
    test("on() should not call the nothing handler", async () => {
      const handler = mock()
      await async$.on({ nothing: handler }).toPromise()
      expect(handler).not.toHaveBeenCalled()
    })
    test("match() should resolve with the just branch result", async () => {
      const output = await async$.match({
        just: (v) => `value:${v}`,
        nothing: () => "nothing",
      })
      expect(output).toBe("value:10")
    })
    test("transform() with sync fn should map the value", async () => {
      const maybe = await async$.transform((n) => n * 2).toPromise()
      expect(maybe.isJust()).toBe(true)
      expect(maybe.value).toBe(20)
    })
    test("transform() with async fn should map the value asynchronously", async () => {
      const maybe = await async$.transform(async (n) => n * 3).toPromise()
      expect(maybe.isJust()).toBe(true)
      expect(maybe.value).toBe(30)
    })
    test("andThen() with sync fn should chain to a new just", async () => {
      const maybe = await async$.andThen((n) => just(n + 5)).toPromise()
      expect(maybe.isJust()).toBe(true)
      expect(maybe.value).toBe(15)
    })
    test("andThen() with async fn should chain to a new just", async () => {
      const maybe = await async$
        .andThen(async (n): Promise<Maybe<number>> => just(n + 5))
        .toPromise()
      expect(maybe.isJust()).toBe(true)
      expect(maybe.value).toBe(15)
    })
    test("filter() should return just when predicate passes", async () => {
      const maybe = await async$.filter((n) => n > 5).toPromise()
      expect(maybe.isJust()).toBe(true)
    })
    test("filter() should return nothing when predicate fails", async () => {
      const maybe = await async$.filter((n) => n > 100).toPromise()
      expect(maybe.isNothing()).toBe(true)
    })
    test("orDefault() should resolve to the value", async () => {
      expect(await async$.orDefault(0)).toBe(10)
    })
    test("orNothing() should resolve to the value", async () => {
      expect(await async$.orNothing()).toBe(10)
    })
    test("orThrow() should resolve to the value", async () => {
      expect(await async$.orThrow(new Error("fail"))).toBe(10)
    })
    test("toEither() should return an AsyncEither resolving to right", async () => {
      const either = await async$.toEither("missing").toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(10)
    })
  })

  describe("when Nothing", () => {
    const async$ = toMaybe(false).transform(async (n) => n)

    test("toPromise() should resolve to a nothing Maybe", async () => {
      const maybe = await async$.toPromise()
      expect(maybe.isNothing()).toBe(true)
    })
    test("on() should call the nothing handler", async () => {
      const handler = mock()
      await async$.on({ nothing: handler }).toPromise()
      expect(handler).toHaveBeenCalled()
    })
    test("on() should not call the just handler", async () => {
      const handler = mock()
      await async$.on({ just: handler }).toPromise()
      expect(handler).not.toHaveBeenCalled()
    })
    test("match() should resolve with the nothing branch result", async () => {
      const output = await async$.match({
        just: (v) => `value:${v}`,
        nothing: () => "nothing",
      })
      expect(output).toBe("nothing")
    })
    test("transform() with sync fn should not call fn", async () => {
      const fn = mock((n: number) => n * 2)
      const maybe = await async$.transform(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(maybe.isNothing()).toBe(true)
    })
    test("transform() with async fn should not call fn", async () => {
      const fn = mock(async (n: number) => n * 2)
      const maybe = await async$.transform(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(maybe.isNothing()).toBe(true)
    })
    test("andThen() should not call fn and pass nothing through", async () => {
      const fn = mock((n: number) => just(n + 5))
      const maybe = await async$.andThen(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(maybe.isNothing()).toBe(true)
    })
    test("andThen() with async fn should not call fn and pass nothing through", async () => {
      const fn = mock(async (n: number) => just(n + 5))
      const maybe = await async$.andThen(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(maybe.isNothing()).toBe(true)
    })
    test("filter() should return nothing regardless of predicate", async () => {
      const maybe = await async$.filter(() => true).toPromise()
      expect(maybe.isNothing()).toBe(true)
    })
    test("orDefault() should resolve to the default value", async () => {
      expect(await async$.orDefault(99)).toBe(99)
    })
    test("orNothing() should resolve to undefined", async () => {
      expect(await async$.orNothing()).toBeUndefined()
    })
    test("orThrow() should reject with the provided error", async () => {
      await expect(async$.orThrow(new Error("missing"))).rejects.toThrow(
        "missing"
      )
    })
    test("toEither() should return an AsyncEither resolving to left", async () => {
      const either = await async$.toEither("missing").toPromise()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("missing")
    })
  })
})
