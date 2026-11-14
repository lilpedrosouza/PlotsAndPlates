import { describe, expect, it } from "vitest";
import { logInputSchema } from "../plots";
import { todayIso, visitInputSchema } from "../plates";
import { inviteInputSchema, sideBySide } from "./index";

describe("convite", () => {
  it("aceita o @username com ou sem arroba e normaliza", () => {
    expect(inviteInputSchema.parse({ username: "@Bia" })).toEqual({ username: "bia" });
    expect(inviteInputSchema.parse({ username: "bia.lima" })).toEqual({ username: "bia.lima" });
  });

  it("recusa username inválido", () => {
    expect(inviteInputSchema.safeParse({ username: "b" }).success).toBe(false);
  });
});

describe("juntos", () => {
  it("visita e registro aceitam a marcação", () => {
    expect(visitInputSchema.parse({ visitedOn: todayIso(), together: true }).together).toBe(true);
    expect(logInputSchema.parse({ watchedOn: todayIso(), together: false }).together).toBe(false);
    expect(logInputSchema.parse({ watchedOn: todayIso() }).together).toBeUndefined();
  });
});

describe("sideBySide", () => {
  it("monta você, par e a média do casal", () => {
    expect(sideBySide(4, 4.5)).toEqual({ mine: 4, partner: 4.5, couple: 4.25 });
    expect(sideBySide(null, 3)).toEqual({ mine: null, partner: 3, couple: 3 });
    expect(sideBySide(null, null)).toEqual({ mine: null, partner: null, couple: null });
  });
});
