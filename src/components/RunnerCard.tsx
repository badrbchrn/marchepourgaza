import { motion } from "framer-motion";
import {
  Star,
  Crown,
  Loader2,
  SquareCheck,
  Clock,
  HeartHandshake,
} from "lucide-react";
import ArtistCard from "./ArtistCard";
import type { ArtistConfig } from "./ArtistCard";
import { useLayoutEffect, useRef, useState } from "react";

/** AutoFitNumber (même algo que dans ArtistCard : fit par ratio, sans boucle) */
function AutoFitNumber({
  value,
  strong,
  min = 12,
  max = 20,
  titleText,
  color = "text-gray-900",
}: {
  value: string | number;
  strong?: boolean;
  min?: number;
  max?: number;
  titleText?: string;
  color?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fs, setFs] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    el.style.fontSize = `${max}px`;
    const sw = el.scrollWidth;
    const pw = parent.clientWidth;

    let next = max;
    if (sw > pw && sw > 0) {
      const ratio = pw / sw;
      next = Math.max(min, Math.floor(max * ratio * 0.98));
    }
    if (next !== fs) setFs(next);
  }, [value, min, max]);

  return (
    <span
      ref={ref}
      title={titleText ?? String(value)}
      className={`block max-w-full overflow-hidden whitespace-nowrap leading-tight tabular-nums ${color} ${
        strong ? "font-extrabold" : "font-semibold"
      }`}
      style={{ fontSize: `${fs}px`, lineHeight: 1.05 }}
    >
      {value}
    </span>
  );
}

/* ---------------- Types ---------------- */
type SponsorLite = {
  id: string;
  sponsor?: { full_name?: string | null } | null;
  pledge_per_km?: number | null;
};

type Runner = {
  id: string;
  full_name: string;
  city?: string | null;
  expected_km: number;
  desired_pledge: number;
};

export type RunnerCardProps = {
  runner: Runner;
  isMain: boolean;
  isTop: boolean;
  accepted: SponsorLite[];
  pending: SponsorLite[];
  potentialCHF: number;
  processing: boolean;
  myLinkStatus: "pending" | "accepted" | null;
  isActionDisabled: boolean;
  onAction: () => void;
  formatCurrency?: (n: number) => string;
};

/* ---------------- Artists mapping (IDs via env vars) ---------------- */
const ENV = import.meta.env as any;
const ID_GENDLE  = (ENV.VITE_ARTIST_GENDLE_ID  as string | undefined)?.trim();
const ID_SAUDAD  = (ENV.VITE_ARTIST_SAUDAD_ID  as string | undefined)?.trim();
const ID_DOUBLER = (ENV.VITE_ARTIST_DOUBLER_ID as string | undefined)?.trim();

const CFG_GENDLE: ArtistConfig = {
  key: "gendle",
  video: { sources: [{ src: "/media/GendleVidFormated.webm", type: "video/webm" }] },
  gradient: "from-orange-600 via-red-900 to-black",
  titleBadge: "Artiste mobilisé·e",
  social: {
    instagram: "https://www.instagram.com/gendle.off/?hl=fr",
    spotify: "https://open.spotify.com/intl-fr/artist/68FU43eCpvaA5yqRTWbTx0",
  },
};

const CFG_SAUDAD: ArtistConfig = {
  key: "saudad",
  video: { sources: [{ src: "/media/saudadVidFormated.mp4", type: "video/mp4" }] },
  gradient: "from-black via-zinc-900 to-emerald-950",
  titleBadge: "Artiste mobilisé·e",
  social: {
    instagram: "https://www.instagram.com/saudadlevent/",
    spotify: "https://open.spotify.com/intl-fr/artist/0SWWl3uJmInSpMrC1yyfhL",
  },
};

