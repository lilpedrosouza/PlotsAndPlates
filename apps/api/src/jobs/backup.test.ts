import { describe, expect, it } from "vitest";
import { backupFileName, backupsToDelete } from "./backup";

describe("backupFileName", () => {
  it("usa a data em ISO, ordenável alfabeticamente", () => {
    expect(backupFileName(new Date("2026-11-15T06:30:00.000Z"))).toBe("pap-2026-11-15T063000Z.dump");
  });
});

describe("backupsToDelete (mantém os 4 mais recentes)", () => {
  const weekly = [
    "pap-2026-10-11T063000Z.dump",
    "pap-2026-10-18T063000Z.dump",
    "pap-2026-10-25T063000Z.dump",
    "pap-2026-11-01T063000Z.dump",
    "pap-2026-11-08T063000Z.dump",
    "pap-2026-11-15T063000Z.dump",
  ];

  it("apaga os mais antigos além do quarto", () => {
    expect(backupsToDelete(weekly)).toEqual(["pap-2026-10-18T063000Z.dump", "pap-2026-10-11T063000Z.dump"]);
  });

  it("não depende da ordem em que o Storage lista os arquivos", () => {
    const shuffled = [weekly[3], weekly[0], weekly[5], weekly[2], weekly[4], weekly[1]] as string[];
    expect(backupsToDelete(shuffled).sort()).toEqual(["pap-2026-10-11T063000Z.dump", "pap-2026-10-18T063000Z.dump"]);
  });

  it("não apaga nada com 4 backups ou menos", () => {
    expect(backupsToDelete(weekly.slice(0, 4))).toEqual([]);
    expect(backupsToDelete([])).toEqual([]);
  });

  it("nunca toca em arquivos que não são backups do PAP", () => {
    const withOthers = [...weekly, "leia-me.txt", "outro.dump", ".emptyFolderPlaceholder"];
    const toDelete = backupsToDelete(withOthers);
    expect(toDelete).toHaveLength(2);
    expect(toDelete.every((name) => name.startsWith("pap-"))).toBe(true);
  });
});
