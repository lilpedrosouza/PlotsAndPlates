import { type Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";

/** Estilo claro do OpenFreeMap (grátis, sem chave). As cores são tingidas de papel depois. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/**
 * O worker do MapLibre é copiado para public/ antes do dev e do build
 * (scripts/copy-map-worker.mjs): empacotado pelo Next, o caminho padrão não existe.
 */
export function prepareMapLibre() {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

/**
 * A atribuição começa recolhida no "i" (no celular, aberta ela cobre um quarto
 * do mapa). Continua a um toque de distância.
 */
export function collapseAttribution(element: Element) {
  element.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
}

/** Centro padrão quando ainda não há ponto: São Paulo. */
export const DEFAULT_CENTER: [number, number] = [-46.6333, -23.5505];

const token = (element: Element, name: string) => getComputedStyle(element).getPropertyValue(name).trim();

/**
 * Tinge o mapa com o papel do rótulo: fundo creme, água e parques nos tons do
 * mundo, rótulos na tinta café. Lê as cores dos tokens do elemento, então
 * acompanha o tema sem hex no componente.
 */
export function tintMap(map: MapLibreMap, element: Element) {
  const paper = token(element, "--pap-bg");
  const sheet = token(element, "--pap-surface");
  const sunken = token(element, "--pap-sunken");
  const ink = token(element, "--pap-ink");
  const soft = token(element, "--pap-ink-soft");
  const rule = token(element, "--pap-rule");

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    try {
      if (layer.type === "background") map.setPaintProperty(id, "background-color", paper);
      else if (layer.type === "fill" && /water/.test(id)) map.setPaintProperty(id, "fill-color", sunken);
      else if (layer.type === "fill" && /park|wood|grass|landcover|landuse/.test(id)) map.setPaintProperty(id, "fill-opacity", 0.35);
      else if (layer.type === "fill" && /building/.test(id)) map.setPaintProperty(id, "fill-color", sheet);
      else if (layer.type === "line" && /road|street|highway|bridge|tunnel/.test(id)) map.setPaintProperty(id, "line-color", rule);
      else if (layer.type === "symbol") {
        map.setPaintProperty(id, "text-color", /road|street/.test(id) ? soft : ink);
        map.setPaintProperty(id, "text-halo-color", paper);
      }
    } catch {
      // Camada sem a propriedade: segue com a cor original.
    }
  }
}
