import { describe, expect, it } from "vitest";
import { canEdit, canView, countsForCommunity } from "./visibility";

const ana = { id: "ana", partnerId: "bia" };
const bia = { id: "bia", partnerId: "ana" };
const caio = { id: "caio", partnerId: null };

const publicByAna = { ownerId: "ana", isPrivate: false };
const privateByAna = { ownerId: "ana", isPrivate: true };

describe("canView", () => {
  it("o dono vê o que é seu, público ou privado", () => {
    expect(canView(ana, publicByAna)).toBe(true);
    expect(canView(ana, privateByAna)).toBe(true);
  });

  it("o par vê a avaliação privada", () => {
    expect(canView(bia, privateByAna)).toBe(true);
  });

  it("outros usuários veem só o que é público", () => {
    expect(canView(caio, publicByAna)).toBe(true);
    expect(canView(caio, privateByAna)).toBe(false);
  });

  it("quem não está logado não vê nada", () => {
    expect(canView(null, publicByAna)).toBe(false);
    expect(canView(null, privateByAna)).toBe(false);
  });

  it("um vínculo de casal de outra pessoa não dá acesso", () => {
    const dani = { id: "dani", partnerId: "caio" };
    expect(canView(dani, privateByAna)).toBe(false);
  });
});

describe("canEdit", () => {
  it("só o dono edita", () => {
    expect(canEdit(ana, publicByAna)).toBe(true);
    expect(canEdit(bia, publicByAna)).toBe(false);
    expect(canEdit(caio, publicByAna)).toBe(false);
    expect(canEdit(null, publicByAna)).toBe(false);
  });
});

describe("countsForCommunity", () => {
  it("conta avaliações públicas de outros usuários", () => {
    expect(countsForCommunity(caio, publicByAna)).toBe(true);
  });

  it("não conta avaliações privadas", () => {
    expect(countsForCommunity(caio, privateByAna)).toBe(false);
    expect(countsForCommunity(bia, privateByAna)).toBe(false);
  });

  it("não conta a própria avaliação nem a do par", () => {
    expect(countsForCommunity(ana, publicByAna)).toBe(false);
    expect(countsForCommunity(bia, publicByAna)).toBe(false);
  });
});
