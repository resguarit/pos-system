import { describe, it, expect } from "vitest"
import { getRoleBadgeDisplay, isValidRoleColorHex } from "./roles-styles"

describe("isValidRoleColorHex", () => {
  it("accepts #RRGGBB", () => {
    expect(isValidRoleColorHex("#aabbcc")).toBe(true)
    expect(isValidRoleColorHex("#AABBCC")).toBe(true)
  })
  it("rejects invalid", () => {
    expect(isValidRoleColorHex("")).toBe(false)
    expect(isValidRoleColorHex("#abc")).toBe(false)
    expect(isValidRoleColorHex(null)).toBe(false)
  })
})

describe("getRoleBadgeDisplay", () => {
  it("uses custom color when valid hex", () => {
    const d = getRoleBadgeDisplay("vendedor", "#ff00aa")
    expect(d.useCustomColor).toBe(true)
    if (d.useCustomColor) {
      expect(d.custom.color).toBe("#ff00aa")
    }
  })
  it("falls back to name-based styles without hex", () => {
    const d = getRoleBadgeDisplay("vendedor", null)
    expect(d.useCustomColor).toBe(false)
    if (!d.useCustomColor) {
      expect(d.twText).toContain("text-")
    }
  })
})
