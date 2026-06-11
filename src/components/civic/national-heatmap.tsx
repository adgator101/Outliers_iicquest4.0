"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type LayerProps,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification } from "mapbox-gl";
import { MapPin } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import { statusLabel } from "@/lib/utils";
import { PRIORITY_COLORS, PRIORITY_ORDER } from "@/lib/issue-colors";
import type { IssueStatus, Priority } from "@/generated/prisma/client";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from "@/lib/mapbox";

// Center of Nepal
const NEPAL_CENTER = { latitude: 28.3949, longitude: 84.124, zoom: 6 };
const LAYER_ID = "issue-circles";

export type HeatmapIssue = {
  id: string;
  latitude: number;
  longitude: number;
  priority: Priority;
  communityImpactScore: number;
  title: string;
  status: IssueStatus;
  municipalityName: string | null;
};

const circleColor: ExpressionSpecification = [
  "match",
  ["get", "priority"],
  ...PRIORITY_ORDER.flatMap((p) => [p, PRIORITY_COLORS[p]]),
  "#64748b",
] as ExpressionSpecification;

// communityImpactScore (0–1) → radius 6px–20px
const circleRadius: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "score"],
  0,
  6,
  1,
  20,
];

const circleLayer: LayerProps = {
  id: LAYER_ID,
  type: "circle",
  paint: {
    "circle-color": circleColor,
    "circle-radius": circleRadius,
    "circle-opacity": 0.75,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
  },
};

type HoverInfo = {
  longitude: number;
  latitude: number;
  title: string;
  municipalityName: string | null;
  status: IssueStatus;
};

export function NationalHeatmap({ issues }: { issues: HeatmapIssue[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [cursor, setCursor] = useState<string>("");

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
        <MapPin className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN to enable.
        </p>
      </div>
    );
  }

  const valid = issues.filter(
    (i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)
  );

  const geojson: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: valid.map((i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [i.longitude, i.latitude] },
      properties: {
        id: i.id,
        priority: i.priority,
        score: i.communityImpactScore,
        title: i.title,
        status: i.status,
        municipalityName: i.municipalityName,
      },
    })),
  };

  return (
    <div className="space-y-3">
      <div className="h-[620px] w-full overflow-hidden rounded-lg border">
        <Map
          initialViewState={NEPAL_CENTER}
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={MAPBOX_STYLE_URL}
          style={{ width: "100%", height: "100%" }}
          interactiveLayerIds={[LAYER_ID]}
          cursor={cursor}
          onMouseMove={(e) => {
            const feature = e.features?.[0];
            if (feature) {
              const p = feature.properties ?? {};
              setHover({
                longitude: e.lngLat.lng,
                latitude: e.lngLat.lat,
                title: p.title,
                municipalityName: p.municipalityName ?? null,
                status: p.status,
              });
              setCursor("pointer");
            } else {
              setHover(null);
              setCursor("");
            }
          }}
          onMouseLeave={() => {
            setHover(null);
            setCursor("");
          }}
          onClick={(e) => {
            const feature = e.features?.[0];
            if (feature?.properties?.id) {
              router.push(`/executive/issues/${feature.properties.id}`);
            }
          }}
        >
          <NavigationControl position="top-right" />
          <Source id="issues" type="geojson" data={geojson}>
            <Layer {...circleLayer} />
          </Source>

          {hover && (
            <Popup
              longitude={hover.longitude}
              latitude={hover.latitude}
              anchor="bottom"
              offset={12}
              closeButton={false}
              closeOnClick={false}
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">{hover.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {hover.municipalityName ?? "Unknown"} · {statusLabel(hover.status)}
                </p>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Priority legend */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-medium text-muted-foreground">Priority</span>
        {PRIORITY_ORDER.map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[p] }}
            />
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">
          · circle size reflects community impact
        </span>
      </div>
    </div>
  );
}
