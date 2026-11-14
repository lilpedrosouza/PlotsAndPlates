"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPin } from "@pap/shared";
import { formatRating } from "@pap/shared";
import { LocateFixed, X } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { tiltFor } from "@/lib/plates/format";
import { cn } from "@/lib/utils";
import { DEFAULT_CENTER, MAP_STYLE_URL, collapseAttribution, prepareMapLibre, tintMap } from "./map-style";

const SOURCE = "pins";

type PointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string>;
};
type PointCollection = { type: "FeatureCollection"; features: PointFeature[] };
const FONT = ["Noto Sans Bold"];

function toGeoJson(pins: MapPin[]): PointCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
      properties: { id: pin.id, status: pin.status, label: pin.myOverall === null ? "" : formatRating(pin.myOverall) },
    })),
  };
}

/**
 * Mapa do caderno. Os pins são camadas desenhadas pela GPU (não elementos do
 * DOM), então centenas de restaurantes continuam leves: "fomos" é um carimbo
 * cheio com a nota, "quero ir" é um anel vazado; perto uns dos outros viram
 * um carimbo com a contagem.
 */
export default function PlatesMap({ pins }: { pins: MapPin[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [locating, setLocating] = useState(false);
  const byId = useRef(new Map<string, MapPin>());
  const [initialPins] = useState(pins);

  useEffect(() => {
    byId.current = new Map(pins.map((pin) => [pin.id, pin]));
    const source = map.current?.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData(toGeoJson(pins));
  }, [pins]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    prepareMapLibre();
    const css = getComputedStyle(element);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const brand = color("--pap-accent");
    const onBrand = color("--pap-on-accent");
    const second = color("--pap-second");
    const surface = color("--pap-surface");

    const instance = new maplibregl.Map({
      container: element,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
    });
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    instance.on("style.load", () => {
      tintMap(instance, element);
      instance.addSource(SOURCE, {
        type: "geojson",
        data: toGeoJson(initialPins),
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 15,
      });
      instance.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": surface,
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 30, 26],
          "circle-stroke-color": brand,
          "circle-stroke-width": 2.5,
        },
      });
      instance.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE,
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": FONT, "text-size": 14 },
        paint: { "text-color": brand },
      });
      instance.addLayer({
        id: "pins-fomos",
        type: "circle",
        source: SOURCE,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "status"], "fomos"]],
        paint: { "circle-color": brand, "circle-radius": 15, "circle-stroke-color": surface, "circle-stroke-width": 2 },
      });
      instance.addLayer({
        id: "pins-fomos-label",
        type: "symbol",
        source: SOURCE,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "status"], "fomos"]],
        layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 11, "text-allow-overlap": true },
        paint: { "text-color": onBrand },
      });
      instance.addLayer({
        id: "pins-quero-ir",
        type: "circle",
        source: SOURCE,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "status"], "quero-ir"]],
        paint: { "circle-color": surface, "circle-radius": 11, "circle-stroke-color": second, "circle-stroke-width": 3.5 },
      });

      if (initialPins.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const pin of initialPins) bounds.extend([pin.lng, pin.lat]);
        instance.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 });
      }
    });
    instance.once("load", () => collapseAttribution(element));

    instance.on("click", "clusters", async (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id as number | undefined;
      if (!feature || clusterId === undefined) return;
      const source = instance.getSource(SOURCE) as maplibregl.GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      instance.easeTo({ center: (feature.geometry as unknown as PointFeature["geometry"]).coordinates, zoom });
    });
    for (const layer of ["pins-fomos", "pins-quero-ir"]) {
      instance.on("click", layer, (event) => {
        const id = event.features?.[0]?.properties?.id as string | undefined;
        const pin = id ? byId.current.get(id) : undefined;
        if (pin) setSelected(pin);
      });
      instance.on("mouseenter", layer, () => {
        instance.getCanvas().style.cursor = "pointer";
      });
      instance.on("mouseleave", layer, () => {
        instance.getCanvas().style.cursor = "";
      });
    }
    instance.on("mouseenter", "clusters", () => {
      instance.getCanvas().style.cursor = "pointer";
    });
    instance.on("mouseleave", "clusters", () => {
      instance.getCanvas().style.cursor = "";
    });

    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
  }, [initialPins]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        map.current?.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 14 });
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  return (
    <div className="absolute inset-0">
      {/* O CSS do MapLibre força position: relative no contêiner; a altura vem do size-full. */}
      <div ref={container} className="pap-map size-full overflow-hidden rounded-md border border-rule-strong" />
      <button
        type="button"
        onClick={locate}
        aria-label="Perto de mim"
        className={cn(
          "absolute top-3 left-3 inline-flex h-11 items-center gap-2 rounded-md border border-rule-strong bg-surface px-3.5 text-sm font-semibold shadow-lift transition-colors duration-fast hover:bg-sunken",
          locating && "opacity-70",
        )}
      >
        <LocateFixed aria-hidden className="size-4" />
        Perto de mim
      </button>

      {selected ? (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-md border border-rule-strong bg-surface p-3 shadow-lift">
          <Stamp value={selected.myOverall} caption={selected.status === "fomos" ? "você" : "quero ir"} size="sm" tilt={tiltFor(selected.id)} />
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-lg leading-tight">{selected.name}</p>
            <p className="font-micro mt-0.5 text-[0.6875rem] text-soft">{selected.status === "fomos" ? "Fomos" : "Quero ir"}</p>
          </div>
          <Link href={`/plates/r/${selected.id}`} className={buttonVariants({ size: "sm" })}>
            Abrir
          </Link>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setSelected(null)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-soft hover:bg-sunken hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
