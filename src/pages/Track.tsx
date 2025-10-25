// src/pages/Track.tsx — PROD (activation auto à 06:00 Europe/Zurich, maj tous les 50 m)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  MapPinned,
  Clock,
  Flag,
  Navigation,
  Heart,
  Share2,
  StopCircle,
  Maximize2,
  X,
  LocateFixed,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* ======================== LIVE CONFIG ======================== */
/** Live ON si on est après 06:00 (heure de Zurich) le jour courant */
const FORCE_LIVE = (import.meta as any).env?.VITE_FORCE_LIVE === "1";
const nowZurich = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
const liveIsOnNow = () => {
  const n = nowZurich();
  const s = new Date(n);
  s.setHours(6, 0, 0, 0); // 06:00
  return n >= s;
};

/* ======================== ENV / ADMIN ======================== */
const ADMIN_ID = ((import.meta as any).env?.VITE_LYAN_ID as string | undefined)?.trim();
const ADMIN_LABEL = "Lyan";

/* ======================== DISTANCES / INTERVALS (PROD) ======================== */
const DIST_TRAIL_APPEND_M = 20;    // adoucir le trait visuel
const DIST_BROADCAST_M    = 50;    // diffusion realtime
const DIST_DB_WRITE_M     = 50;    // écriture DB
const UPLOAD_MIN_INTERVAL_MS = 3000; // anti-spam DB

/* IMPORTANT: break long jumps so we don't draw a straight line over big gaps */
const GAP_BREAK_M = 30000; // si 2 points consécutifs sont distants de > 30 km, on coupe le trait (tu avais mis cette valeur)
 
/* ======================== ÉTAPES ======================== */
const ETAPES = [
  { ville: "Genève (Bains-des-Pâquis)", km: "0 km", heure: "07h00 (sam.)" },
  { ville: "Versoix", km: "10 km", heure: "09h00" },
  { ville: "Nyon", km: "25 km", heure: "12h00" },
  { ville: "Rolle", km: "40 km", heure: "15h00" },
  { ville: "Morges", km: "55 km", heure: "18h00" },
  { ville: "Lausanne (Ouchy)", km: "60 km", heure: "19h30" },
  { ville: "Lutry", km: "70 km", heure: "21h30" },
  { ville: "Vevey", km: "85 km", heure: "00h30 (dim.)" },
  { ville: "Montreux", km: "90 km", heure: "01h30" },
  { ville: "Villeneuve", km: "100 km", heure: "03h30" },
  { ville: "Saint-Gingolph (FR)", km: "115 km", heure: "06h30" },
  { ville: "Évian-les-Bains", km: "130 km", heure: "09h30" },
  { ville: "Thonon-les-Bains", km: "150 km", heure: "13h30" },
  { ville: "Hermance", km: "170 km", heure: "17h30" },
  { ville: "Genève (Arrivée officielle)", km: "180 km", heure: "19h00" },
];

/* ======================== ANIM ======================== */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay },
  viewport: { once: true, margin: "-80px" },
});

/* ======================== Marker icons génériques ======================== */
const defaultActiveIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});
const defaultInactiveIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

/* ======================== PIN Gaza – sobre / argenté ======================== */
export const makeGazaProPin = (label = "Lyan") =>
  L.divIcon({
    className: "gaza-pro-pin",
    iconSize: [84, 106],
    iconAnchor: [42, 102],
    html: `
    <div style="position:relative;width:84px;height:106px">
      <svg width="84" height="106" viewBox="0 0 84 106" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="core" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#ECEFF3"/>
          </radialGradient>
          <linearGradient id="ringGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity=".65"/>
            <stop offset="100%" stop-color="#D1D5DB" stop-opacity=".85"/>
          </linearGradient>
          <filter id="softDrop" x="-40%" y="-40%" width="180%">
            <feOffset dy="2"/>
            <feGaussianBlur stdDeviation="3"/>
            <feColorMatrix type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 .25 0"/>
            <feBlend in2="SourceGraphic" mode="normal"/>
          </filter>
        </defs>

        <ellipse cx="42" cy="98" rx="13.5" ry="5.5" fill="rgba(2,6,23,.18)"/>
        <path d="M42 70 C42 82 42 86 42 92"
              stroke="#C7CED9" stroke-width="2.2" stroke-linecap="round" fill="none"/>

        <circle cx="42" cy="36" r="20" fill="url(#ringGlass)" filter="url(#softDrop)" stroke="#E5E7EB"/>

        <circle cx="42" cy="36" r="17.5" fill="none" stroke="#E11D48" stroke-width="7.5"
                pathLength="100" stroke-dasharray="34 66" stroke-dashoffset="0"
                stroke-linecap="round" transform="rotate(-90 42 36)"/>
        <circle cx="42" cy="36" r="17.5" fill="none" stroke="#0F172A" stroke-width="7.5"
                pathLength="100" stroke-dasharray="33 67" stroke-dashoffset="34"
                stroke-linecap="round" transform="rotate(-90 42 36)"/>
        <circle cx="42" cy="36" r="17.5" fill="none" stroke="#16A34A" stroke-width="7.5"
                pathLength="100" stroke-dasharray="33 67" stroke-dashoffset="67"
                stroke-linecap="round" transform="rotate(-90 42 36)"/>

        <circle cx="42" cy="36" r="12.5" fill="url(#core)" stroke="#E5E7EB" stroke-width="1.5"/>

        <g transform="translate(26,56)">
          <rect width="32" height="18" rx="9"
                fill="rgba(255,255,255,.96)" stroke="#E5E7EB"/>
          <text x="16" y="12"
            font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto"
            font-size="11" font-weight="800" text-anchor="middle" fill="#0F172A">
            ${label}
          </text>
        </g>
      </svg>
    </div>
    `,
  });

