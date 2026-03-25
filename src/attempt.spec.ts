import { describe, expect, test } from "bun:test"
import { AsyncEither } from "./async-either"
import { attempt } from "./attempt"
import { Left, Right } from "./either"

describe("attempt()", () => {
  describe("sync — success", () => {
    const result = attempt(() => JSON.parse('{"ok":true}'))

    test("should be a Right instance", () => {
      expect(result).toBeInstanceOf(Right)
    })

    test("isRight() should return true", () => {
      expect(result.isRight()).toBe(true)
    })

    test("value should hold the return value", () => {
      expect(result.value).toEqual({ ok: true })
    })
  })

  describe("sync — throws", () => {
    const result = attempt(() => JSON.parse("invalid"))

    test("should be a Left instance", () => {
      expect(result).toBeInstanceOf(Left)
    })

    test("isLeft() should return true", () => {
      expect(result.isLeft()).toBe(true)
    })

    test("value should hold the thrown error", () => {
      expect(result.value).toBeInstanceOf(SyntaxError)
    })
  })

  describe("sync — throws with mapError", () => {
    const result = attempt(
      () => JSON.parse("bad"),
      (err) => ({
        code: "PARSE_ERROR",
        message: err instanceof Error ? err.message : String(err),
      })
    )

    test("should be a Left instance", () => {
      expect(result).toBeInstanceOf(Left)
    })

    test("value should be the mapped error", () => {
      expect(result.value).toEqual({
        code: "PARSE_ERROR",
        message: expect.any(String),
      })
    })
  })

  describe("async fn — resolves", () => {
    const result = attempt(async () => 42)

    test("should be an AsyncEither instance", () => {
      expect(result).toBeInstanceOf(AsyncEither)
    })

    test("should resolve to a right with the value", async () => {
      expect(await result.orDefault(0)).toBe(42)
    })
  })

  describe("async fn — rejects", () => {
    const error = new Error("async failure")
    // biome-ignore lint/suspicious/useAwait: intentional — tests async rejection path
    const result = attempt(async () => {
      throw error
    })

    test("should resolve to a left with the error", async () => {
      const value = await result.match({ left: (e) => e, right: () => null })
      expect(value).toBe(error)
    })
  })

  describe("async fn — rejects with mapError", () => {
    const result = attempt(
      // biome-ignore lint/suspicious/useAwait: intentional — tests async rejection path
      async () => {
        throw new Error("db error")
      },
      (err) => ({
        code: "DB_ERROR",
        message: err instanceof Error ? err.message : String(err),
      })
    )

    test("should resolve to a left with the mapped error", async () => {
      const value = await result.match({ left: (e) => e, right: () => null })
      expect(value).toEqual({ code: "DB_ERROR", message: "db error" })
    })
  })

  describe("Promise-returning fn — resolves", () => {
    const result = attempt(() => Promise.resolve("hello"))

    test("should be an AsyncEither instance", () => {
      expect(result).toBeInstanceOf(AsyncEither)
    })

    test("should resolve to a right with the value", async () => {
      expect(await result.orDefault("")).toBe("hello")
    })
  })

  describe("Promise-returning fn — rejects", () => {
    const error = new Error("rejected")
    const result = attempt(() => Promise.reject(error))

    test("should resolve to a left with the error", async () => {
      const value = await result.match({ left: (e) => e, right: () => null })
      expect(value).toBe(error)
    })
  })
})
