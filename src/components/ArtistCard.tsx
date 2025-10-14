import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, SquareCheck, Clock, HeartHandshake, Crown, Shield } from "lucide-react";

/* --------- Types --------- */
type SponsorLite = {
  id: string;
  sponsor?: { id?: string; full_name?: string | null } | null;
  pledge_per_km?: number | null;
};
type Runner = {
  id: string;
  full_name: string;
  city?: string | null;
  expected_km: number;
  desired_pledge: number;
};

export type ArtistConfig = {
  key: string;
  image?: string;
  video?: {
    sources: Array<{ src: string; type: "video/mp4" | "video/webm" | "video/quicktime" }>;
    poster?: string;
  };
  gradient: string;
  titleBadge?: string;
  social?: {
    instagram?: string;
    spotify?: string;
  };
};

export type ArtistCardProps = {
  artist: ArtistConfig;
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

/* --- Admin helpers --- */
const ADMIN_ID = (import.meta.env as any).VITE_ADMIN_USER_ID || (import.meta.env as any).VITE_LYAN_ID;
const ADMIN_NAME_FALLBACK = "lyan";
const isAdminSponsor = (s: SponsorLite) => {
  const id = s?.sponsor?.id;
  const nm = (s?.sponsor?.full_name || "").trim().toLowerCase();
  return (ADMIN_ID && id === ADMIN_ID) || nm === ADMIN_NAME_FALLBACK;
};

/* --- Preset: tailles pastilles alignées sur RunnerCard --- */
const CHIP_SIZE = "px-2 py-1 text-[clamp(10px,1.5vw,12px)]";

/* --- Auto fit “Potentiel” (sans boucle) --- */
function AutoFitNumber({
  value,
  strong,
  min = 12,
  max = 20,
  titleText,
  color = "text-white",
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

/* ---------- Fond média (basé sur ta version, mais sans démonter les <source>) ---------- */
function BackgroundMedia({
  artist,
  containerRef,
}: {
  artist: ArtistConfig;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ratio, setRatio] = useState(0);
  const [playing, setPlaying] = useState(false);

  const posterSrc = artist.video?.poster || artist.image || undefined;
  const hasVideo = !reduce && !!artist.video?.sources?.length;

  // Observer la visibilité avec une petite hystérésis (démarre >=0.85, pause <0.6)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const thresholds = [0, 0.1, 0.25, 0.5, 0.6, 0.75, 0.85, 0.9, 1];
    const io = new IntersectionObserver(
      ([e]) => setRatio(e.intersectionRatio),
      { rootMargin: "600px 0px 600px 0px", threshold: thresholds }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [containerRef]);

  // Lecture/pause SANS retirer les sources (le poster reste toujours visible)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;

    const shouldPlay = ratio >= 0.85;
    const shouldPause = ratio < 0.6;

    if (shouldPlay && v.paused) {
      v.muted = true;
      v.playsInline = true;
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else if (shouldPause && !v.paused) {
      try { v.pause(); } catch {}
      setPlaying(false);
    }
  }, [ratio, hasVideo]);

  // Nettoyage
  useEffect(() => {
    return () => {
      try { videoRef.current?.pause(); } catch {}
    };
  }, []);

  if (!hasVideo) {
    return posterSrc ? (
      <img
        src={posterSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-70"
        loading="lazy"
        decoding="async"
      />
    ) : null;
  }

  // IMPORTANT: on laisse les <source> TOUJOURS montés → pas d’écran noir
  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-70 transition-opacity duration-300"
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterSrc}
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        style={{ willChange: "transform, opacity" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {artist.video!.sources.map((s, i) => (
          <source key={i} src={s.src} type={s.type} />
        ))}
      </video>

      {/* Tap pour forcer la lecture si l’autoplay est bloqué (mobile) */}
      {!playing && (
        <button
          type="button"
          aria-label="Lire la vidéo"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = true;
            v.playsInline = true;
            v.play().then(() => setPlaying(true)).catch(() => {});
          }}
          className="absolute inset-0"
          style={{ WebkitTapHighlightColor: "transparent" }}
        />
      )}
    </>
  );
}

/* --- Pastille parrain (alignée RunnerCard) --- */
function SponsorChip({ s, pending }: { s: SponsorLite; pending?: boolean }) {
  const admin = isAdminSponsor(s);

  if (admin) {
    return (
      <span
        key={s.id}
        className={`group relative inline-flex items-center gap-1.5 ${CHIP_SIZE} rounded-full
                    font-semibold text-red-50
                    bg-red-600/15 border border-red-400/50 backdrop-blur-md
                    shadow-[inset_0_1px_0_rgba(255,255,255,.12)] ring-1 ring-red-500/40
                    transition-transform duration-150 will-change-transform hover:-translate-y-0.5`}
        title="Admin"
      >
        <Shield className="h-[1.05em] w-[1.05em] text-red-200" aria-hidden />
        <span className="relative z-10">{s.sponsor?.full_name}</span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full
                     bg-[radial-gradient(120%_70%_at_50%_-20%,rgba(255,255,255,.18),transparent_60%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-full
                     bg-red-500/15 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full
                     ring-2 ring-red-400/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      </span>
    );
  }

  return (
    <span
      key={s.id}
      className={`${CHIP_SIZE} rounded-full ${
        pending
          ? "bg-yellow-300/20 text-yellow-100 border border-yellow-300/30"
          : "bg-emerald-300/20 text-emerald-100 border border-emerald-300/30"
      }`}
    >
      {s.sponsor?.full_name}
    </span>
  );
}

/* ---------------- Component ---------------- */
function ArtistCardInner({
  artist,
  runner,
  accepted,
  pending,
  potentialCHF,
  processing,
  myLinkStatus,
  isActionDisabled,
  onAction,
  formatCurrency,
}: ArtistCardProps) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const chf =
    formatCurrency ||
    useCallback(
      (n: number) =>
        new Intl.NumberFormat("fr-CH", {
          style: "currency",
          currency: "CHF",
          maximumFractionDigits: 2,
        }).format(n),
      []
    );

  const computedPotential = useMemo(() => {
    const sum =
      accepted.reduce(
        (acc, s) => acc + ((s.pledge_per_km || 0) * (runner.expected_km || 0)),
        0
      ) || potentialCHF;
    return sum;
  }, [accepted, runner.expected_km, potentialCHF]);

  const acceptedCount = accepted.length;

  return (
    <motion.div
      ref={containerRef}
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? undefined : { duration: 0.28, ease: "easeOut" }}
      className={`relative flex flex-col w-full rounded-2xl overflow-hidden text-white
        bg-gradient-to-br ${artist.gradient}
        shadow-[0_12px_30px_-12px_rgba(0,0,0,0.55)] border border-white/10
        will-change-transform transition-transform duration-150 hover:-translate-y-0.5`}
      style={{
        contentVisibility: "auto" as any,
        contain: "content",
        containIntrinsicSize: "360px 280px",
      }}
    >
      {/* Fond vidéo / image */}
      <BackgroundMedia artist={artist} containerRef={containerRef} />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/15 to-transparent pointer-events-none" />

      {/* Badge artiste — centré */}
      {artist.titleBadge && (
        <div className="relative z-10 flex justify-center mt-2">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border border-white/30 bg-white/10 backdrop-blur shadow-[0_8px_22px_-10px_rgba(255,255,255,0.35)]">
            <Crown className="h-4 w-4" />
            <span>{artist.titleBadge}</span>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative px-4 sm:px-5 pt-4">
        <p className="font-semibold text-[clamp(14px,2.2vw,18px)] leading-tight">{runner.full_name}</p>
        <p className="text-[clamp(12px,1.8vw,14px)] text-white/85">{runner.city}</p>
      </div>

      {/* Stats */}
      <div className="relative px-4 sm:px-5 mt-3">
        <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 md:px-4 md:py-3.5 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Objectif" value={runner.expected_km} unit="km" />
            <div className="md:order-4 text-right">
              <Stat label="Souhaité" value={runner.desired_pledge} unit="CHF/km" />
            </div>
            <Stat label="Parrains" value={acceptedCount} />
            <div className="min-w-0 text-right">
              <div className="text-[12px] text-white/80">Potentiel</div>
              <div className="leading-tight">
                <AutoFitNumber
                  value={new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(Math.round(computedPotential))}
                  strong
                  min={12}
                  max={20}
                  titleText={chf(computedPotential)}
                  color="text-white"
                />
                <span className="ml-1 text-[11px] text-white/80 align-baseline md:hidden">CHF</span>
                <div className="hidden md:block mt-0.5 text-[11px] text-white/70">CHF</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Réseaux sociaux centrés */}
      {(artist.social?.instagram || artist.social?.spotify) && (
        <div className="mt-3 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur px-3 py-1">
            {artist.social.instagram && (
              <a href={artist.social.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/20 transition" aria-label="Instagram" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </a>
            )}
            {artist.social.spotify && (
              <a href={artist.social.spotify} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/20 transition" aria-label="Spotify" title="Spotify">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.37 17.45c-.22.34-.64.45-.98.23-2.7-1.66-6.1-2.03-10.09-1.08-.39.09-.77-.15-.86-.54-.09-.39.15-.77.54-.86 4.28-1.01 7.96-.6 10.93 1.21.34.22.45.64.23.98Zm1.36-3.03c-.27.42-.84.55-1.26.28-3.1-1.9-7.82-2.45-11.48-1.3-.47.15-.97-.11-1.12-.58-.15-.47.11-.97.58-1.12 4.11-1.29 9.29-.67 12.79 1.46.42.27.55.84.28 1.26Zm.13-3.15c-3.5-2.08-9.28-2.28-12.61-1.21-.56.18-1.16-.13-1.34-.69-.18-.56.13-1.16.69-1.34 3.77-1.21 10.09-1 14.05 1.34.52.3.7.96.4 1.48-.3.52-.96.7-1.48.4Z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Parrainages (chips) — hauteur adaptative alignée RunnerCard */}
      <div className="relative px-4 sm:px-5 mt-3 mb-4">
        {(accepted.length + pending.length > 0) ? (
          <>
            <p className="text-[clamp(10px,1.5vw,12px)] font-semibold text-white/95 mb-1">Parrainages</p>
            <div
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2
                         backdrop-blur-sm min-h-16"
            >
              <div className="flex flex-wrap gap-2 items-start content-start">
                {accepted.map((s) => <SponsorChip key={`a-${s.id}`} s={s} />)}
                {pending.map((s) => <SponsorChip key={`p-${s.id}`} s={s} pending />)}
              </div>
            </div>
          </>
        ) : (
          <div className="h-16 flex items-center justify-center text-xs text-white/85 border border-dashed border-white/20 rounded-lg px-3 backdrop-blur-sm bg-white/5">
            Aucun parrain pour l’instant
          </div>
        )}
      </div>

      {/* CTA */}
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
        className={`absolute top-3 right-3 h-10 w-10 rounded-xl z-10 flex items-center justify-center transition
                    backdrop-blur border border-white/30 bg-white/10 hover:bg-white/15
                    ${isActionDisabled ? "opacity-70 cursor-not-allowed" : ""}`}
        style={{
          boxShadow: "inset 0 0 0 2px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.15)",
          backgroundImage: "linear-gradient(135deg,#10B98155,#00000055,#EF444455)",
        }}
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
    </motion.div>
  );
}

/* ---------------- sub ---------------- */
function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-white/80">{label}</div>
      <div className="leading-tight">
        <span className="text-[clamp(14px,2.2vw,20px)] font-semibold tabular-nums text-white">{value}</span>
        {unit && <span className="ml-1 text-[11px] text-white/80 align-baseline md:hidden">{unit}</span>}
        {unit && <div className="hidden md:block mt-0.5 text-[11px] text-white/70">{unit}</div>}
      </div>
    </div>
  );
}

/* ---------- Memo + equality check (évite les re-renders) ---------- */
function areEqual(prev: ArtistCardProps, next: ArtistCardProps) {
  if (prev.artist.key !== next.artist.key) return false;
  if (prev.runner.id !== next.runner.id) return false;
  if (prev.isMain !== next.isMain) return false;
  if (prev.isTop !== next.isTop) return false;
  if (prev.processing !== next.processing) return false;
  if (prev.isActionDisabled !== next.isActionDisabled) return false;
  if (prev.myLinkStatus !== next.myLinkStatus) return false;
  if (prev.accepted.length !== next.accepted.length) return false;
  if (prev.pending.length !== next.pending.length) return false;
  if (prev.potentialCHF !== next.potentialCHF) return false;
  return true;
}

export default memo(ArtistCardInner, areEqual);
