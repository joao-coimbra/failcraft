import { describe, expect, test } from "bun:test"
import { err, ok, type Result } from "./result"

describe("Result", () => {
  describe("ok()", () => {
    test("should create a right Either", () => {
      const r: Result<number, string> = ok(42)
      expect(r.isRight()).toBe(true)
      expect(r.value).toBe(42)
    })

    test("ok() result should compose with Either methods", () => {
      const r = ok<number, string>(10)
        .transform((n) => n * 2)
        .orDefault(0)
      expect(r).toBe(20)
    })

    test("transform() on ok() should return another Result", () => {
      const r = ok<number, string>(5).transform((n) => n + 1)
      expect(r.isRight()).toBe(true)
      expect(r.value).toBe(6)
    })
  })

  describe("err()", () => {
    test("should create a left Either", () => {
      const r: Result<number, string> = err("not found")
      expect(r.isLeft()).toBe(true)
      expect(r.value).toBe("not found")
    })

    test("err() should short-circuit transform", () => {
      const r = err<string, number>("oops").transform((n) => n * 2)
      expect(r.isLeft()).toBe(true)
      expect(r.value).toBe("oops")
    })
  })
})