/* ======================== Types / Utils ======================== */
type LocationRow = {
  user_id: string;
  lat: number;
  lng: number;
  is_active: boolean;
  updated_at: string;
  accuracy?: number | null;
  created_at?: string | null;
};

const haversine = (a: [number, number], b: [number, number]) => {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

/* Split a sequence of points into small segments when the gap is big */
function splitIntoSegments(
  points: [number, number][],
  gapMeters: number
): [number, number][][] {
  const segs: [number, number][][] = [];
  if (!points.length) return segs;

  let current: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = current[current.length - 1];
    const p = points[i];
    const d = haversine(prev, p);
    if (d > gapMeters) {
      if (current.length > 1) segs.push(current);
      current = [p];
    } else {
      current.push(p);
    }
  }
  if (current.length > 1) segs.push(current);
  return segs;
}

/* ======================== Focus helpers ======================== */
function FocusLyanButton({ lyanPos }: { lyanPos: [number, number] | null }) {
  const map = useMap();
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "10px",
        transform: "translateX(-50%)",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={() => lyanPos && map.flyTo(lyanPos, Math.max(17, map.getZoom()), { duration: 0.8 })}
        className="inline-flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur px-2.5 py-1.5 text-xs font-semibold text-slate-900 border border-gray-200 ring-1 ring-black/10 shadow hover:shadow-md sm:px-3 sm:py-2 sm:text-sm"
        aria-label="Centrer sur Lyan"
      >
        <LocateFixed className="h-4 w-4" />
        Centrer
      </button>
    </div>
  );
}

/** Auto-center once when Lyan’s position becomes available (also when fullscreen map mounts) */
function AutoCenter({ target, zoom = 16 }: { target: [number, number] | null; zoom?: number }) {
  const map = useMap();
  const did = useRef(false);
  useEffect(() => {
    if (!did.current && target) {
      map.flyTo(target, Math.max(17, zoom), { duration: 0.8 });
      did.current = true;
    }
  }, [target, zoom, map]);
  return null;
}

/* ======================== Error Boundary ======================== */
class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-white/80">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow">
            <p className="font-semibold text-gray-900 mb-2">La carte a rencontré un souci.</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-gray-900 px-4 py-2 text-white font-semibold"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

