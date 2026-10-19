import { describe, expect, it } from "vitest";
import { paraCsv } from "@/lib/csv";

describe("paraCsv", () => {
  it("BOM, ponto e vírgula, vírgula decimal, CRLF", () => {
    expect(paraCsv(["a", "b"], [[1234.5, "Saúde"]])).toBe("﻿a;b\r\n1234,5;Saúde\r\n");
  });

  it("aspas quando o texto tem ; aspas ou quebra de linha", () => {
    expect(paraCsv(["x"], [['dito "assim"; e\noutro']])).toBe('﻿x\r\n"dito ""assim""; e\noutro"\r\n');
  });

  it("datas no horário de Brasília, booleanos e vazios", () => {
    expect(paraCsv(["d", "p", "n"], [[new Date("2025-04-08T17:00:00Z"), true, null]])).toBe(
      "﻿d;p;n\r\n2025-04-08 14:00;sim;\r\n",
    );
  });

  it("impede que texto vire fórmula na planilha", () => {
    expect(paraCsv(["e"], [["=HYPERLINK(1)"], ["-1"], ["normal"]])).toBe("﻿e\r\n'=HYPERLINK(1)\r\n'-1\r\nnormal\r\n");
  });
});
