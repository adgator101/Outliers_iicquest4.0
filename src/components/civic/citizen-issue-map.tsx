"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type LayerProps,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification } from "mapbox-gl";
import type { FeatureCollection, Point } from "geojson";
import { MapPin, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueStatusBadge } from "./issue-status-badge";
import { PriorityBadge } from "./priority-badge";
import { CommunityImpactMeter } from "./community-impact-meter";
import { VerifyIssueButtons } from "./verify-issue-buttons";
import { categoryLabel, statusLabel } from "@/lib/utils";
import type { Category, IssueStatus, Priority } from "@/generated/prisma/client";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const NEPAL_CENTER = { latitude: 28.3949, longitude: 84.124, zoom: 6 };
const LAYER_ID = "citizen-issue-circles";

type CitizenMapIssue = {
  id: string;
  title: string;
  category: Category;
  status: IssueStatus;
  priority: Priority;
  latitude: number;
  longitude: number;
  wardNumber: number | null;
  communityImpactScore: number;
  affectedCitizenCount: number;
  confirmCount: number;
  disputeCount: number;
};

const circleColor: ExpressionSpecification = [
  "match",
  ["get", "priority"],
  "CRITICAL", "#dc2626",
  "HIGH", "#ea580c",
  "MEDIUM", "#ca8a04",
  "LOW", "#16a34a",
  "#64748b",
];

const circleLayer: LayerProps = {
  id: LAYER_ID,
  type: "circle",
  paint: {
    "circle-color": circleColor,
    "circle-radius": ["interpolate", ["linear"], ["get", "score"], 0, 7, 1, 20],
    "circle-opacity": 0.8,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
  },
};

export function CitizenIssueMap({
  municipality,
}: {
  ward: number | null;
  municipality: string | null;
}) {
  const [issues, setIssues] = useState<CitizenMapIssue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ lng: number; lat: number; title: string; status: IssueStatus } | null>(null);
  const [cursor, setCursor] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (municipality) params.set("municipality", municipality);
    fetch(`/api/issues?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { issues: [] }))
      .then((d) => setIssues(d.issues ?? []))
      .catch(() => setIssues([]));
  }, [municipality]);

  const valid = useMemo(
    () => issues.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)),
    [issues]
  );

  const center = useMemo(() => {
    if (valid.length === 0) return NEPAL_CENTER;
    const lat = valid.reduce((s, i) => s + i.latitude, 0) / valid.length;
    const lng = valid.reduce((s, i) => s + i.longitude, 0) / valid.length;
    return { latitude: lat, longitude: lng, zoom: 13 };
  }, [valid]);

  const selected = selectedId ? valid.find((i) => i.id === selectedId) ?? null : null;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <MapPin className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN. Use the list view.
        </p>
      </div>
    );
  }

  const geojson: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: valid.map((i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [i.longitude, i.latitude] },
      properties: { id: i.id, priority: i.priority, score: i.communityImpactScore, title: i.title, status: i.status },
    })),
  };

  return (
    <div className="relative h-[65vh] min-h-[420px] w-full overflow-hidden rounded-lg border">
      <Map
        initialViewState={center}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={[LAYER_ID]}
        cursor={cursor}
        onMouseMove={(e) => {
          const f = e.features?.[0];
          if (f) {
            const p = f.properties ?? {};
            setHover({ lng: e.lngLat.lng, lat: e.lngLat.lat, title: p.title, status: p.status });
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
          const f = e.features?.[0];
          if (f?.properties?.id) setSelectedId(f.properties.id as string);
          else setSelectedId(null);
        }}
        onLoad={(e) => e.target.resize()}
      >
        <NavigationControl position="top-right" />
        <Source id="citizen-issues" type="geojson" data={geojson}>
          <Layer {...circleLayer} />
        </Source>
        {hover && !selected && (
          <Popup longitude={hover.lng} latitude={hover.lat} anchor="bottom" offset={12} closeButton={false} closeOnClick={false}>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold">{hover.title}</p>
              <p className="text-[11px] text-muted-foreground">{statusLabel(hover.status)}</p>
            </div>
          </Popup>
        )}
      </Map>

      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-20 sm:inset-x-auto sm:right-3 sm:w-96">
          <div className="space-y-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <IssueStatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-1">
              <p className="font-medium leading-snug">{selected.title}</p>
              <p className="text-xs text-muted-foreground">
                {selected.wardNumber ? `Ward ${selected.wardNumber} · ` : ""}
                {categoryLabel(selected.category)}
              </p>
            </div>
            <CommunityImpactMeter score={selected.communityImpactScore} affectedCitizenCount={selected.affectedCitizenCount} />

            {/* Inline verification for SUBMITTED / VERIFIED / RESOLVED issues */}
            {(selected.status === "SUBMITTED" ||
              selected.status === "VERIFIED" ||
              selected.status === "RESOLVED") && (
              <VerifyIssueButtons
                issueId={selected.id}
                initialConfirmCount={selected.confirmCount}
                initialDisputeCount={selected.disputeCount}
                myVerification={null}
                issueStatus={selected.status}
              />
            )}

            <Button size="sm" variant="outline" render={<Link href={`/issues/${selected.id}`} />}>
              Open full issue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
