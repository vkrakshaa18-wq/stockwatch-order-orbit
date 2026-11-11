import { describe, expect, it } from "vitest";
import { orderTotal, stockStatus } from "./stock";

describe("stock rules", () => {
  it("zero quantity is out of stock", () => expect(stockStatus(0, 10)).toBe("out_of_stock"));
  it("at or below threshold is low stock", () => expect(stockStatus(10, 10)).toBe("low_stock"));
  it("above threshold is in stock", () => expect(stockStatus(11, 10)).toBe("in_stock"));
  it("order total sums quantity x price", () =>
    expect(orderTotal([{ quantity: 2, price: 150.5 }, { quantity: 3, price: 10 }])).toBe(331));
});