const CFG_DOUBLER: ArtistConfig = {
  key: "doubler",
  video: { sources: [{ src: "/media/DoublerVidFormated.mp4", type: "video/mp4" }] },
  gradient: "from-black via-emerald-900 to-black",
  titleBadge: "Artiste mobilisé·e",
  social: {
    instagram: "https://www.instagram.com/alg_double.r/",
    spotify: "https://open.spotify.com/intl-fr/artist/4GT7sPv4p99Wftyz11Dr2c?si=nVB5hThDQyWdGYdVrdlZbw",
  },
};

const ARTISTS_BY_ID: Record<string, ArtistConfig> = {};
if (ID_GENDLE)  ARTISTS_BY_ID[ID_GENDLE]  = CFG_GENDLE;
if (ID_SAUDAD)  ARTISTS_BY_ID[ID_SAUDAD]  = CFG_SAUDAD;
if (ID_DOUBLER) ARTISTS_BY_ID[ID_DOUBLER] = CFG_DOUBLER;

const ARTISTS_BY_NAME: Record<string, ArtistConfig> = {
  gendle:  CFG_GENDLE,
  saudad:  CFG_SAUDAD,
  doubler: CFG_DOUBLER,
};

function pickArtistForRunner(runner: Runner): ArtistConfig | null {
  const byId = ARTISTS_BY_ID[runner.id];
  if (byId) return byId;
  const k = runner.full_name?.toLowerCase?.().trim?.() || "";
  return ARTISTS_BY_NAME[k] ?? null;
}

/* ---------------------------------------------------------- */

