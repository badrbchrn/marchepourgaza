import { useEffect, useMemo, useState, useRef, useCallback, startTransition, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
const RunnerCard = lazy(() => import("@/components/RunnerCard"));

import {
  Sparkles,
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  Users,
  UserCheck,
  Handshake,
  Loader2,
  AlertTriangle,
  Search,
  Clock,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function Participer() {
  const [user, setUser] = useState<any>(null);
  const [runners, setRunners] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{ id: string | null; open: boolean; label?: string }>({
    id: null,
    open: false,
    label: undefined,
  });

  const GAZA_TEXT = "bg-clip-text text-transparent bg-[linear-gradient(90deg,#007a3d,#000,#ce1126)]";
  const GAZA_BG = "bg-[linear-gradient(90deg,#007a3d,#000,#ce1126)] text-white";

  const MAIN_RUNNER_ID = import.meta.env.VITE_LYAN_ID as string | undefined;
  const TOP_PARRAINS_LIMIT = 1;

  const computeChunk = () => {
    const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
    // @ts-ignore
    const saveData = typeof navigator !== "undefined" && navigator?.connection?.saveData;
    return (isMobile || saveData) ? 6 : 9;
  };
  const CHUNK = useMemo(() => computeChunk(), []);
  const INITIAL_CHUNK = CHUNK;
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHUNK);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const normalize = useCallback((s: string | undefined | null) => {
    if (!s) return "";
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }, []);
  useEffect(() => {
    setVisibleCount(INITIAL_CHUNK);
  }, [nameQuery, INITIAL_CHUNK]);

  const isTabVisibleRef = useRef<boolean>(typeof document !== "undefined" ? document.visibilityState === "visible" : true);

  const prefersReducedMotion = useReducedMotion();

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const isProfileComplete = (p: any) =>
    !!p?.full_name && p.full_name.trim().length >= 2 &&
    !!p?.city && p.city.trim().length >= 2 &&
    !!p?.phone && p.phone.trim().length >= 6;

  const openConfirm = (id: string, label?: string) => setConfirmState({ id, open: true, label });
  const closeConfirm = () => setConfirmState({ id: null, open: false, label: undefined });
  const confirmCancel = async () => {
    if (!confirmState.id) return;
    await cancelSponsorship(confirmState.id);
    closeConfirm();
  };

  const toggleSelfSponsorship = async () => {
    if (!user) return showToast("error", "Connectez-vous pour utiliser cette option");
    if (user.role !== "runner") return showToast("error", "Réservé aux marcheurs");
    if (!isProfileComplete(user)) {
      return showToast("error", "Complétez votre profil avant d’activer l’auto-parrainage.");
    }

    setProcessingId(user.id);

    const { data: existing, error: fetchError } = await supabase
      .from("sponsorships")
      .select("id, status")
      .eq("runner_id", user.id)
      .eq("sponsor_id", user.id)
      .maybeSingle();

    if (fetchError) {
      showToast("error", "Erreur : " + fetchError.message);
      setProcessingId(null);
      return;
    }

    if (existing) {
      const { error: deleteError } = await supabase.from("sponsorships").delete().eq("id", existing.id);
      if (deleteError) showToast("error", "Erreur : " + deleteError.message);
      else showToast("info", "Auto-parrainage annulé");
      await fetchData();
      setProcessingId(null);
      return;
    }

    const { error: insertError } = await supabase.from("sponsorships").insert({
      sponsor_id: user.id,
      runner_id: user.id,
      pledge_per_km: user.desired_pledge || 1,
      max_amount: (user.desired_pledge || 1) * (user.expected_km || 0),
      status: "accepted",
    });

    if (insertError) showToast("error", "Erreur : " + insertError.message);
    else showToast("success", "Auto-parrainage activé !");
    await fetchData();
    setProcessingId(null);
  };

  const sendSponsorshipRequest = async (runnerId: string) => {
    if (!user) return showToast("error", "Connectez-vous pour parrainer");
    if (!isProfileComplete(user)) {
      return showToast("error", "Complétez d'abord votre profil (nom, ville, téléphone).");
    }
    if (runnerId === user.id) {
      return showToast("error", "Vous ne pouvez pas vous parrainer vous-même.");
    }

    setProcessingId(runnerId);

    const { data: existing } = await supabase
      .from("sponsorships")
      .select("id, status")
      .eq("runner_id", runnerId)
      .eq("sponsor_id", user.id)
      .neq("status", "rejected")
      .maybeSingle();

    if (existing) {
      showToast("info", "Une demande est déjà en cours ou acceptée.");
      setProcessingId(null);
      return;
    }

    const runner = runners.find((r) => r.id === runnerId);
    const { error } = await supabase.from("sponsorships").insert({
      sponsor_id: user.id,
      runner_id: runnerId,
      pledge_per_km: runner?.desired_pledge || 1,
      max_amount: (runner?.desired_pledge || 1) * (runner?.expected_km || 0),
      status: "pending",
    });

    if (error) showToast("error", "Une erreur est survenue lors de l’envoi de la demande.");
    else showToast("success", "Demande envoyée avec succès.");
    await fetchData();
    setProcessingId(null);
  };

  const updateSponsorshipStatus = async (id: string, status: "accepted" | "rejected") => {
    setProcessingId(id);
    const { error } = await supabase.from("sponsorships").update({ status }).eq("id", id);

    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("success", status === "accepted" ? "Parrainage accepté !" : "Demande refusée");

    await fetchData();
    setProcessingId(null);
  };

  const cancelSponsorship = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from("sponsorships").delete().eq("id", id);
    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("info", "Parrainage annulé");
    await fetchData();
    setProcessingId(null);
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user ?? null;

      let profileData: any = null;
      if (currentUser) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
        profileData = p || null;
      }
      startTransition(() => setUser(currentUser ? { ...currentUser, ...profileData } : null));

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, city, phone, expected_km, desired_pledge, role, is_artist");

      const { data: allSponsorships } = await supabase
        .from("sponsorships")
        .select(`
          id, status, pledge_per_km, max_amount, created_at,
          runner:runner_id ( id, full_name, city, expected_km, desired_pledge, role, is_artist ),
          sponsor:sponsor_id ( id, full_name )
        `);

      const filtered = (profilesData || []).filter((r: any) => {
        const baseOk = !!r.full_name && !!r.city;
        if (!baseOk) return false;
        if (r.is_artist === true) return true;
        const isRunnerOk =
          typeof r.expected_km === "number" && r.expected_km > 0 &&
          typeof r.desired_pledge === "number" && r.desired_pledge > 0;
        return isRunnerOk;
      });

      const allRunners = (profilesData || []).filter((r: any) => r.role === "runner" && !!r.full_name);
      const accepted = (allSponsorships || []).filter((s: any) => s.status === "accepted");
      const acceptedSet = new Set(accepted.map((s: any) => s?.runner?.id).filter(Boolean));
      const waiting = allRunners.filter((r: any) => !acceptedSet.has(r.id));
      startTransition(() => setWaitingCount(waiting.length));

      startTransition(() => {
        setRunners(filtered);
        setSponsorships(allSponsorships || []);
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    fetchData();

    const ch = supabase
      .channel("sponsorships-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsorships" }, fetchData)
      .subscribe();

    const onVis = () => { isTabVisibleRef.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    const interval = setInterval(() => {
      if (isTabVisibleRef.current) fetchData();
    }, 30000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
    const rootMargin = isMobile ? "300px 0px" : "600px 0px";
    const io = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e.isIntersecting) setVisibleCount((v) => v + CHUNK);
      },
      { rootMargin }
    );
    io.observe(loadMoreRef.current);
    return () => io.disconnect();
  }, [CHUNK]);

  const sponsorsByRunner = useMemo(() => {
    const map: Record<string, { accepted: Array<any>; pending: Array<any> }> = {};
    (sponsorships || []).forEach((s) => {
      const rid = s.runner?.id;
      if (!rid) return;
      if (!map[rid]) map[rid] = { accepted: [], pending: [] };
      if (s.status === "accepted") map[rid].accepted.push(s);
      else if (s.status === "pending") map[rid].pending.push(s);
    });
    return map;
  }, [sponsorships]);

  const acceptedOnly = useMemo(() => sponsorships.filter((s) => s.status === "accepted"), [sponsorships]);

  const potentialByRunner = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of acceptedOnly) {
      const rid = s.runner?.id;
      if (!rid) continue;
      const km = Number(s.runner?.expected_km) || 0;
      const line = (Number(s.pledge_per_km) || 0) * km;
      map.set(rid, (map.get(rid) || 0) + (Number.isFinite(line) ? line : 0));
    }
    return map;
  }, [acceptedOnly]);

  const potentialBySponsor = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of acceptedOnly) {
      const sid = s.sponsor?.id;
      if (!sid) continue;
      const km = Number(s.runner?.expected_km) || 0;
      const line = (Number(s.pledge_per_km) || 0) * km;
      map.set(sid, (map.get(sid) || 0) + (Number.isFinite(line) ? line : 0));
    }
    return map;
  }, [acceptedOnly]);

  const globalPotential = useMemo(
    () =>
      acceptedOnly.reduce((sum, s) => {
        const km = Number(s.runner?.expected_km) || 0;
        const line = (Number(s.pledge_per_km) || 0) * km;
        return sum + (Number.isFinite(line) ? line : 0);
      }, 0),
    [acceptedOnly]
  );

  const globalAcceptedCount = acceptedOnly.length;

  const { mainProfile, artistsGroup, topGroup, remainingGroup } = useMemo(() => {
    const list = [...runners];

    const main = MAIN_RUNNER_ID ? list.find((p) => p.id === MAIN_RUNNER_ID) : null;

    const artists = list
      .filter((p) => p.is_artist === true)
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "fr", { sensitivity: "base" }));

    const runnerPool = list.filter((p) => p.is_artist !== true && (!MAIN_RUNNER_ID || p.id !== MAIN_RUNNER_ID));

    const rankedCounts = runnerPool
      .map((r) => ({ r, count: sponsorsByRunner[r.id]?.accepted.length || 0 }))
      .sort((a, b) => b.count - a.count);

    const topParrains = rankedCounts.slice(0, TOP_PARRAINS_LIMIT).map((x) => x.r);

    const topIds = new Set(topParrains.map((x) => x.id));
    const remaining = runnerPool
      .filter((r) => !topIds.has(r.id))
      .sort((a, b) => (potentialByRunner.get(b.id) || 0) - (potentialByRunner.get(a.id) || 0));

    return {
      mainProfile: main ? [main] : [],
      artistsGroup: artists,
      topGroup: topParrains,
      remainingGroup: remaining,
    };
  }, [runners, sponsorsByRunner, potentialByRunner, MAIN_RUNNER_ID, TOP_PARRAINS_LIMIT]);

  const filteredGroups = useMemo(() => {
    if (!nameQuery) return { main: mainProfile, artists: artistsGroup, top: topGroup, remaining: remainingGroup };
    const q = normalize(nameQuery);
    const f = (arr: any[]) => arr.filter((r) => normalize(r.full_name).includes(q));
    return {
      main: f(mainProfile),
      artists: f(artistsGroup),
      top: f(topGroup),
      remaining: f(remainingGroup),
    };
  }, [nameQuery, normalize, mainProfile, artistsGroup, topGroup, remainingGroup]);

  const chf = (n: number) =>
    new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 2 }).format(n);

  const formatCHF = useCallback(
    (n: number) => new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 2 }).format(n),
    []
  );

  const fromNow = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

    const abs = Math.abs(diff);
    const sec = Math.floor(abs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    const sign = diff >= 0 ? -1 : 1;

    if (sec < 60) return rtf.format(sign * sec, "second");
    if (min < 60) return rtf.format(sign * min, "minute");
    if (hr < 24) return rtf.format(sign * hr, "hour");
    if (day < 30) return rtf.format(sign * day, "day");

    const month = Math.floor(day / 30);
    if (month < 12) return rtf.format(sign * month, "month");

    const year = Math.floor(month / 12);
    return rtf.format(sign * year, "year");
  };

  const pendingForMeAsRunner = useMemo(
    () => sponsorships.filter((s) => s.status === "pending" && s.runner?.id === user?.id),
    [sponsorships, user?.id]
  );
  const pendingSentByMe = useMemo(
    () => sponsorships.filter((s) => s.status === "pending" && s.sponsor?.id === user?.id),
    [sponsorships, user?.id]
  );
  const pendingCount = pendingForMeAsRunner.length + pendingSentByMe.length;

  const selfSponsor = useMemo(
    () => (user ? sponsorships.find((s) => s.runner?.id === user.id && s.sponsor?.id === user.id) || null : null),
    [sponsorships, user?.id]
  );
  const selfSponsorActive = !!selfSponsor;

  const myActive = useMemo(
    () => sponsorships.filter((s) => s.status === "accepted" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id)),
    [sponsorships, user?.id]
  );
  const myActiveTotal = useMemo(
    () =>
      myActive.reduce((sum, s) => {
        const km = Number(s.runner?.expected_km) || 0;
        const line = (Number(s.pledge_per_km) || 0) * km;
        return sum + (Number.isFinite(line) ? line : 0);
      }, 0),
    [myActive]
  );

  const [pendingTab, setPendingTab] = useState<"to_me" | "sent">("to_me");
  useEffect(() => {
    if (pendingForMeAsRunner.length > 0) setPendingTab("to_me");
    else if (pendingSentByMe.length > 0) setPendingTab("sent");
  }, [pendingForMeAsRunner.length, pendingSentByMe.length]);

  const activeScrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollActive = useCallback((dir: "left" | "right") => {
    const node = activeScrollerRef.current;
    if (!node) return;
    const delta = Math.round(node.clientWidth * 0.85) * (dir === "left" ? -1 : 1);
    node.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500 text-lg">Chargement...</div>;
  }

  const isGuest = !user;
  const isIncomplete = user ? !isProfileComplete(user) : false;
  const isReadOnly = isGuest || isIncomplete;

  const myRunnerPotential = user?.role === "runner" ? (potentialByRunner.get(user.id) || 0) : 0;
  const mySponsorPotential = user ? (potentialBySponsor.get(user.id) || 0) : 0;

  const computeVisibleByGroup = (groups: { main: any[]; artists: any[]; top: any[]; remaining: any[] }) => {
    let left = visibleCount;
    const take = (arr: any[]) => {
      const out = arr.slice(0, Math.max(0, left));
      left = Math.max(0, left - out.length);
      return out;
    };
    const mainV = take(groups.main);
    const artistsV = take(groups.artists);
    const topV = take(groups.top);
    const remainingV = take(groups.remaining);
    return { mainV, artistsV, topV, remainingV, allCount: groups.main.length + groups.artists.length + groups.top.length + groups.remaining.length };
  };

  const { mainV, artistsV, topV, remainingV, allCount } = computeVisibleByGroup(filteredGroups);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-3 md:px-6 py-10 md:py-16">
      {(isGuest || isIncomplete) && (
        <>
          <motion.div
            className="fixed left-0 right-0 z-40 pointer-events-none top-[70px] sm:top-[82px]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            role="alert"
            aria-live="polite"
          >
            <div className="mx-auto px-3">
              <div className="pointer-events-auto mx-auto w-fit max-w-[92vw]">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 text-red-700 ring-1 ring-red-200/70 shadow-sm px-2.5 py-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  <p className="text-[12px] sm:text-[13px] font-medium leading-none whitespace-normal">
                    {isGuest ? (
                      <>
                        Vous n’êtes pas connecté.{" "}
                        <a href="/login" className="underline underline-offset-2 decoration-red-300 hover:decoration-red-500">
                          Se connecter
                        </a>{" "}
                        <span className="text-red-300 mx-1">•</span>{" "}
                        <a href="/signup" className="underline underline-offset-2 decoration-red-300 hover:decoration-red-500">
                          Créer un compte
                        </a>
                      </>
                    ) : (
                      <>
                        Votre profil est incomplet.{" "}
                        <a href="/onboarding" className="underline underline-offset-2 decoration-red-300 hover:decoration-red-500">
                          Compléter mon profil
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="h-8 sm:h-10" />
        </>
      )}

      <motion.div
        className="text-center mb-6 md:mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
      >
        <div className="flex justify-center items-center gap-3 mb-1.5">
          <Handshake className="w-8 h-8 text-gray-700" />
          <h1 className="text-3xl md:text-4xl font-extrabold">
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              Espace Parrainage
            </span>
          </h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base leading-snug">
          Retrouvez vos parrainages, vos demandes en attentes ainsi que les marcheurs/marcheuses disponibles à parrainer.
        </p>
      </motion.div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          title={user?.role === "runner" ? "Votre potentiel (marcheur)" : "Potentiel global (marcheurs)"}
          value={chf(user?.role === "runner" ? myRunnerPotential : globalPotential)}
          hint={user?.role === "runner" ? "Somme de vos parrainages acceptés" : `${globalAcceptedCount} parrainages acceptés`}
          valueClass={user?.role === "runner" ? undefined : "text-emerald-600"}
        />

        {user ? (
          <StatCard
            title="Votre potentiel (parrain)"
            value={chf(mySponsorPotential)}
            hint="Somme de vos engagements acceptés"
          />
        ) : (
          <StatCard
            title="En attente de parrain"
            value={`${waitingCount}`}
            hint="Marcheurs sans parrain"
            valueClass="text-cyan-600"
          />
        )}

        <StatCard
          title="Parrainages acceptés"
          value={`${globalAcceptedCount}`}
          hint="Nombre total sur la plateforme"
          valueClass={GAZA_TEXT}
        />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-medium text-white backdrop-blur-xl border border-white/10 z-[9999]
              ${toast.type === "success" ? "bg-green-600/80" : toast.type === "error" ? "bg-red-600/80" : "bg-gray-700/80"}`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" && <CheckCircle className="w-4 h-4" />}
              {toast.type === "error" && <XCircle className="w-4 h-4" />}
              {toast.type === "info" && <Info className="w-4 h-4" />}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8 md:gap-10 max-w-7xl mx-auto">
        {user?.role === "runner" && (
          <div className="text-center -mt-2">
            <button
              onClick={toggleSelfSponsorship}
              disabled={processingId === user.id || isReadOnly}
              className={`group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm
                ${isReadOnly ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : selfSponsorActive ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:brightness-110"
                  : "bg-gradient-to-r from-green-600 via-black to-red-600 text-white hover:brightness-110"}`}
            >
              {processingId === user.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : selfSponsorActive ? (
                <>
                  <XCircle className="w-4 h-4 text-white/90" />
                  <span>Annuler l’auto-parrainage</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Activer l’auto-parrainage</span>
                  <Handshake className="w-4 h-4 text-white/90 opacity-90" />
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              {selfSponsorActive ? "(Tu es actuellement ton propre parrain)" : "(Permet de te soutenir symboliquement toi-même)"}
            </p>
          </div>
        )}

        {user && (
          <Section
            title={
              <span className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Demandes en attente
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-700 text-xs font-semibold px-2 py-0.5 border border-cyan-200">
                  {pendingCount}
                </span>
              </span>
            }
            icon={null}
            color="from-cyan-600 via-sky-700 to-cyan-800"
          >
            {pendingCount === 0 ? (
              <EmptyState text="Aucune demande en attente" />
            ) : (
              <div className="space-y-5">
                <div className="inline-flex items-center rounded-2xl border border-cyan-200 bg-cyan-50/60 p-1">
                  <button
                    onClick={() => setPendingTab("to_me")}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition ${
                      pendingTab === "to_me" ? "bg-white shadow text-cyan-900" : "text-cyan-700 hover:bg-white/70"
                    }`}
                  >
                    À traiter
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-700 text-[11px] font-semibold px-1.5 py-0.5 border border-cyan-200">
                      {pendingForMeAsRunner.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setPendingTab("sent")}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition ${
                      pendingTab === "sent" ? "bg-white shadow text-cyan-900" : "text-cyan-700 hover:bg-white/70"
                    }`}
                  >
                    Envoyées
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-700 text-[11px] font-semibold px-1.5 py-0.5 border border-cyan-200">
                      {pendingSentByMe.length}
                    </span>
                  </button>
                </div>

                {pendingTab === "to_me" && (
                  <div className="grid gap-3">
                    {pendingForMeAsRunner.map((s) => {
                      const km = Number(s.runner?.expected_km) || 0;
                      const pledge = Number(s.pledge_per_km) || 0;
                      const potential = pledge * km;
                      return (
                        <PendingCard
                          key={s.id}
                          leftTitle={`${s.sponsor?.full_name || "Parrain inconnu"} souhaite parrainer ${s.runner?.full_name || ""}`}
                          chips={[
                            { k: "Contribution", v: `${formatCHF(pledge)}/km` },
                            { k: "Potentiel", v: formatCHF(potential) },
                          ]}
                          metaTime={fromNow(s.created_at)}
                          rightActions={
                            <div className="flex gap-2 w-full sm:w-auto justify-center items-center">
                              <ActionButton
                                text="Accepter"
                                color="green"
                                onClick={() => updateSponsorshipStatus(s.id, "accepted")}
                                loading={processingId === s.id}
                              />
                              <ActionButton
                                text="Refuser"
                                color="red"
                                onClick={() => updateSponsorshipStatus(s.id, "rejected")}
                                loading={processingId === s.id}
                              />
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                )}

                {pendingTab === "sent" && (
                  <div className="grid gap-3">
                    {pendingSentByMe.map((s) => {
                      const km = Number(s.runner?.expected_km) || 0;
                      const pledge = Number(s.pledge_per_km) || 0;
                      const potential = pledge * km;
                      return (
                        <PendingCard
                          key={s.id}
                          leftTitle={`Vous souhaitez parrainer ${s.runner?.full_name || ""}`}
                          chips={[
                            { k: "Contribution", v: `${formatCHF(pledge)}/km` },
                            { k: "Potentiel", v: formatCHF(potential) },
                          ]}
                          metaTime={fromNow(s.created_at)}
                          rightActions={
                            <button
                              onClick={() => openConfirm(s.id, "Annuler la demande ?")}
                              disabled={processingId === s.id}
                              className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 w-10 h-10"
                              title="Annuler la demande"
                              aria-label="Annuler la demande"
                            >
                              {processingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {user && (
          <Section title="Parrainages actifs" icon={<UserCheck className="w-5 h-5" />} color="from-[#007a3d] via-black to-[#ce1126]">
            {myActive.length === 0 ? (
              <EmptyState text="Aucun parrainage actif" />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-between">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <span className="rounded-full border border-gray-200 bg-white/70 backdrop-blur px-2.5 py-1 text-gray-700">
                      Liens actifs : <strong className="text-gray-900">{myActive.length}</strong>
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white/70 backdrop-blur px-2.5 py-1 text-gray-700">
                      Total potentiel : <strong className="text-gray-900">{formatCHF(myActiveTotal)}</strong>
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      onClick={() => scrollActive("left")}
                      className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                      aria-label="Faire défiler vers la gauche"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollActive("right")}
                      className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                      aria-label="Faire défiler vers la droite"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div
                  className="relative rounded-2xl border border-gray-200 bg-white/60 backdrop-blur p-2 sm:p-3 shadow-sm"
                  role="region"
                  aria-label="Parrainages actifs"
                >
                  <div
                    ref={activeScrollerRef}
                    className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent md:hidden"
                  >
                    {myActive.map((s) => (
                      <ActiveCard
                        key={s.id}
                        s={s}
                        userId={user?.id}
                        GAZA_BG={GAZA_BG}
                        GAZA_TEXT={GAZA_TEXT}
                        formatCHF={formatCHF}
                        fromNow={fromNow}
                        openConfirm={openConfirm}
                        processingId={processingId}
                      />
                    ))}
                  </div>

                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {myActive.map((s) => (
                      <ActiveCard
                        key={s.id}
                        s={s}
                        userId={user?.id}
                        GAZA_BG={GAZA_BG}
                        GAZA_TEXT={GAZA_TEXT}
                        formatCHF={formatCHF}
                        fromNow={fromNow}
                        openConfirm={openConfirm}
                        processingId={processingId}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}

        <Section title="Profils à soutenir" icon={<Users className="w-5 h-5" />} color="from-blue-600 via-black to-green-600">
          <div className="mb-4 flex justify-end">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                inputMode="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Rechercher par nom…"
                aria-label="Rechercher un profil par nom"
                className="w-full rounded-xl border border-gray-200 bg-white/80 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                autoComplete="off"
              />
            </div>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Array.from({ length: Math.min(visibleCount, 9) }).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl border border-gray-200 bg-white/60 animate-pulse" />
                ))}
              </div>
            }
          >
            {allCount === 0 ? (
              <EmptyState text="Aucun profil ne correspond à votre recherche." />
            ) : (
              <div className="space-y-8">
                {mainV.length > 0 && (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {mainV.map((runner: any) => {
                        const agg = sponsorsByRunner[runner.id] || { accepted: [], pending: [] };
                        const myLink = user
                          ? sponsorships.find((s) => s.runner?.id === runner.id && s.sponsor?.id === user?.id && ["pending", "accepted"].includes(s.status))
                          : null;
                        const isSelf = user ? runner.id === user.id : false;
                        const isProcessingThisCard = processingId === runner.id || processingId === myLink?.id;
                        const actionDisabled = isSelf || isReadOnly;
                        const runnerPotential = potentialByRunner.get(runner.id) || 0;
                        const myLinkStatus: "pending" | "accepted" | null =
                          myLink ? (myLink.status === "accepted" ? "accepted" : "pending") : null;

                        return (
                          <RunnerCard
                            key={runner.id}
                            runner={runner}
                            isMain={true}
                            isTop={false}
                            accepted={agg.accepted}
                            pending={agg.pending}
                            potentialCHF={runnerPotential}
                            processing={isProcessingThisCard}
                            myLinkStatus={myLinkStatus}
                            isActionDisabled={actionDisabled}
                            onAction={() => {
                              if (actionDisabled) {
                                return showToast("error", isGuest ? "Connectez-vous pour parrainer un marcheur." : "Complétez d’abord votre profil.");
                              }
                              if (myLink) return openConfirm(myLink.id, "Annuler cette demande ?");
                              return sendSponsorshipRequest(runner.id);
                            }}
                            formatCurrency={formatCHF}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {artistsV.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Artistes</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {artistsV.map((runner: any) => {
                        const agg = sponsorsByRunner[runner.id] || { accepted: [], pending: [] };
                        const myLink = user
                          ? sponsorships.find((s) => s.runner?.id === runner.id && s.sponsor?.id === user?.id && ["pending", "accepted"].includes(s.status))
                          : null;
                        const isSelf = user ? runner.id === user.id : false;
                        const isProcessingThisCard = processingId === runner.id || processingId === myLink?.id;
                        const actionDisabled = isSelf || isReadOnly;
                        const runnerPotential = potentialByRunner.get(runner.id) || 0;
                        const myLinkStatus: "pending" | "accepted" | null =
                          myLink ? (myLink.status === "accepted" ? "accepted" : "pending") : null;

                        return (
                          <RunnerCard
                            key={runner.id}
                            runner={runner}
                            isMain={false}
                            isTop={false}
                            accepted={agg.accepted}
                            pending={agg.pending}
                            potentialCHF={runnerPotential}
                            processing={isProcessingThisCard}
                            myLinkStatus={myLinkStatus}
                            isActionDisabled={actionDisabled}
                            onAction={() => {
                              if (actionDisabled) {
                                return showToast("error", isGuest ? "Connectez-vous pour parrainer un marcheur." : "Complétez d’abord votre profil.");
                              }
                              if (myLink) return openConfirm(myLink.id, "Annuler cette demande ?");
                              return sendSponsorshipRequest(runner.id);
                            }}
                            formatCurrency={formatCHF}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {(topV.length > 0 || remainingV.length > 0) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Marcheurs</h3>
                    {topV.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 mb-2">Meilleur nombre de parrains</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                          {topV.map((runner: any) => {
                            const agg = sponsorsByRunner[runner.id] || { accepted: [], pending: [] };
                            const myLink = user
                              ? sponsorships.find((s) => s.runner?.id === runner.id && s.sponsor?.id === user?.id && ["pending", "accepted"].includes(s.status))
                              : null;
                            const isSelf = user ? runner.id === user.id : false;
                            const isProcessingThisCard = processingId === runner.id || processingId === myLink?.id;
                            const actionDisabled = isSelf || isReadOnly;
                            const runnerPotential = potentialByRunner.get(runner.id) || 0;
                            const myLinkStatus: "pending" | "accepted" | null =
                              myLink ? (myLink.status === "accepted" ? "accepted" : "pending") : null;

                            return (
                              <div className="rounded-2xl bg-sky-50/60 border border-sky-100 p-2">
                                <RunnerCard
                                  key={runner.id}
                                  runner={runner}
                                  isMain={false}
                                  isTop={true}
                                  accepted={agg.accepted}
                                  pending={agg.pending}
                                  potentialCHF={runnerPotential}
                                  processing={isProcessingThisCard}
                                  myLinkStatus={myLinkStatus}
                                  isActionDisabled={actionDisabled}
                                  onAction={() => {
                                    if (actionDisabled) {
                                      return showToast("error", isGuest ? "Connectez-vous pour parrainer un marcheur." : "Complétez d’abord votre profil.");
                                    }
                                    if (myLink) return openConfirm(myLink.id, "Annuler cette demande ?");
                                    return sendSponsorshipRequest(runner.id);
                                  }}
                                  formatCurrency={formatCHF}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {remainingV.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 mb-2">Meilleur potentiel</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {remainingV.map((runner: any) => {
                            const agg = sponsorsByRunner[runner.id] || { accepted: [], pending: [] };
                            const myLink = user
                              ? sponsorships.find((s) => s.runner?.id === runner.id && s.sponsor?.id === user?.id && ["pending", "accepted"].includes(s.status))
                              : null;
                            const isSelf = user ? runner.id === user.id : false;
                            const isProcessingThisCard = processingId === runner.id || processingId === myLink?.id;
                            const actionDisabled = isSelf || isReadOnly;
                            const runnerPotential = potentialByRunner.get(runner.id) || 0;
                            const myLinkStatus: "pending" | "accepted" | null =
                              myLink ? (myLink.status === "accepted" ? "accepted" : "pending") : null;

                            return (
                              <RunnerCard
                                key={runner.id}
                                runner={runner}
                                isMain={false}
                                isTop={false}
                                accepted={agg.accepted}
                                pending={agg.pending}
                                potentialCHF={runnerPotential}
                                processing={isProcessingThisCard}
                                myLinkStatus={myLinkStatus}
                                isActionDisabled={actionDisabled}
                                onAction={() => {
                                  if (actionDisabled) {
                                    return showToast("error", isGuest ? "Connectez-vous pour parrainer un marcheur." : "Complétez d’abord votre profil.");
                                  }
                                  if (myLink) return openConfirm(myLink.id, "Annuler cette demande ?");
                                  return sendSponsorshipRequest(runner.id);
                                }}
                                formatCurrency={formatCHF}
                              />
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </Suspense>

          {allCount > 0 && (mainV.length + artistsV.length + topV.length + remainingV.length) < allCount && (
            <div ref={loadMoreRef} className="mt-4 flex justify-center">
              <button
                onClick={() => setVisibleCount((v) => v + CHUNK)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50"
              >
                Charger plus
              </button>
            </div>
          )}
        </Section>
      </div>

      <AnimatePresence>
        {confirmState.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4"
            onClick={closeConfirm}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={`px-5 py-3 ${GAZA_BG}`}>
                <h3 className="text-sm font-bold">Confirmation</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">
                  {confirmState.label || "Voulez-vous vraiment annuler ?"}
                </p>
              </div>
              <div className="px-5 pb-5 pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={closeConfirm}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Non
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Oui, annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, color, children }: any) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.section
      className="backdrop-blur-sm md:backdrop-blur-md bg-white/70 rounded-3xl border border-gray-200 shadow-md p-6 md:p-8 contain-content will-change-transform"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
      viewport={{ once: true, margin: "-20% 0px -10% 0px" }}
    >
      <h2 className={`text-lg md:text-2xl font-bold mb-6 flex items-center gap-3 text-gray-800 bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        {icon} {title}
      </h2>
      {children}
    </motion.section>
  );
}

