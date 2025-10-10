// Track.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { MapPinned, Clock, Flag, Navigation, Heart } from "lucide-react";

// Leaflet
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* ======================== LIVE CONFIG ======================== */
const MARCH_START_ISO = "2025-10-25T07:00:00+02:00";
const FORCE_LIVE = false;

/* ======================== ÉTAPES ======================== */
const ETAPES = [
  { ville: "Genève (Pont du Mont-Blanc)", km: "0 km", heure: "07h00 (sam.)" },
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

/* ======================== ICONES ======================== */
const startIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png", // pastille rouge
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});
const activeIcon = startIcon;
const inactiveIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

/* ======================== CARTE – LÉMAN ======================== */
// Centre & limites
const LEMAN_CENTER: [number, number] = [46.45, 6.56];
const LEMAN_BOUNDS: [[number, number], [number, number]] = [
  [46.0, 5.85], // SW
  [46.7, 7.05], // NE
];

// Contour plus précis du lac (≈ 40 points, sens horaire)
const LEMAN_OUTLINE: [number, number][] = [
  // ⬆️ rive nord (Suisse) Genève → Villeneuve
  [46.205, 6.147], // Genève, Pont du Mont-Blanc
  [46.224, 6.171], // Cologny
  [46.250, 6.190], // Anières
  [46.283, 6.214], // Versoix
  [46.321, 6.220], // Coppet
  [46.358, 6.230],
  [46.383, 6.238], // Nyon
  [46.410, 6.260], // Gland
  [46.440, 6.300],
  [46.456, 6.330], // Rolle
  [46.479, 6.374], // Allaman
  [46.498, 6.430],
  [46.506, 6.496], // Morges
  [46.510, 6.560],
  [46.510, 6.624], // Lausanne (Ouchy)
  [46.508, 6.671], // Pully
  [46.503, 6.707], // Lutry
  [46.493, 6.740],
  [46.480, 6.780],
  [46.462, 6.842], // Vevey
  [46.446, 6.880],
  [46.437, 6.910], // Montreux
  [46.405, 6.925],
  [46.397, 6.928], // Villeneuve
  // ⬇️ rive sud (France) Villeneuve → Genève
  [46.395, 6.900],
  [46.395, 6.860],
  [46.399, 6.820],
  [46.400, 6.780], // St-Gingolph
  [46.402, 6.740],
  [46.402, 6.700],
  [46.401, 6.660], // Meillerie/Maxilly
  [46.401, 6.640], // Évian
  [46.398, 6.590], // Amphion
  [46.382, 6.520],
  [46.375, 6.480], // Thonon
  [46.365, 6.440], // Sciez
  [46.346, 6.400], // Excenevex
  [46.326, 6.360],
  [46.307, 6.330], // Yvoire
  [46.293, 6.305], // Nernier
  [46.280, 6.285], // Messery
  [46.266, 6.262], // Chens-sur-Léman
  [46.254, 6.238], // frontière/Veigy
  [46.240, 6.214],
  [46.228, 6.190], // Hermance / Anières
  [46.215, 6.168], // Cologny
  [46.205, 6.147], // retour Genève
];

// Route (dashed) = même contour (sobre)
const LEMAN_ROUTE = LEMAN_OUTLINE;

