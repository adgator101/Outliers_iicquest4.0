"use client";

import { useState } from "react";
import Map, { Marker, NavigationControl, type MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from "@/lib/mapbox";
// Default center: Kathmandu
const DEFAULT_LAT = 27.7172;
const DEFAULT_LNG = 85.324;

export type LatLng = { latitude: number; longitude: number };

export function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const [viewState, setViewState] = useState({
    latitude: value?.latitude ?? DEFAULT_LAT,
    longitude: value?.longitude ?? DEFAULT_LNG,
    zoom: 13,
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const next = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      onChange(next);
      setViewState((v) => ({ ...v, ...next, zoom: 15 }));
    });
  }

  // ── Fallback: no Mapbox token → manual lat/lng inputs ──────────────────────
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          Map unavailable — enter coordinates manually.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={value?.latitude ?? ""}
              placeholder={String(DEFAULT_LAT)}
              onChange={(e) =>
                onChange({
                  latitude: Number(e.target.value),
                  longitude: value?.longitude ?? DEFAULT_LNG,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              value={value?.longitude ?? ""}
              placeholder={String(DEFAULT_LNG)}
              onChange={(e) =>
                onChange({
                  latitude: value?.latitude ?? DEFAULT_LAT,
                  longitude: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          <LocateFixed className="size-4" />
          Use my location
        </Button>
      </div>
    );
  }

  function handleMapClick(e: MapMouseEvent) {
    onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
  }

  return (
    <div className="space-y-2">
      <div className="h-64 w-full overflow-hidden rounded-lg border">
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={MAPBOX_STYLE_URL}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          {value && (
            <Marker
              latitude={value.latitude}
              longitude={value.longitude}
              draggable
              onDragEnd={(e) =>
                onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
              }
            >
              <MapPin className="size-7 fill-primary/20 text-primary" />
            </Marker>
          )}
        </Map>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {value
            ? `Selected: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
            : "Tap the map to drop a pin."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          <LocateFixed className="size-4" />
          Use my location
        </Button>
      </div>
    </div>
  );
}