function Card({ children }: any) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/60 backdrop-blur-sm md:backdrop-blur-md shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-all contain-content">
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  valueClass,
  titleClass,
}: {
  title: string;
  value: string;
  hint?: string;
  valueClass?: string;
  titleClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className={`text-xs ${titleClass ?? "text-slate-600"}`}>{title}</p>
      <p className={`text-2xl font-extrabold mt-0.5 ${valueClass ?? "text-slate-900"}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function ActionButton({ text, color, onClick, loading }: any) {
  const colors = color === "green" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl text-white ${colors} transition-all disabled:opacity-50 w-full sm:w-auto`}
    >
      {loading ? "..." : text}
    </button>
  );
}

function EmptyState({ text }: any) {
  return <p className="text-gray-500 italic text-sm">{text}</p>;
}

function InfoTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/70 border border-gray-200 px-3 py-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-800">{children}</dd>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 px-2.5 py-1.5 flex items-center justify-between">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-[12px] font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function PendingCard({
  leftTitle,
  chips,
  metaTime,
  rightActions,
}: {
  leftTitle: string;
  chips: Array<{ k: string; v: string }>;
  metaTime?: string;
  rightActions?: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-cyan-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-gray-900 font-medium truncate">{leftTitle}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {chips.map((m) => (
            <span
              key={m.k}
              className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-[11px] text-cyan-800"
            >
              <strong className="text-cyan-900">{m.k}:</strong> {m.v}
            </span>
          ))}
          {metaTime && (
            <span className="inline-flex items-center gap-1 text-gray-500 text-[11px]">
              <Clock className="w-3.5 h-3.5" /> {metaTime}
            </span>
          )}
        </div>
      </div>
      <div className="sm:ml-auto shrink-0 flex gap-2 w-full sm:w-auto justify-center items-center">{rightActions}</div>
    </div>
  );
}

