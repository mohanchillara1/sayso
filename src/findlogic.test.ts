import { describe, it, expect } from "vitest"
import { pickChoices, pickRound, judge, resultOf, summarise, shuffle, MAX_WRONG } from "./findlogic"

// Same "random" numbers every run.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const list = ["cup", "chair", "dog", "remote", "Maria", "keys"].map((text, i) => ({ id: i + 1, text }))

describe("pickChoices", () => {
  it("always includes the right card, and 4 cards when there are enough words", () => {
    for (let s = 1; s < 50; s++) {
      const c = pickChoices(list[2], list, 4, seeded(s))
      expect(c).toHaveLength(4)
      expect(c.filter((x) => x.id === 3)).toHaveLength(1)
    }
  })
  it("never repeats a card or shows another card with the same word", () => {
    const pool = [...list, { id: 99, text: "Cup " }] // same word, different item
    for (let s = 1; s < 50; s++) {
      const c = pickChoices(list[0], pool, 4, seeded(s))
      const texts = c.map((x) => x.text.trim().toLowerCase())
      expect(new Set(texts).size).toBe(c.length)
      expect(new Set(c.map((x) => x.id)).size).toBe(c.length)
    }
  })
  it("shows fewer cards when the list is short", () => {
    expect(pickChoices(list[0], list.slice(0, 2), 4, seeded(3))).toHaveLength(2)
    expect(pickChoices(list[0], [list[0]], 4, seeded(3))).toHaveLength(1)
  })
  it("puts the right card in different places", () => {
    const spots = new Set<number>()
    for (let s = 1; s < 60; s++) spots.add(pickChoices(list[0], list, 4, seeded(s)).findIndex((x) => x.id === 1))
    expect(spots.size).toBe(4)
  })
})

describe("pickRound", () => {
  it("gives exactly n words, repeating a short list, never the same word twice in a row", () => {
    for (let s = 1; s < 50; s++) {
      const r = pickRound(list.slice(0, 3), 10, seeded(s))
      expect(r).toHaveLength(10)
      for (let i = 1; i < r.length; i++) expect(r[i].id).not.toBe(r[i - 1].id)
    }
  })
  it("uses every word once before repeating", () => {
    const r = pickRound(list, 6, seeded(7))
    expect(new Set(r.map((x) => x.id)).size).toBe(6)
  })
  it("handles an empty list and a one-word list", () => {
    expect(pickRound([], 10)).toEqual([])
    expect(pickRound([list[0]], 3)).toHaveLength(3)
  })
})

describe("judge", () => {
  it("right card is right, any other card is wrong", () => {
    expect(judge(list[0], list[0])).toBe(true)
    expect(judge(list[1], list[0])).toBe(false)
  })
  it("a different item with the same word counts as right", () => {
    expect(judge({ id: 50, text: " CUP" }, list[0])).toBe(true)
  })
})

describe("results", () => {
  it("first tap, after a wrong tap, or shown", () => {
    expect(resultOf(0, true)).toBe("first")
    expect(resultOf(1, true)).toBe("later")
    expect(resultOf(MAX_WRONG, false)).toBe("shown")
  })
  it("summarise counts each kind", () => {
    expect(summarise(["first", "first", "later", "shown"])).toEqual({ first: 2, later: 1, shown: 1 })
  })
  it("shuffle keeps every item", () => {
    expect(shuffle([1, 2, 3, 4], seeded(5)).sort()).toEqual([1, 2, 3, 4])
  })
})
