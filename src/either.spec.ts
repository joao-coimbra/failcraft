import { describe, expect, mock, test } from "bun:test"
import { type Either, Left, left, Right, right } from "./either"

function doSomething(shouldSuccess: boolean): Either<string, number> {
  if (shouldSuccess) {
    return right(10)
  }
  return left("error")
}

describe("Either", () => {
  describe("when success", () => {
    const result = doSomething(true)

    test("should be a Right instance", () => {
      expect(result).toBeInstanceOf(Right)
    })

    test("isRight() should return true", () => {
      expect(result.isRight()).toBe(true)
    })

    test("isLeft() should return false", () => {
      expect(result.isLeft()).toBe(false)
    })

    test("isSuccess() should return true", () => {
      expect(result.isSuccess()).toBe(true)
    })

    test("isError() should return false", () => {
      expect(result.isError()).toBe(false)
    })

    test("value should hold the success value", () => {
      expect(result.value).toBe(10)
    })

    test("on() should call the right handler", () => {
      const handler = mock()
      result.on({ right: handler })
      expect(handler).toHaveBeenCalledWith(10)
    })

    test("on() should not call the left handler", () => {
      const handler = mock()
      result.on({ left: handler })
      expect(handler).not.toHaveBeenCalled()
    })

    test("on() should return this", () => {
      expect(result.on({})).toBe(result)
    })

    test("match() should call the right branch", () => {
      const output = result.match({
        left: (v) => `error:${v}`,
        right: (v) => `ok:${v}`,
      })
      expect(output).toBe("ok:10")
    })

    test("transform() should map the value", () => {
      const mapped = result.transform((n) => n * 2)
      expect(mapped.value).toBe(20)
      expect(mapped.isRight()).toBe(true)
    })

    test("andThen() should chain to a new right", () => {
      const chained = result.andThen((n) => right(n + 5))
      expect(chained.value).toBe(15)
      expect(chained.isRight()).toBe(true)
    })

    test("andThen() should short-circuit to left when fn returns left", () => {
      const chained = result.andThen(() => left("chained error"))
      expect(chained.isLeft()).toBe(true)
      expect(chained.value).toBe("chained error")
    })

    test("orDefault() should return the right value", () => {
      expect(result.orDefault(0)).toBe(10)
    })

    test("getOrThrow() should return the right value", () => {
      expect(result.getOrThrow()).toBe(10)
    })

    test("getOrThrowWith() should return the right value", () => {
      expect(result.getOrThrowWith((e) => new Error(e))).toBe(10)
    })

    test("transform() with async fn should return AsyncEither resolving to right", async () => {
      const asyncResult = await result.transform(async (n) => n * 2).toPromise()
      expect(asyncResult.isRight()).toBe(true)
      expect(asyncResult.value).toBe(20)
    })

    test("andThen() with async fn should return AsyncEither resolving to right", async () => {
      const asyncResult = await result.andThen(async (n) => right(n + 5)).toPromise()
      expect(asyncResult.isRight()).toBe(true)
      expect(asyncResult.value).toBe(15)
    })

    test("toMaybe() should return just(value)", () => {
      const m = result.toMaybe()
      expect(m.isJust()).toBe(true)
      expect(m.value).toBe(10)
    })
  })

  describe("when failure", () => {
    const result = doSomething(false)

    test("should be a Left instance", () => {
      expect(result).toBeInstanceOf(Left)
    })

    test("isLeft() should return true", () => {
      expect(result.isLeft()).toBe(true)
    })

    test("isRight() should return false", () => {
      expect(result.isRight()).toBe(false)
    })

    test("isError() should return true", () => {
      expect(result.isError()).toBe(true)
    })

    test("isSuccess() should return false", () => {
      expect(result.isSuccess()).toBe(false)
    })

    test("value should hold the error value", () => {
      expect(result.value).toBe("error")
    })

    test("on() should call the left handler", () => {
      const handler = mock()
      result.on({ left: handler })
      expect(handler).toHaveBeenCalledWith("error")
    })

    test("on() should not call the right handler", () => {
      const handler = mock()
      result.on({ right: handler })
      expect(handler).not.toHaveBeenCalled()
    })

    test("on() should return this", () => {
      expect(result.on({})).toBe(result)
    })

    test("match() should call the left branch", () => {
      const output = result.match({
        left: (v) => `error:${v}`,
        right: (v) => `ok:${v}`,
      })
      expect(output).toBe("error:error")
    })

    test("transform() should not call fn and pass left through", () => {
      const fn = mock((n: number) => n * 2)
      const mapped = result.transform(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(mapped.isLeft()).toBe(true)
      expect(mapped.value).toBe("error")
    })

    test("andThen() should not call fn and pass left through", () => {
      const fn = mock((n: number) => right(n + 5))
      const chained = result.andThen(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(chained.isLeft()).toBe(true)
      expect(chained.value).toBe("error")
    })

    test("orDefault() should return the default value", () => {
      expect(result.orDefault(99)).toBe(99)
    })

    test("getOrThrow() should throw the left value", () => {
      expect(() => result.getOrThrow()).toThrow("error")
    })

    test("getOrThrowWith() should throw the result of fn", () => {
      expect(() =>
        result.getOrThrowWith((e) => new Error(`wrapped: ${e}`))
      ).toThrow("wrapped: error")
    })

    test("transform() with async fn should return AsyncEither resolving to the same left", async () => {
      const fn = mock(async (n: number) => n * 2)
      const asyncResult = await result.transform(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(asyncResult.isLeft()).toBe(true)
      expect(asyncResult.value).toBe("error")
    })

    test("andThen() with async fn should return AsyncEither resolving to the same left", async () => {
      const fn = mock(async (n: number) => right(n + 5))
      const asyncResult = await result.andThen(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(asyncResult.isLeft()).toBe(true)
      expect(asyncResult.value).toBe("error")
    })

    test("toMaybe() should return nothing()", () => {
      const m = result.toMaybe()
      expect(m.isNothing()).toBe(true)
    })
  })
})