export default function RunnerCard(props: RunnerCardProps) {
  const {
    runner,
    isMain,
    isTop,
    accepted,
    pending,
    potentialCHF,
    processing,
    myLinkStatus,
    isActionDisabled,
    onAction,
    formatCurrency,
  } = props;

  const artist = pickArtistForRunner(runner);
  if (artist) {
    return <ArtistCard artist={artist} {...props} />;
  }

  const acceptedCount = accepted.length;
  const chf =
    formatCurrency ||
    ((n: number) =>
      new Intl.NumberFormat("fr-CH", {
        style: "currency",
        currency: "CHF",
        maximumFractionDigits: 2,
      }).format(n));

  const computedPotential =
    accepted.reduce(
      (sum, s) => sum + ((s.pledge_per_km || 0) * (runner.expected_km || 0)),
      0
    ) || potentialCHF;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col w-full rounded-2xl border backdrop-blur-md shadow-sm hover:shadow-md transition-all
        ${isMain ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 border-amber-300" : "bg-white/80 border-gray-200"}
        ${!isMain && isTop ? "ring-1 ring-indigo-200" : ""}`}
    >
      {/* CTA icône seule */}
      <button
        title={
          isActionDisabled
            ? "Connectez-vous et complétez le profil"
            : myLinkStatus === "pending"
            ? "Demande envoyée — cliquer pour annuler"
            : myLinkStatus === "accepted"
            ? "Parrainage validé"
            : "Parrainer"
        }
        onClick={() => !isActionDisabled && onAction()}
        disabled={isActionDisabled || processing}
        className={`absolute top-2 right-2 h-10 w-10 rounded-xl border shadow-sm
          flex items-center justify-center transition
          ${
            isActionDisabled
              ? "bg-white/80 text-gray-500 border-gray-200 cursor-not-allowed"
              : myLinkStatus === "pending"
              ? "bg-yellow-50 text-yellow-800 border-yellow-200"
              : myLinkStatus === "accepted"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-gradient-to-br from-green-600 via-black to-red-600 text-white border-black/10 hover:brightness-110"
          }`}
      >
        {processing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : myLinkStatus === "pending" ? (
          <Clock className="w-5 h-5" />
        ) : myLinkStatus === "accepted" ? (
          <SquareCheck className="w-5 h-5" />
        ) : (
          <HeartHandshake className="w-5 h-5" />
        )}
      </button>

      {/* Badge centré (Top parrains) */}
      {!isMain && isTop && acceptedCount > 0 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full
              bg-gradient-to-r from-indigo-100 via-violet-50 to-indigo-200
              text-indigo-900 px-3 py-1.5 text-[12px] font-semibold
              border border-indigo-300 shadow-[0_8px_22px_-10px_rgba(99,102,241,0.45)]">
            <Crown className="h-4 w-4 text-indigo-600" />
            <span>Top parrains</span>
          </div>
        </div>
      )}

      {/* Badge Marcheur principal */}
      {isMain && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border border-amber-400 bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-200 text-amber-800 shadow-sm"
          animate={{ boxShadow: ["0 0 0px #fbbf24", "0 0 12px #facc15", "0 0 0px #fbbf24"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Star className="w-4 h-4 text-amber-500" />
          <span>Marcheur principal</span>
        </motion.div>
      )}

      {/* En-tête */}
      <div className={`px-4 sm:px-5 ${(isMain || isTop) ? "pt-11" : "pt-4"}`}>
        <p className={`font-semibold text-[clamp(14px,2.2vw,18px)] leading-tight ${isMain ? "text-yellow-700" : "text-gray-900"}`}>
          {runner.full_name}
        </p>
        <p className="text-[clamp(12px,1.8vw,14px)] text-gray-500">{runner.city}</p>
      </div>

      {/* ---------------- Stats (copie du layout ArtistCard, version light) ---------------- */}
      <div className="relative px-4 sm:px-5 mt-3">
        <div className="rounded-2xl border border-gray-200 bg-white/75 px-3 py-3 md:px-4 md:py-3.5 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Objectif" value={runner.expected_km} unit="km" />

            <div className="md:order-4 text-right">
              <Stat label="Souhaité" value={runner.desired_pledge} unit="CHF/km" />
            </div>

            <Stat label="Parrains" value={accepted.length} />

            <div className="min-w-0 text-right">
              <div className="text-[12px] text-gray-500">Potentiel</div>
              <div className="leading-tight">
                <AutoFitNumber
                  value={new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(Math.round(computedPotential))}
                  strong
                  min={12}
                  max={20}
                  titleText={chf(computedPotential)}
                  color="text-gray-900"
                />
                <span className="ml-1 text-[11px] text-gray-500 align-baseline md:hidden">CHF</span>
                <div className="hidden md:block mt-0.5 text-[11px] text-gray-500">CHF</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ------------------------------------------------------------------ */}

      {/* Parrains */}
      <div className="px-4 sm:px-5 mt-3 mb-4">
        {(accepted.length + pending.length > 0) ? (
          <>
            <p className="text-[clamp(10px,1.5vw,12px)] font-semibold text-gray-700 mb-1">Parrainages</p>
            <div className="rounded-xl border border-gray-100 px-3 py-2 max-h-24 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {accepted.map((s) => (
                  <span
                    key={`a-${s.id}`}
                    className="px-2 py-1 text-[clamp(10px,1.5vw,12px)] rounded-full bg-green-100 text-green-800 border border-green-200"
                  >
                    {s.sponsor?.full_name}
                  </span>
                ))}
                {pending.map((s) => (
                  <span
                    key={`p-${s.id}`}
                    className="px-2 py-1 text-[clamp(10px,1.5vw,12px)] rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200"
                  >
                    {s.sponsor?.full_name}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-16 flex items-center justify-center text-[clamp(10px,1.5vw,12px)] text-gray-400 border border-dashed border-gray-200 rounded-lg px-3">
            Aucun parrain pour l’instant
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---------------- Sub-component (même structure que ArtistCard, palette light) ---------------- */
function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-gray-500">{label}</div>
      <div className="leading-tight">
        <span className="text-[clamp(14px,2.2vw,20px)] font-semibold tabular-nums text-gray-900">{value}</span>
        {unit && <span className="ml-1 text-[11px] text-gray-500 align-baseline md:hidden">{unit}</span>}
        {unit && <div className="hidden md:block mt-0.5 text-[11px] text-gray-500">{unit}</div>}
      </div>
    </div>
  );
}
