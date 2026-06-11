"use client";

import { useMemo, useRef, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type LayerProps,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification } from "mapbox-gl";
import type { FeatureCollection, Point } from "geojson";
import { MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthorityIssueDetailPanel } from "./authority-issue-detail-panel";
import { categoryLabel, statusLabel } from "@/lib/utils";
import { PRIORITY_COLORS, PRIORITY_ORDER } from "@/lib/issue-colors";
import type { Category, Department, IssueStatus, Priority } from "@/generated/prisma/client";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from "@/lib/mapbox";

const NEPAL_CENTER = { latitude: 28.3949, longitude: 84.124, zoom: 6 };
const LAYER_ID = "authority-issue-pennants";

// Lets cards rendered inside the left panel (passed as `children`) open the
// floating right-side detail panel instead of navigating to the full page.
const SelectIssueContext = createContext<((id: string) => void) | null>(null);
export function useSelectIssue() {
  return useContext(SelectIssueContext);
}

export type AuthorityMapIssue = {
  id: string;
  title: string;
  category: Category;
  status: IssueStatus;
  priority: Priority;
  reportCount: number;
  communityImpactScore: number;
  affectedCitizenCount: number;
  wardNumber: number | null;
  municipalityName: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  dueDate: Date | string | null;
};

export type MapStat = { label: string; value: number; alert?: boolean };

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

/**
 * Draws a pennant-on-pole marker (echo of the brand's double-pennant mark).
 * The pole base is the anchor point — the exact issue location.
 */
function makePennantImage(color: string): ImageData {
  const w = 56;
  const h = 72;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.lineJoin = "round";

  // pole
  ctx.strokeStyle = "#22304a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(12, 6);
  ctx.lineTo(12, 68);
  ctx.stroke();

  // pennants — white outline for legibility on any basemap
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(46, 15);
  ctx.lineTo(14, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, 22);
  ctx.lineTo(52, 33);
  ctx.lineTo(14, 44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  return ctx.getImageData(0, 0, w, h);
}

function ensurePennantImages(map: mapboxgl.Map) {
  for (const priority of PRIORITY_ORDER) {
    const id = `pennant-${priority}`;
    if (!map.hasImage(id)) {
      map.addImage(id, makePennantImage(PRIORITY_COLORS[priority]), {
        pixelRatio: 2,
      });
    }
  }
}

const iconSize: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "score"],
  0, 0.72,
  1, 1.2,
];

const pennantLayer: LayerProps = {
  id: LAYER_ID,
  type: "symbol",
  layout: {
    "icon-image": ["concat", "pennant-", ["get", "priority"]],
    "icon-size": iconSize,
    "icon-anchor": "bottom-left",
    "icon-offset": [-12, 0],
    "icon-allow-overlap": true,
  },
};

// Map-first authority workspace: a full-viewport map with a floating left panel
// (header, stats, filter, results list, and insight panels passed as children)
// and a detail card on selection — Google-Maps / Uber style.
export function AuthorityIssueMap({
  issues,
  isHead,
  sectionDept = null,
  currentUserId,
  headerTitle,
  headerSubtitle,
  stats,
  children,
}: {
  issues: AuthorityMapIssue[];
  isHead: boolean;
  sectionDept?: Department | null;
  currentUserId?: string;
  headerTitle: string;
  headerSubtitle: string;
  stats: MapStat[];
  children?: ReactNode;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ lng: number; lat: number; title: string; status: IssueStatus } | null>(null);
  const [cursor, setCursor] = useState("");

  const valid = useMemo(
    () => issues.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)),
    [issues]
  );
  const filtered = useMemo(
    () => (statusFilter === "ALL" ? valid : valid.filter((i) => i.status === statusFilter)),
    [valid, statusFilter]
  );

  const center = useMemo(() => {
    if (valid.length === 0) return NEPAL_CENTER;
    const lat = valid.reduce((s, i) => s + i.latitude, 0) / valid.length;
    const lng = valid.reduce((s, i) => s + i.longitude, 0) / valid.length;
    return { latitude: lat, longitude: lng, zoom: 12 };
  }, [valid]);

  const selected = selectedId ? valid.find((i) => i.id === selectedId) ?? null : null;

  const selectIssue = useCallback(
    (id: string) => {
      setSelectedId(id);
      const issue = valid.find((i) => i.id === id);
      if (issue) {
        mapRef.current?.flyTo({ center: [issue.longitude, issue.latitude], zoom: 15, duration: 800 });
      }
    },
    [valid]
  );

  const geojson: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: filtered.map((i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [i.longitude, i.latitude] },
      properties: { id: i.id, priority: i.priority, score: i.communityImpactScore, title: i.title, status: i.status },
    })),
  };

  return (
    <SelectIssueContext.Provider value={selectIssue}>
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* Map canvas (or fallback) */}
      {MAPBOX_ACCESS_TOKEN ? (
        <Map
          ref={mapRef}
          initialViewState={center}
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={MAPBOX_STYLE_URL}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          interactiveLayerIds={[LAYER_ID]}
          cursor={cursor}
          onLoad={(e) => {
            const map = e.target;
            map.resize();
            ensurePennantImages(map);
            map.on("styleimagemissing", () => ensurePennantImages(map));
          }}
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
        >
          <NavigationControl position="top-right" />
          <Source id="authority-issues" type="geojson" data={geojson}>
            <Layer {...pennantLayer} />
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
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-muted/30 text-center">
          <div className="space-y-1">
            <MapPin className="mx-auto size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN. Use the list on the left.
            </p>
          </div>
        </div>
      )}

      {/* Floating left panel */}
      <aside className="absolute bottom-3 left-3 top-3 z-30 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-nilo/15 bg-background/95 shadow-xl backdrop-blur">
        {/* Nilo header band */}
        <div className="bg-nilo px-4 pb-4 pt-4 text-white">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {headerTitle}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65">
            <Building2 className="size-3.5 shrink-0" />
            {headerSubtitle}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className={cn(
                  "rounded-lg bg-white/10 px-2.5 py-2",
                  s.alert && s.value > 0 && "bg-simrik/90"
                )}
              >
                <p className="font-heading text-xl font-semibold leading-none tabular-nums">
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] leading-tight text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-simrik text-white"
                  : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {children && <div className="space-y-6 border-b border-border p-4">{children}</div>}

          {/* Results list */}
          <div className="p-2">
            {filtered.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No issues match this filter.</p>
            ) : (
              <ul>
                {filtered.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => selectIssue(i.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60",
                        selectedId === i.id && "bg-accent"
                      )}
                    >
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PRIORITY_COLORS[i.priority] }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{i.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {i.wardNumber ? `Ward ${i.wardNumber} · ` : ""}
                          {categoryLabel(i.category)} · {statusLabel(i.status)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Priority legend (bottom center) */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background/90 px-4 py-1.5 shadow-sm backdrop-blur md:flex">
        {PRIORITY_ORDER.map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[p] }}
            />
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </span>
        ))}
      </div>

      {/* Selected issue detail — floating right-side panel (in place, no navigation) */}
      {selectedId && (
        <AuthorityIssueDetailPanel
          issueId={selectedId}
          revision={selected ? String(selected.updatedAt) : selectedId}
          isHead={isHead}
          sectionDept={sectionDept}
          currentUserId={currentUserId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
    </SelectIssueContext.Provider>
  );
}
