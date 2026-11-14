"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER, MAP_STYLE_URL, collapseAttribution, prepareMapLibre, tintMap } from "./map-style";

type PinPickerProps = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  onChange: (point: { lat: number; lng: number }) => void;
};

/**
 * Mapinha do formulário: arraste o pin (ou toque no mapa) para marcar onde fica
 * o restaurante. Carregado só quando o formulário aparece.
 */
export default function PinPicker({ lat, lng, onChange }: PinPickerProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);

  const hasPoint = lat != null && lng != null;
  // Ponto inicial: o mapa é criado uma vez; mudanças depois são sincronizadas abaixo.
  const [start] = useState(() => (lat != null && lng != null ? { lat, lng } : null));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    prepareMapLibre();
    const instance = new maplibregl.Map({
      container: element,
      style: MAP_STYLE_URL,
      center: start ? [start.lng, start.lat] : DEFAULT_CENTER,
      zoom: start ? 16 : 11,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    instance.on("style.load", () => tintMap(instance, element));
    instance.once("load", () => collapseAttribution(element));

    const pin = document.createElement("div");
    pin.className = "pap-map-pin";
    pin.setAttribute("aria-hidden", "true");
    const dot = new maplibregl.Marker({ element: pin, draggable: true, anchor: "bottom" });
    if (start) dot.setLngLat([start.lng, start.lat]).addTo(instance);
    dot.on("dragend", () => {
      const point = dot.getLngLat();
      change.current({ lat: point.lat, lng: point.lng });
    });
    instance.on("click", (event) => {
      dot.setLngLat(event.lngLat).addTo(instance);
      change.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    map.current = instance;
    marker.current = dot;
    return () => {
      instance.remove();
      map.current = null;
    };
  }, [start]);

  // O ponto mudou de fora (ex.: veio do OpenStreetMap): move o pin e o mapa.
  useEffect(() => {
    if (!hasPoint || !map.current || !marker.current) return;
    const current = marker.current.getLngLat?.();
    if (current && Math.abs(current.lat - lat) < 1e-7 && Math.abs(current.lng - lng) < 1e-7) return;
    marker.current.setLngLat([lng, lat]).addTo(map.current);
    map.current.jumpTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 15) });
  }, [hasPoint, lat, lng]);

  return <div ref={container} className="pap-map h-56 w-full overflow-hidden rounded-md border border-rule-strong" />;
}
