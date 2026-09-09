/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSafeImageUrl } from './utils.ts';
import { convertAmount, formatCurrency } from './currencyUtils.ts';

if ((globalThis as any).Deno) {
  // @ts-ignore - Deno Std URL import
  const { assertEquals } = await import("https://deno.land/std@0.224.0/assert/mod.ts");

  (globalThis as any).Deno.test("getSafeImageUrl sanitizes unsafe URLs", () => {
    assertEquals(getSafeImageUrl("https://example.com/image.png"), "https://example.com/image.png");
    assertEquals(getSafeImageUrl("http://example.com/image.png"), "http://example.com/image.png");
    assertEquals(getSafeImageUrl("data:image/png;base64,iVBORw0KGgo"), "data:image/png;base64,iVBORw0KGgo");
    assertEquals(getSafeImageUrl("blob:http://example.com/blob-id"), "blob:http://example.com/blob-id");
    assertEquals(getSafeImageUrl("/icon.jpg"), "/icon.jpg");
    assertEquals(getSafeImageUrl("javascript:alert(1)"), "");
    assertEquals(getSafeImageUrl(undefined), "");
  });

  (globalThis as any).Deno.test("convertAmount converts currency correctly", () => {
    const rates = { USD: 1.0, YER: 250.0, SAR: 3.75 };
    assertEquals(convertAmount(100, "USD", "SAR", rates), 375);
    assertEquals(convertAmount(250, "YER", "USD", rates), 1.0);
    assertEquals(convertAmount(0, "USD", "SAR", rates), 0);
  });

  (globalThis as any).Deno.test("formatCurrency formats correctly", () => {
    const formatted = formatCurrency(1000, "SAR", { showSymbol: true });
    assertEquals(formatted.includes("1,000"), true);
  });
} else {
  const { describe, it, expect } = await import('vitest');

  describe("utils and currencyUtils tests", () => {
    it("getSafeImageUrl sanitizes unsafe URLs", () => {
      expect(getSafeImageUrl("https://example.com/image.png")).toBe("https://example.com/image.png");
      expect(getSafeImageUrl("http://example.com/image.png")).toBe("http://example.com/image.png");
      expect(getSafeImageUrl("data:image/png;base64,iVBORw0KGgo")).toBe("data:image/png;base64,iVBORw0KGgo");
      expect(getSafeImageUrl("blob:http://example.com/blob-id")).toBe("blob:http://example.com/blob-id");
      expect(getSafeImageUrl("/icon.jpg")).toBe("/icon.jpg");
      expect(getSafeImageUrl("javascript:alert(1)")).toBe("");
      expect(getSafeImageUrl(undefined)).toBe("");
    });

    it("convertAmount converts currency correctly", () => {
      const rates = { USD: 1.0, YER: 250.0, SAR: 3.75 };
      expect(convertAmount(100, "USD", "SAR", rates)).toBe(375);
      expect(convertAmount(250, "YER", "USD", rates)).toBe(1.0);
      expect(convertAmount(0, "USD", "SAR", rates)).toBe(0);
    });

    it("formatCurrency formats correctly", () => {
      const formatted = formatCurrency(1000, "SAR", { showSymbol: true });
      expect(formatted).toContain("1,000");
    });
  });
}
