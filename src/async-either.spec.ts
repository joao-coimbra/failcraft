import { describe, expect, mock, test } from "bun:test"
import { type Either, left, right } from "./either"
import { from } from "./from"

function doSomething(shouldSuccess: boolean): Either<string, number> {
  if (shouldSuccess) {
    return right(10)
  }
  return left("error")
}

describe("AsyncEither", () => {
  describe("when success", () => {
    const async$ = doSomething(true).transform(async (n) => n)

    test("toPromise() should resolve to a right Either", async () => {
      const either = await async$.toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(10)
    })

    test("on() should call the right handler", async () => {
      const handler = mock()
      await async$.on({ right: handler }).toPromise()
      expect(handler).toHaveBeenCalledWith(10)
    })

    test("on() should not call the left handler", async () => {
      const handler = mock()
      await async$.on({ left: handler }).toPromise()
      expect(handler).not.toHaveBeenCalled()
    })

    test("match() should resolve with the right branch result", async () => {
      const output = await async$.match({
        left: (v) => `error:${v}`,
        right: (v) => `ok:${v}`,
      })
      expect(output).toBe("ok:10")
    })

    test("transform() should map the right value", async () => {
      const either = await async$.transform((n) => n * 2).toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(20)
    })

    test("andThen() should chain to a new right", async () => {
      const either = await async$.andThen((n) => right(n + 5)).toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(15)
    })

    test("andThen() should short-circuit to left when fn returns left", async () => {
      const either = await async$
        .andThen(() => left("chained error"))
        .toPromise()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("chained error")
    })

    test("transform() with async fn should map the right value asynchronously", async () => {
      const either = await async$.transform(async (n) => n * 3).toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(30)
    })

    test("andThen() with async fn should chain an async Either-returning fn", async () => {
      const either = await async$
        .andThen(async (n): Promise<Either<string, number>> => right(n + 5))
        .toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(15)
    })

    test("orDefault() should resolve to the right value", async () => {
      expect(await async$.orDefault(0)).toBe(10)
    })

    test("getOrThrow() should resolve to the right value", async () => {
      expect(await async$.getOrThrow()).toBe(10)
    })

    test("getOrThrowWith() should resolve to the right value", async () => {
      expect(await async$.getOrThrowWith((e) => new Error(e))).toBe(10)
    })
  })

  describe("when failure", () => {
    const async$ = doSomething(false).transform(async (n) => n)

    test("toPromise() should resolve to a left Either", async () => {
      const either = await async$.toPromise()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("error")
    })

    test("on() should call the left handler", async () => {
      const handler = mock()
      await async$.on({ left: handler }).toPromise()
      expect(handler).toHaveBeenCalledWith("error")
    })

    test("on() should not call the right handler", async () => {
      const handler = mock()
      await async$.on({ right: handler }).toPromise()
      expect(handler).not.toHaveBeenCalled()
    })

    test("match() should resolve with the left branch result", async () => {
      const output = await async$.match({
        left: (v) => `error:${v}`,
        right: (v) => `ok:${v}`,
      })
      expect(output).toBe("error:error")
    })

    test("transform() should not call fn and pass left through", async () => {
      const fn = mock((n: number) => n * 2)
      const either = await async$.transform(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("error")
    })

    test("andThen() should not call fn and pass left through", async () => {
      const fn = mock((n: number) => right(n + 5))
      const either = await async$.andThen(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("error")
    })

    test("transform() with async fn should not call fn and pass left through", async () => {
      const fn = mock(async (n: number) => n * 2)
      const either = await async$.transform(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("error")
    })

    test("andThen() with async fn should not call fn and pass left through", async () => {
      const fn = mock(async (n: number) => right(n + 5))
      const either = await async$.andThen(fn).toPromise()
      expect(fn).not.toHaveBeenCalled()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("error")
    })

    test("orDefault() should resolve to the default value", async () => {
      expect(await async$.orDefault(99)).toBe(99)
    })

    test("getOrThrow() should reject with the left value", async () => {
      await expect(async$.getOrThrow()).rejects.toBe("error")
    })

    test("getOrThrowWith() should reject with the result of fn", async () => {
      await expect(
        async$.getOrThrowWith((e) => new Error(`wrapped: ${e}`))
      ).rejects.toThrow("wrapped: error")
    })
  })
})

describe("from()", () => {
  test("wraps a resolved right Promise<Either> into AsyncEither", async () => {
    const either = await from(
      Promise.resolve(right<number, string>(42))
    ).toPromise()
    expect(either.isRight()).toBe(true)
    expect(either.value).toBe(42)
  })

  test("wraps a resolved left Promise<Either> into AsyncEither", async () => {
    const either = await from(
      Promise.resolve(left<string, number>("oops"))
    ).toPromise()
    expect(either.isLeft()).toBe(true)
    expect(either.value).toBe("oops")
  })

  test("allows chaining transform after from()", async () => {
    const either = await from(Promise.resolve(right<number, string>(10)))
      .transform((n) => n * 2)
      .toPromise()
    expect(either.value).toBe(20)
  })
})
