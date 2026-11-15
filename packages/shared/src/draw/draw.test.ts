import { describe, expect, it } from "vitest";
import { type DrawItem, filterPool, nextPick } from "./index";

const items: DrawItem[] = [
  { id: "a", addedByBoth: true, cuisines: ["italiana"], priceLevel: 2 },
  { id: "b", addedByBoth: false, cuisines: ["japonesa"], priceLevel: 4 },
  { id: "c", addedByBoth: true, titleKind: "filme", runtime: 85, onMyStreamings: true },
  { id: "d", addedByBoth: false, titleKind: "serie", runtime: 50, onMyStreamings: false },
  { id: "e", addedByBoth: false, titleKind: "filme", runtime: null },
];
const ids = (list: DrawItem[]) => list.map((item) => item.id);

describe("filterPool", () => {
  it("filtra por cozinha e preço", () => {
    expect(ids(filterPool(items, { cuisine: "italiana" }))).toEqual(["a"]);
    expect(ids(filterPool(items.slice(0, 2), { maxPrice: 2 }))).toEqual(["a"]);
  });

  it("filtra por tipo, duração e streaming", () => {
    expect(ids(filterPool(items, { kinds: ["filme"] }))).toEqual(["c", "e"]);
    expect(ids(filterPool(items.slice(2), { maxMinutes: 90 }))).toEqual(["c", "d"]);
    expect(ids(filterPool(items.slice(2), { onlyMyStreamings: true }))).toEqual(["c"]);
  });

  it("só o que os dois adicionaram", () => {
    expect(ids(filterPool(items, { onlyBoth: true }))).toEqual(["a", "c"]);
  });

  it("sem filtros devolve tudo", () => {
    expect(filterPool(items, {})).toHaveLength(5);
  });
});

describe("nextPick", () => {
  it("passa por todos sem repetir e, ao esgotar, não repete o último", () => {
    const pool = ["a", "b", "c"];
    let recent: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const pick = nextPick(pool, recent, () => 0);
      seen.push(pick.id);
      recent = pick.recent;
    }
    expect([...seen].sort()).toEqual(["a", "b", "c"]);
    const fourth = nextPick(pool, recent, () => 0.99);
    expect(fourth.id).not.toBe(seen[2]);
  });

  it("com um item só, devolve ele", () => {
    expect(nextPick(["x"], ["x"], () => 0.5).id).toBe("x");
  });
});
