"use client";

import { useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  REGION_CENTROIDS,
  SRI_LANKA_CENTER,
  SRI_LANKA_ZOOM,
} from "@/lib/regions";

export type RegionGroup = {
  slug: string;
  name: string;
  count: number;
};

function subscribe(cb: () => void) {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
}
const isDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

function pinIcon(count: number, active: boolean) {
  return L.divIcon({
    className: "cd-pin-wrap",
    html: `<div class="cd-pin${active ? " cd-pin-active" : ""}"><span class="cd-pin-count">${count}</span></div>`,
    iconSize: active ? [38, 38] : [30, 30],
    iconAnchor: active ? [19, 38] : [15, 30],
  });
}

export default function MapCanvas({
  groups,
  selected,
  onSelect,
}: {
  groups: RegionGroup[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  // CARTO basemaps (no API key). Warmed/cooled via CSS filter in globals.
  const tileUrl = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      center={SRI_LANKA_CENTER}
      zoom={SRI_LANKA_ZOOM}
      scrollWheelZoom={false}
      className={`h-full w-full ${dark ? "cd-map-dark" : "cd-map-light"}`}
      style={{ background: "var(--linen)" }}
    >
      <TileLayer
        key={dark ? "dark" : "light"}
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {groups.map((g) => {
        const pos = REGION_CENTROIDS[g.slug];
        if (!pos) return null;
        return (
          <Marker
            key={g.slug}
            position={pos}
            icon={pinIcon(g.count, selected === g.slug)}
            eventHandlers={{ click: () => onSelect(g.slug) }}
          />
        );
      })}
    </MapContainer>
  );
}