/* ======================== LiveMap ======================== */
function LiveMap({
  profiles,
  locations,
  trails,
  heightClass,
  lyanPos,
}: {
  profiles: any[];
  locations: LocationRow[];
  trails: Record<string, [number, number][]>;
  heightClass: string;
  lyanPos: [number, number] | null;
}) {
  return (
    <div className={`relative w-full ${heightClass}`}>
      <style>{`
        .leaflet-control-zoom a {
          background: linear-gradient(180deg,#FFFFFF 0%,#F1F5F9 100%);
          border: 1px solid rgba(17,24,39,.08);
          backdrop-filter: blur(6px);
          box-shadow: 0 10px 22px rgba(0,0,0,.08);
        }
        .leaflet-container {
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto;
        }
      `}</style>

      <MapContainer
        center={lyanPos || [46.21, 6.15]}
        zoom={16}
        minZoom={5}
        maxZoom={19}          // limite pour éviter 400 OSM
        zoomControl={true}
        attributionControl={false}
        className="absolute inset-0 rounded-2xl overflow-hidden shadow bg-[#eef1f5]"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          maxNativeZoom={19}
          updateWhenIdle
        />

        {/* Draw trails but break them on large gaps */}
        {Object.entries(trails).map(([uid, points]) => {
          const segments = splitIntoSegments(points, GAP_BREAK_M);
          const isAdmin = uid === ADMIN_ID;
          const opts = {
            color: isAdmin ? "#10B981" : "#94A3B8",
            weight: isAdmin ? 6 : 4,
            opacity: isAdmin ? 0.95 : 0.55,
            lineCap: "round" as const,
            lineJoin: "round" as const,
          };
          return segments.map((seg, i) => (
            <Polyline key={`trail-${uid}-${i}`} positions={seg} pathOptions={opts} />
          ));
        })}

        {locations.map((l) => {
          const profile = profiles.find((p) => p.id === l.user_id);
          const icon =
            l.user_id === ADMIN_ID
              ? (makeGazaProPin(ADMIN_LABEL) as any)
              : l.is_active
              ? defaultActiveIcon
              : defaultInactiveIcon;

          return (
            <Marker key={`${l.user_id}-${l.updated_at}`} position={[l.lat, l.lng]} icon={icon}>
              <Popup>
                <strong>{l.user_id === ADMIN_ID ? ADMIN_LABEL : profile?.full_name || "Marcheur"}</strong>
                <br />
                <span className={`flex items-center gap-1 ${l.is_active ? "text-green-600" : "text-red-600"}`}>
                  <span className={`w-2 h-2 rounded-full ${l.is_active ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  {l.is_active ? "En marche" : "Inactif"}
                </span>
                <div className="mt-1 text-xs text-gray-500">
                  Maj : {new Date(l.updated_at).toLocaleTimeString()}
                  {typeof l.accuracy === "number" ? ` • ±${Math.round(l.accuracy)} m` : ""}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Auto-focus on Lyan once loaded */}
        <AutoCenter target={lyanPos} zoom={16} />
        <FocusLyanButton lyanPos={lyanPos} />
      </MapContainer>
    </div>
  );
}

/* ======================== PAGE ======================== */
export default function Marche() {
  const [liveNow, setLiveNow] = useState(FORCE_LIVE || liveIsOnNow());

  // met à jour le statut LIVE au changement d’heure locale (Zurich)
  useEffect(() => {
    const t = setInterval(() => setLiveNow(FORCE_LIVE || liveIsOnNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const lastDbPointRef = useRef<Record<string, [number, number]>>({});
  const lastBroadcastRef = useRef<Record<string, [number, number]>>({});
  const TRAIL_MAX_POINTS = 5000;

  const [sharing, setSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUploadAtRef = useRef<number>(0);

  const [fullscreen, setFullscreen] = useState(false);

  const rtChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presencePointsRef = useRef<[number, number][]>([]);

  // Wake Lock pour garder l'écran éveillé pendant le partage
  const wakeRef = useRef<any>(null);
  async function enableWakeLock() {
    try {
      // @ts-ignore
      if (navigator.wakeLock) wakeRef.current = await navigator.wakeLock.request("screen");
    } catch {}
  }
  async function releaseWakeLock() {
    try {
      await wakeRef.current?.release();
    } catch {}
    wakeRef.current = null;
  }
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && sharing) enableWakeLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sharing]);

  /* Auth */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) =>
      setUserId(sess?.user?.id ?? null)
    );
    return () => sub?.subscription.unsubscribe();
  }, []);

  /* Realtime channel (broadcast + presence) */
  useEffect(() => {
    const ch = supabase.channel("lyan-track", {
      config: { presence: { key: "viewer-" + Math.random().toString(36).slice(2) } },
    });

    ch.on("broadcast", { event: "point" }, ({ payload }) => {
      const { user_id, lat, lng } = payload as { user_id: string; lat: number; lng: number };

      // ignore bad coordinates
      if ((lat === 0 && lng === 0) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

      setTrails((prev) => {
        const t = prev[user_id] || [];
        const p: [number, number] = [lat, lng];
        const last = t[t.length - 1];
        // append only if moved a bit (visual smoothing)
        if (!last || haversine(last, p) > DIST_TRAIL_APPEND_M) {
          return { ...prev, [user_id]: [...t, p].slice(-TRAIL_MAX_POINTS) };
        }
        return prev;
      });
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ user_id: string; points?: [number, number][] }>>;
      const all = Object.values(state).flat();
      const adminPresence = all.find((p) => p.user_id === ADMIN_ID);
      if (adminPresence?.points?.length) {
        setTrails((prev) => ({ ...prev, [ADMIN_ID!]: adminPresence.points!.slice(-TRAIL_MAX_POINTS) }));
      }
    });

    ch.subscribe();
    rtChannelRef.current = ch;

    return () => {
      if (rtChannelRef.current) {
        rtChannelRef.current.unsubscribe();
        rtChannelRef.current = null;
      }
    };
  }, []);

  /* Initial fetch + polling + realtime DB */
  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name");
      setProfiles(profilesData || []);

      // IMPORTANT: plus de filtre temporel — on récupère TOUT l'historique et on ordonne
      const { data: recents } = await supabase
        .from("locations")
        .select("user_id, lat, lng, is_active, updated_at, accuracy, created_at")
        .order("updated_at", { ascending: true });

      // rebuild trails FROM SCRATCH + filtre (0,0)
      const grouped: Record<string, [number, number][]> = {};
      for (const row of (recents || [])) {
        if (row.lat === 0 && row.lng === 0) continue; // ignore bad row
        const p: [number, number] = [row.lat, row.lng];
        const arr = grouped[row.user_id] || (grouped[row.user_id] = []);
        const last = arr[arr.length - 1];
        if (!last || haversine(last, p) > DIST_TRAIL_APPEND_M) arr.push(p);
        lastDbPointRef.current[row.user_id] = p;
      }
      Object.keys(grouped).forEach((uid) => {
        if (grouped[uid].length > TRAIL_MAX_POINTS) grouped[uid] = grouped[uid].slice(-TRAIL_MAX_POINTS);
      });
      setTrails(grouped);

      // latest location per user for markers (filter 0,0 as well)
      const latestMap = new Map<string, LocationRow>();
      (recents || [])
        .filter((r) => !(r.lat === 0 && r.lng === 0))
        .forEach((r) => latestMap.set(r.user_id, r));
      setLocations(Array.from(latestMap.values()));
    };

    fetchData();

    const ch = supabase
      .channel("realtime-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, fetchData)
      .subscribe();

    const interval = setInterval(fetchData, 5000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
  }, []);

  const canSeeShareButton = !!userId && !!ADMIN_ID && userId === ADMIN_ID;
  const activeCount = locations.filter((l) => l.is_active).length;

  const lyanPos = useMemo<[number, number] | null>(() => {
    const row = locations.find((l) => l.user_id === ADMIN_ID);
    return row ? [row.lat, row.lng] : null;
  }, [locations]);

  /* Start/Stop sharing (PROD: 50 m) */
  const startSharing = async () => {
    if (!canSeeShareButton) return;
    if (!("geolocation" in navigator)) {
      alert("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setSharing(true);
    enableWakeLock();

    if (rtChannelRef.current) {
      rtChannelRef.current.track({ user_id: userId!, points: [] });
    }
    presencePointsRef.current = [];

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;

        // Traînée locale (20 m) + broadcast à 50 m
        setTrails((prev) => {
          const t = prev[userId!] || [];
          const last = t[t.length - 1];
          const shouldAppend = !last || haversine(last, coords) > DIST_TRAIL_APPEND_M;
          if (shouldAppend) {
            const updated = [...t, coords].slice(-TRAIL_MAX_POINTS);
            presencePointsRef.current = updated.slice(-600);
            // Broadcast si distance >= 50 m depuis le dernier broadcast
            const lastB = lastBroadcastRef.current[userId!];
            if (!lastB || haversine(lastB, coords) >= DIST_BROADCAST_M) {
              rtChannelRef.current?.track({ user_id: userId!, points: presencePointsRef.current });
              rtChannelRef.current?.send({
                type: "broadcast",
                event: "point",
                payload: { user_id: userId!, lat: coords[0], lng: coords[1] },
              });
              lastBroadcastRef.current[userId!] = coords;
            }
            return { ...prev, [userId!]: updated };
          }
          return prev;
        });

        // Insert DB si >= 50 m + intervalle OK
        const now = Date.now();
        const lastDb = lastDbPointRef.current[userId!];
        const movedEnough = !lastDb || haversine(lastDb, coords) >= DIST_DB_WRITE_M;
        const intervalOk = now - lastUploadAtRef.current >= UPLOAD_MIN_INTERVAL_MS;

        if (movedEnough && intervalOk) {
          lastUploadAtRef.current = now;
          lastDbPointRef.current[userId!] = coords;
          await supabase.from("locations").insert({
            user_id: userId!,
            lat: coords[0],
            lng: coords[1],
            accuracy,
            is_active: true,
            updated_at: new Date().toISOString(),
          });
        }
      },
      () => {
        alert("Impossible d’obtenir la position. Vérifiez les permissions.");
        setSharing(false);
        releaseWakeLock();
      },
      { enableHighAccuracy: true, maximumAge: 500, timeout: 10000 }
    );
  };

  const stopSharing = async () => {
    setSharing(false);
    releaseWakeLock();
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (canSeeShareButton) {
      const last = lastDbPointRef.current[userId!];
      await supabase.from("locations").insert({
        user_id: userId!,
        lat: last?.[0] ?? 0,
        lng: last?.[1] ?? 0,
        is_active: false,
        updated_at: new Date().toISOString(),
      });
    }
    rtChannelRef.current?.track({ user_id: userId!, points: [] });
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      releaseWakeLock();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-slate-50 to-zinc-200 text-gray-800">
      {/* HERO */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16">
          <div className="relative rounded-3xl bg-gradient-to-r from-slate-50 via-white to-zinc-100 ring-1 ring-slate-200 p-6 sm:p-10 text-center shadow-sm">
            <div className="mx-auto max-w-3xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-green-600 via-black to-red-600 text-white shadow">
                <Navigation className="h-6 w-6" />
              </div>
              {/* Title optimized for phones: clamp + line-balance + explicit mobile break */}
              <h1 className="text-balance leading-tight tracking-tight font-extrabold text-[clamp(22px,6.2vw,40px)] text-slate-900">
                <span className="sm:inline block">Marche autour du</span>{" "}
                <span className="text-red-700">Léman</span>
              </h1>
              <p className="mt-3 text-[clamp(13px,3.8vw,16px)] text-slate-600 leading-relaxed">
                Rejoignez Lyan dans sa marche à tout moment grâce à sa position en temps réel&nbsp;!
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[clamp(11px,3.4vw,14px)] font-medium ring-1 ring-slate-300 bg-white/80 backdrop-blur">
                <span className={`inline-block h-2 w-2 rounded-full ${liveNow ? "bg-green-600 animate-pulse" : "bg-red-500"}`} />
                {liveNow ? (
                  <span>Suivi en direct — activé</span>
                ) : (
                  <span className="text-balance">Suivi inactif — activation à 06h00 (heure Suisse)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* MAP */}
      <motion.section className="mx-auto max-w-7xl px-2 sm:px-4 relative z-0" style={{ zIndex: 0 }} {...fadeUp(0.05)}>
        <div className="flex items-center justify-between px-2 sm:px-1">
          <h2 className="mb-4 text-center sm:text-left font-extrabold text-[clamp(18px,5.5vw,28px)] text-slate-900 leading-tight">
            Le parcours
          </h2>
          <button
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-[clamp(12px,3.6vw,14px)] font-semibold text-slate-900 border border-slate-200 ring-1 ring-black/10 shadow hover:shadow-md"
            aria-label="Agrandir la carte"
          >
            <Maximize2 className="h-4 w-4" />
            Plein écran
          </button>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-zinc-50 shadow">
          <div className="absolute left-4 top-4 z-[20] pointer-events-none">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[clamp(11px,3.4vw,13px)] font-medium ring-1 ring-slate-300">
              <MapPinned className="h-4 w-4 text-green-700" />
              <span className="text-balance">Carte live — {activeCount} marcheur(s) en partage</span>
            </span>
          </div>

          <MapErrorBoundary>
            <LiveMap
              profiles={profiles}
              locations={locations}
              trails={trails}
              heightClass="h-[55vh] sm:h-[60vh] lg:h-[70vh]"
              lyanPos={lyanPos}
            />
          </MapErrorBoundary>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-700 via-black to-red-700" />
        </div>

        <p className="mx-auto mt-3 max-w-3xl text-center text-[clamp(12px,3.6vw,14px)] text-slate-600 px-3 leading-relaxed">
          Une marche symbolique de solidarité, reliant les rives suisses et françaises du Léman, au profit des familles de Gaza.
        </p>
      </motion.section>

      {/* ÉTAPES */}
      <motion.section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20 pt-10" {...fadeUp(0.08)}>
        <h3 className="text-center font-extrabold mb-3 text-slate-900 leading-tight text-[clamp(18px,5.8vw,30px)]">
          Étapes et heures de passage
        </h3>
        <div
          className="relative mt-6 flex overflow-x-auto space-x-5 py-6 px-2 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 cursor-grab"
          onWheel={(e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.currentTarget.scrollLeft += e.deltaX;
            else e.stopPropagation();
          }}
          onMouseDown={(e) => e.currentTarget.classList.add("grabbing")}
          onMouseUp={(e) => e.currentTarget.classList.remove("grabbing")}
          onMouseLeave={(e) => e.currentTarget.classList.remove("grabbing")}
        >
          <div className="pointer-events-none absolute left-0 right-0 top-[58%] h-[2px] -z-10 bg-gradient-to-r from-green-700 via-black to-red-700 opacity-40"></div>
          {ETAPES.map((e, i) => (
            <motion.div
              key={i}
              className="w-[200px] sm:w-[240px] flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, delay: i * 0.02 }}
              viewport={{ once: true }}
            >
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-green-700 via-black to-red-700 text-white text-sm font-semibold shadow">
                {i + 1}
              </div>
              <p className="font-semibold text-slate-900 text-[clamp(12px,4.2vw,16px)] leading-snug text-balance">
                {e.ville}
              </p>
              <p className="mt-1 text-[clamp(11px,3.6vw,13px)] text-slate-500">{e.km}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-100">
                <Clock className="h-4 w-4" />
                <span className="text-[clamp(12px,3.8vw,14px)] font-medium">{e.heure}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section className="mx-auto mb-16 max-w-7xl px-4 sm:px-6" {...fadeUp(0.05)}>
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-zinc-100 p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
            <Flag className="h-5 w-5 text-green-700" />
          </div>
          <p className="mx-auto max-w-2xl text-slate-700 text-[clamp(13px,3.8vw,16px)] leading-relaxed">
            Rejoignez l’élan, soutenez et encouragez les marcheurs pendant l’évènement.
          </p>
          <a
            href="/participer"
            className="group mt-5 inline-flex rounded-2xl p-[1.5px] bg-gradient-to-r from-emerald-600 via-gray-900 to-rose-600 hover:brightness-105 transition"
          >
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-[clamp(12px,3.6vw,14px)] font-semibold text-slate-900 ring-1 ring-black/5 shadow-sm group-hover:shadow-md">
              <Heart className="h-4 w-4 text-emerald-600" />
              Participer
            </span>
          </a>
        </div>
      </motion.section>

      {/* FAB Share (admin only) */}
      {(() => {
        const canSee = !!userId && !!ADMIN_ID && userId === ADMIN_ID;
        if (!canSee) return null;
        return (
          <div className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-[999]">
            {!sharing ? (
              <button
                onClick={startSharing}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 via-gray-900 to-rose-600 p-[2px] shadow-2xl hover:brightness-105"
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[clamp(12px,3.6vw,14px)] font-semibold text-slate-900 ring-1 ring-black/5">
                  <Share2 className="h-5 w-5 text-emerald-600" />
                  Partager ma localisation
                </span>
              </button>
            ) : (
              <button
                onClick={stopSharing}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-[clamp(12px,3.6vw,14px)] font-semibold text-white shadow-2xl hover:bg-red-700"
              >
                <StopCircle className="h-5 w-5" />
                Arrêter le partage
              </button>
            )}
          </div>
        );
      })()}

      {/* FULLSCREEN */}
      {fullscreen && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm">
          <div className="absolute inset-0 p-3 sm:p-5">
            <div className="relative h-[calc(100dvh-1.25rem)] sm:h-[calc(100dvh-2.5rem)] rounded-2xl ring-1 ring-white/10 bg-gradient-to-b from-zinc-100/60 to-slate-200/60 overflow-hidden">
              <button
                onClick={() => setFullscreen(false)}
                className="absolute right-3 top-3 z-[1010] inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[clamp(12px,3.6vw,14px)] font-semibold text-slate-900 border border-slate-300 ring-1 ring-black/10 shadow hover:shadow-md"
              >
                <X className="h-4 w-4" />
                Fermer
              </button>
              <div className="absolute inset-0 p-2 sm:p-3">
                <MapErrorBoundary>
                  <LiveMap
                    profiles={profiles}
                    locations={locations}
                    trails={trails}
                    heightClass="h-full"
                    lyanPos={lyanPos}
                  />
                </MapErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
