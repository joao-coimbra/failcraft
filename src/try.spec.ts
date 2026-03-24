import { describe, expect, test } from "bun:test"
import { tryAsync, trySync } from "./try"

describe("trySync()", () => {
  describe("when fn succeeds", () => {
    const result = trySync(() => JSON.parse('{"ok":true}'))

    test("should return a right", () => {
      expect(result.isRight()).toBe(true)
    })

    test("should hold the return value", () => {
      expect(result.value).toEqual({ ok: true })
    })
  })

  describe("when fn throws", () => {
    const result = trySync(() => JSON.parse("invalid json"))

    test("should return a left", () => {
      expect(result.isLeft()).toBe(true)
    })

    test("should hold the thrown error", () => {
      expect(result.value).toBeInstanceOf(SyntaxError)
    })
  })
})

describe("tryAsync()", () => {
  describe("when fn resolves", () => {
    test("should return an AsyncEither resolving to right", async () => {
      const either = await tryAsync(() => Promise.resolve(42)).toPromise()
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(42)
    })
  })

  describe("when fn rejects", () => {
    test("should return an AsyncEither resolving to left", async () => {
      const error = new Error("fetch failed")
      const either = await tryAsync(() => Promise.reject(error)).toPromise()
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe(error)
    })
  })
})