function ActiveCard({
  s,
  userId,
  GAZA_BG,
  GAZA_TEXT,
  formatCHF,
  fromNow,
  openConfirm,
  processingId,
}: {
  s: any;
  userId: string;
  GAZA_BG: string;
  GAZA_TEXT: string;
  formatCHF: (n: number) => string;
  fromNow: (iso?: string) => string;
  openConfirm: (id: string, label?: string) => void;
  processingId: string | null;
}) {
  const isRunner = s.runner?.id === userId;
  const runner = s.runner;
  const sponsor = s.sponsor;
  const km = Number(runner?.expected_km) || 0;
  const linePotential = (Number(s.pledge_per_km) || 0) * km;

  return (
    <article
      className="shrink-0 snap-start min-w-[260px] sm:min-w-[320px] rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
      aria-label={`Parrainage de ${runner?.full_name || "marcheur"} ${isRunner ? "par" : "avec"} ${sponsor?.full_name || ""}`}
    >
      <header className="flex items-center gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full ${GAZA_BG} flex items-center justify-center font-bold text-[11px]`}>
          {String(runner?.full_name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{runner?.full_name || "Marcheur inconnu"}</p>
          <p className={`text-[12px] leading-none font-semibold ${GAZA_TEXT}`}>
            {isRunner ? `Parrain : ${sponsor?.full_name || "Inconnu"}` : `Vous parrainez ce marcheur`}
          </p>
        </div>
        <button
          onClick={() => openConfirm(s.id, "Annuler ce parrainage ?")}
          className="ml-auto p-2 rounded-lg border border-gray-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
          title="Annuler le parrainage"
          aria-label="Annuler le parrainage"
          disabled={processingId === s.id}
        >
          {processingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
        <Pill label="Ville" value={runner?.city || "—"} />
        <Pill label="Objectif" value={`${km} km`} />
        <Pill label="Contribution" value={`${formatCHF(Number(s.pledge_per_km) || 0)}/km`} />
        <Pill label="Potentiel" value={formatCHF(linePotential)} />
      </div>

      <footer className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        <span>{fromNow(s.created_at)}</span>
      </footer>
    </article>
  );
}

/* Élément de ligne legacy utilisé ailleurs si nécessaire */
function PendingItem({
  title,
  metaLeft,
  createdAt,
  right,
  fromNow,
}: {
  title: React.ReactNode;
  metaLeft: Array<{ label: string; value: string }>;
  createdAt?: string;
  right?: React.ReactNode;
  fromNow: (iso?: string) => string;
}) {
  return (
    <div className="group flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-50 transition-colors px-3.5 py-3 sm:px-4 sm:py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-gray-900 font-medium truncate">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {metaLeft.map((m, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-cyan-200 px-2 py-0.5 text-[11px] text-gray-700">
              <strong className="text-gray-900">{m.label}:</strong> {m.value}
            </span>
          ))}
          {createdAt && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Clock className="w-3.5 h-3.5" /> {fromNow(createdAt)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 sm:mt-0 sm:ml-auto shrink-0 flex gap-2 w-full sm:w-auto justify-center items-center">{right}</div>
    </div>
  );
}
