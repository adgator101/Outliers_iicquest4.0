"use client";

import { useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function IssueLocationMap({
  latitude,
  longitude,
  address,
}: {
  latitude: number;
  longitude: number;
  address?: string | null;
}) {
  const [showPopup, setShowPopup] = useState(false);

  // ── Fallback: no Mapbox token → show text, never crash ─────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" />
        <span>{address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}</span>
      </div>
    );
  }

  return (
    <div className="h-48 w-full overflow-hidden rounded-lg border">
      <Map
        initialViewState={{ latitude, longitude, zoom: 15 }}
        interactive={false}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <Marker
          latitude={latitude}
          longitude={longitude}
          onClick={() => setShowPopup((s) => !s)}
        >
          <MapPin className="size-7 cursor-pointer fill-primary/20 text-primary" />
        </Marker>
        {showPopup && address && (
          <Popup
            latitude={latitude}
            longitude={longitude}
            anchor="bottom"
            offset={28}
            closeButton={false}
            onClose={() => setShowPopup(false)}
          >
            <span className="text-xs">{address}</span>
          </Popup>
        )}
      </Map>
    </div>
  );
}
