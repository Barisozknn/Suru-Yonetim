import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store/useStore";
import type { Hayvan } from "../types";

const mockHayvanlar: Hayvan[] = [
  {
    id: "1",
    kupeNo: "TR-001",
    tur: "İnek",
    irk: "Holstein",
    cinsiyet: "Dişi",
    dogumTarihi: "2020-01-01",
    guncelAgirlikKg: 650,
    durum: "Aktif",
    grupId: null,
  },
  {
    id: "2",
    kupeNo: "TR-002",
    tur: "Dana",
    irk: "Simental",
    cinsiyet: "Erkek",
    dogumTarihi: "2023-05-10",
    guncelAgirlikKg: 200,
    durum: "Aktif",
    grupId: null,
  }
];

describe("useStore Filtreleme Mantığı", () => {
  beforeEach(() => {
    useStore.setState({ aramaMetni: "", turFiltresi: "Tümü", durumFiltresi: "Aktif" });
  });

  it("Kayıtları türüne göre filtreleyebilmelidir", () => {
    useStore.getState().setTurFiltresi("İnek");
    expect(useStore.getState().turFiltresi).toBe("İnek");
    
    const filtered = mockHayvanlar.filter((h) => {
      const matchTur = useStore.getState().turFiltresi !== "Tümü" ? h.tur === useStore.getState().turFiltresi : true;
      const matchDurum = useStore.getState().durumFiltresi ? h.durum === useStore.getState().durumFiltresi : true;
      return matchTur && matchDurum;
    });
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].kupeNo).toBe("TR-001");
  });

  it("Duruma göre filtreleyebilmelidir", () => {
    useStore.getState().setDurumFiltresi("Aktif");
    
    const filtered = mockHayvanlar.filter((h) => h.durum === useStore.getState().durumFiltresi);
    
    expect(filtered.length).toBe(2);
  });
});