/* ======================== PAGE ======================== */
export default function Marche() {
  const now = new Date();
  const start = useMemo(() => new Date(MARCH_START_ISO), []);
  const isMarchDay =
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth() &&
    now.getDate() === start.getDate();

  const LIVE = FORCE_LIVE || isMarchDay;

  const [profiles, setProfiles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name");
      setProfiles(profilesData || []);

      const { data: locs } = await supabase
        .from("locations")
        .select("user_id, lat, lng, is_active, updated_at");
      setLocations(locs || []);
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

  const activeCount = locations.filter((l) => l.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-800">
      {/* HERO */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="relative rounded-3xl bg-gradient-to-r from-green-50 via-white to-red-50 ring-1 ring-black/5 p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto max-w-3xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-green-600 via-black to-red-600 text-white shadow">
                <Navigation className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Marche autour du <span className="text-red-700">Léman</span>
              </h1>
              <p className="mt-3 text-gray-600">
                Une marche symbolique de solidarité, reliant les rives suisses et françaises du
                Léman, au profit des familles de Gaza.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-black/10 bg-white/80 backdrop-blur">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    LIVE ? "bg-green-600 animate-pulse" : "bg-red-500"
                  }`}
                />
                {LIVE ? (
                  <span>Suivi en direct — activé</span>
                ) : (
                  <span>Suivi en direct inactif — activation le 25 octobre 2025 à 07h00</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CARTE */}
      <motion.section className="mx-auto max-w-7xl px-1 relative z-0" style={{ zIndex: 0 }} {...fadeUp(0.05)}>
        <h2 className="mb-4 text-center text-2xl font-extrabold">Le parcours</h2>

        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow">
          {/* Badge d'état */}
          <div className="absolute left-4 top-4 z-[5]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-sm font-medium ring-1 ring-black/10">
              <MapPinned className="h-4 w-4 text-green-700" />
              {LIVE ? <>Carte live — {activeCount} marcheur(s) en partage</> : <>Aperçu du trajet — live désactivé</>}
            </span>
          </div>

                
          <div className="relative w-full h-[60vh] md:h-[65vh] lg:h-[70vh]">
            <MapContainer
              center={[46.3, 6.55]}
              zoom={9}
              scrollWheelZoom={true}
              className="absolute inset-0 rounded-2xl overflow-hidden shadow"
            >

              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

              {/* Contour précis + remplissage sobre */}
              <Polygon
                positions={LEMAN_OUTLINE}
                pathOptions={{
                  color: "#111827", // outline
                  weight: 4,
                  fillColor: "#9ca3af",
                  fillOpacity: 0.28,
                }}
              />
              

              {/* Route en pointillés */}
              <Polyline
                positions={LEMAN_ROUTE}
                pathOptions={{
                  color: "#111827",
                  weight: 3,
                  opacity: 0.7,
                  dashArray: "10 8",
                }}
              />

              {/* Seule pastille rouge : départ Genève */}
              <Marker position={[46.205, 6.147]} icon={startIcon}>
                <Popup>
                  <strong>Genève — Pont du Mont-Blanc</strong>
                  <br />
                  Départ prévu : <strong>07h00 (sam.)</strong>
                </Popup>
              </Marker>

              {/* Marqueurs live (affichés uniquement quand LIVE) */}
              {LIVE &&
                locations.map((l) => {
                  const profile = profiles.find((p) => p.id === l.user_id);
                  const icon = l.is_active ? activeIcon : inactiveIcon;
                  return (
                    <Marker key={l.user_id} position={[l.lat, l.lng]} icon={icon}>
                      <Popup>
                        <strong>{profile?.full_name || "Marcheur"}</strong>
                        <br />
                        <span
                          className={`flex items-center gap-1 ${
                            l.is_active ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              l.is_active ? "bg-green-500 animate-pulse" : "bg-red-500"
                            }`}
                          />
                          {l.is_active ? "En marche" : "Inactif"}
                        </span>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-700 via-black to-red-700" />
        </div>

        <p className="mx-auto mt-3 max-w-3xl text-center text-sm text-gray-600">
          Le tracé est indicatif. Les marqueurs apparaissent uniquement quand le suivi en direct est
          activé.
        </p>
      </motion.section>

      {/* ÉTAPES */}
      <motion.section className="mx-auto max-w-7xl px-6 pb-20 pt-12" {...fadeUp(0.08)}>
        <h3 className="text-center text-2xl md:text-3xl font-extrabold mb-2">
          Étapes et heures de passage
        </h3>

        {/* Indication de slide */}
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-3 text-sm">
          <motion.span
            animate={{ x: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.span>
          <span>Faites glisser ou utilisez la molette pour explorer les étapes</span>
        </div>

        {/* TIMELINE défilable */}
        <div
          className="relative mt-6 flex overflow-x-auto no-scrollbar space-x-5 py-6 cursor-grab"
          onWheel={(e) => {
            // Si la souris est au-dessus de la section, on bloque le scroll vertical
            e.preventDefault();
            e.stopPropagation();

            // Et on défile horizontalement à la place
            e.currentTarget.scrollLeft += e.deltaY;
          }}
          onMouseDown={(e) => e.currentTarget.classList.add("grabbing")}
          onMouseUp={(e) => e.currentTarget.classList.remove("grabbing")}
          onMouseLeave={(e) => e.currentTarget.classList.remove("grabbing")}
        >
          {/* Ligne de progression */}
          <div className="pointer-events-none absolute left-0 right-0 top-[58%] h-[2px] -z-10 bg-gradient-to-r from-green-700 via-black to-red-700 opacity-40"></div>

          {ETAPES.map((e, i) => (
            <motion.div
              key={i}
              className="w-[220px] md:w-[250px] flex-shrink-0 rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md transition-all"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, delay: i * 0.02 }}
              viewport={{ once: true }}
            >
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-green-700 via-black to-red-700 text-white text-sm font-semibold shadow">
                {i + 1}
              </div>
              <p className="font-semibold text-gray-900 text-sm md:text-base">{e.ville}</p>
              <p className="mt-1 text-xs text-gray-500">{e.km}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-100">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{e.heure}</span>
              </div>
            </motion.div>
          ))}
        </div>

      </motion.section>


      {/* CTA – raffiné */}
      <motion.section className="mx-auto mb-16 max-w-7xl px-6" {...fadeUp(0.05)}>
        <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-green-50 via-white to-red-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-black/10">
            <Flag className="h-5 w-5 text-green-700" />
          </div>

          {LIVE ? (
            <p className="mx-auto max-w-2xl text-gray-700">
              Le suivi est <strong>en direct</strong> : encouragez les marcheurs et soutenez
              concrètement les familles de Gaza en parrainant au kilomètre.
            </p>
          ) : (
            <p className="mx-auto max-w-2xl text-gray-700">
              En attendant le jour J, vous pouvez <strong>déjà soutenir</strong> la marche en
              parrainant un marcheur. Chaque engagement compte.
            </p>
          )}

          {/* bouton raffiné : bordure dégradée + cœur */}
          <a
            href="/participer"
            className="group mt-5 inline-flex rounded-2xl p-[1.5px] bg-gradient-to-r from-emerald-600 via-gray-900 to-rose-600 hover:brightness-105 transition"
          >
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-black/5 shadow-sm group-hover:shadow-md">
              <Heart className="h-4 w-4 text-emerald-600" />
              {LIVE ? "Parrainer pendant la marche" : "Accéder au parrainage"}
            </span>
          </a>
        </div>
      </motion.section>
    </div>
  );
}
