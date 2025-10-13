import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

/** Réduit la taille du texte pour qu'il tienne dans son parent */
function AutoFitNumber({
  value,
  strong,
  min = 12,   // px mini
  max = 20,   // px maxi (garde le look actuel)
  step = 1,
  titleText,
}: {
  value: string | number;
  strong?: boolean;
  min?: number;
  max?: number;
  step?: number;
  titleText?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fs, setFs] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Remonte à la taille max puis réduit tant que ça déborde
    let size = max;
    el.style.fontSize = `${size}px`;

    const parent = el.parentElement; // flex container de la valeur + unité
    if (!parent) return;

    // boucle de réduction
    while (size > min && parent.scrollWidth > parent.clientWidth) {
      size -= step;
      el.style.fontSize = `${size}px`;
    }

    setFs(size);
  }, [value, min, max, step]);

  return (
    <span
      ref={ref}
      title={titleText ?? String(value)}
      className={`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap leading-tight ${
        strong ? "font-extrabold text-gray-900" : "font-semibold text-gray-900"
      }`}
      style={{ fontSize: `${fs}px`, lineHeight: 1.05 }}
    >
      {value}
    </span>
  );
}


import {
  Star,
  Crown,
  Loader2,
  SquareCheck,
  Clock,
  HeartHandshake,
} from "lucide-react";

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

/* ---------------- Component ---------------- */
export default function RunnerCard({
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
}: RunnerCardProps) {
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
        ${
          isMain
            ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 border-amber-300"
            : "bg-white/80 border-gray-200"
        }
        ${!isMain && isTop ? "ring-1 ring-indigo-200" : ""}`}
    >
      {/* CTA icône seule (dégradé Gaza) */}
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

      {/* Badge centré */}
      {!isMain && isTop && acceptedCount > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-1.5 rounded-full
              bg-gradient-to-r from-indigo-100 via-violet-50 to-indigo-200
              text-indigo-900 px-3 py-1.5 text-[clamp(10px,1.5vw,12px)] font-semibold
              border border-indigo-300 shadow-[0_8px_22px_-10px_rgba(99,102,241,0.45)]">
            <Crown className="h-4 w-4 text-indigo-600" />
            <span>Top parrains</span>
          </div>
        </div>
      )}

      {isMain && (
        <motion.div
          className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[clamp(10px,1.5vw,12px)] font-semibold px-3 py-1.5 rounded-full border border-amber-400 bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-200 text-amber-800 shadow-sm"
          animate={{ boxShadow: ["0 0 0px #fbbf24", "0 0 12px #facc15", "0 0 0px #fbbf24"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Star className="w-4 h-4 text-amber-500" />
          <span>Marcheur principal</span>
        </motion.div>
      )}

      {/* En-tête */}
      <div className={`px-4 sm:px-5 ${(isMain || isTop) ? "pt-11" : "pt-4"}`}>
        <p
          className={`font-semibold text-[clamp(14px,2.2vw,18px)] leading-tight ${
            isMain ? "text-yellow-700" : "text-gray-900"
          }`}
        >
          {runner.full_name}
        </p>
        <p className="text-[clamp(12px,1.8vw,14px)] text-gray-500">{runner.city}</p>
      </div>

      {/* ------- Bloc statistiques COMPACT ------- */}
      <div className="px-4 sm:px-5 mt-3">
        <div className="rounded-2xl border border-gray-200 bg-white/75 px-3 py-3 md:px-4 md:py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Objectif" value={runner.expected_km} unit="km" />
            <Stat label="Souhaité" value={runner.desired_pledge} unit="CHF/km" />
            <Stat label="Parrains" value={acceptedCount} />
            <Stat
            label="Potentiel"
            value={new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(Math.round(computedPotential))}
            unit="CHF"
            strong
            right
            />
          </div>
        </div>
      </div>

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

/* ---------------- Sub-components ---------------- */
function Stat({
  label,
  value,
  unit,
  strong,
  right,
}: {
  label: string;
  value: number | string;
  unit?: string;
  strong?: boolean;
  right?: boolean;
}) {
  // Taille auto : un peu plus petite pour la colonne droite (Potentiel)
  const sizeCls = right
    ? "text-[clamp(12px,1.8vw,20px)]"  // rétrécit davantage si manque de place
    : "text-[clamp(14px,2.2vw,20px)]";

  // Overflow :
  // - colonnes classiques : ellipsis
  // - colonne droite (Potentiel) : jamais d'ellipsis ⇒ on montre tout et on réduit la taille
  const overflowCls = right
    ? "whitespace-nowrap"                             // pas d’ellipsis
    : "overflow-hidden text-ellipsis whitespace-nowrap";

  // On limite la largeur pratique du bloc de droite pour garder l’alignement visuel
  const rightWrapCls = right ? "text-right max-w-[9.5rem] sm:max-w-[12rem]" : "max-w-full";

  const weightCls = strong ? "font-extrabold text-gray-900" : "font-semibold text-gray-900";

  return (
    <div className={`min-w-0 ${right ? "text-right" : ""}`}>
      <div className="text-[12px] text-gray-500">{label}</div>
      <div className={`${weightCls} ${sizeCls} ${overflowCls} ${rightWrapCls} leading-tight`}>
        <span className="align-baseline tabular-nums">{value}</span>
        {unit && (
          <span className="ml-1 text-[11px] md:text-[12px] text-gray-500 whitespace-nowrap align-baseline">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
