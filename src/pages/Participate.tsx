import { useEffect, useMemo, useState, useRef, useCallback, startTransition, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
// ⬇️ Code-split le composant lourd
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
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function Participer() {
  const [user, setUser] = useState<any>(null);
  const [runners, setRunners] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Config
  const MAIN_RUNNER_ID = import.meta.env.VITE_LYAN_ID as string | undefined;
  const TOP_PARRAINS_LIMIT = 1;

  // 🚀 Progressive rendering
  const INITIAL_CHUNK = 9;
  const CHUNK = 9;
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHUNK);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 🔎 Recherche par nom
  const [nameQuery, setNameQuery] = useState("");
  const normalize = useCallback((s: string | undefined | null) => {
    if (!s) return "";
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }, []);
  useEffect(() => {
    setVisibleCount(INITIAL_CHUNK);
  }, [nameQuery]);

  // 🔕 Pas de polling agressif onglet caché
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

      startTransition(() => {
        setRunners(filtered);
        setSponsorships(allSponsorships || []);
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }, []);

  // Initial load + realtime + throttled polling
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

  // Infinite-scroll sentinel (progressively mount cards)
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e.isIntersecting) {
          setVisibleCount((v) => v + CHUNK);
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  const topRunnerIds = useMemo(() => {
    const pool = runners.filter((r) => r.is_artist !== true && (!MAIN_RUNNER_ID || r.id !== MAIN_RUNNER_ID));
    const ranked = pool
      .map((r) => ({ id: r.id, count: sponsorsByRunner[r.id]?.accepted.length || 0 }))
      .sort((a, b) => b.count - a.count);
    return new Set(ranked.slice(0, TOP_PARRAINS_LIMIT).map((x) => x.id));
  }, [runners, sponsorsByRunner, MAIN_RUNNER_ID, TOP_PARRAINS_LIMIT]);

  const orderedRunners = useMemo(() => {
    const list = [...runners];

    const main = MAIN_RUNNER_ID ? list.find((p) => p.id === MAIN_RUNNER_ID) : null;

    const artists = list
      .filter((p) => p.is_artist === true)
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "fr", { sensitivity: "base" }));

    const runnerPool = list.filter((p) => p.is_artist !== true && (!MAIN_RUNNER_ID || p.id !== MAIN_RUNNER_ID));

    const topParrains = runnerPool
      .map((r) => ({ r, count: sponsorsByRunner[r.id]?.accepted.length || 0 }))
      .sort((a, b) => b.count - a.count)
      .filter((_, idx) => idx < TOP_PARRAINS_LIMIT)
      .map((x) => x.r);

    const remaining = runnerPool
      .filter((r) => !topRunnerIds.has(r.id))
      .sort((a, b) => (potentialByRunner.get(b.id) || 0) - (potentialByRunner.get(a.id) || 0));

    const seen = new Set<string>();
    const result: any[] = [];

    if (main && !seen.has(main.id)) { result.push(main); seen.add(main.id); }
    for (const p of artists) if (!seen.has(p.id)) { result.push(p); seen.add(p.id); }
    for (const p of topParrains) if (!seen.has(p.id)) { result.push(p); seen.add(p.id); }
    for (const p of remaining) if (!seen.has(p.id)) { result.push(p); seen.add(p.id); }

    return result;
  }, [runners, sponsorsByRunner, potentialByRunner, MAIN_RUNNER_ID, TOP_PARRAINS_LIMIT, topRunnerIds]);

  // 🔎 Filtre final par recherche
  const filteredRunners = useMemo(() => {
    if (!nameQuery) return orderedRunners;
    const q = normalize(nameQuery);
    return orderedRunners.filter((r: any) => normalize(r.full_name).includes(q));
  }, [orderedRunners, nameQuery, normalize]);

  // ---- Utils ----
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
    const sec = Math.round(abs / 1000);
    const min = Math.round(sec / 60);
    const hr = Math.round(min / 60);
    const day = Math.round(hr / 24);
    if (sec < 60) return rtf.format(-Math.sign(diff) * sec, "seconds");
    if (min < 60) return rtf.format(-Math.sign(diff) * min, "minutes");
    if (hr < 24) return rtf.format(-Math.sign(diff) * hr, "hours");
    return rtf.format(-Math.sign(diff) * day, "days");
  };

  // ✅ Ces useMemo DOIVENT être avant tout return conditionnel
  const pendingForMeAsRunner = useMemo(
    () => sponsorships.filter((s) => s.status === "pending" && s.runner?.id === user?.id),
    [sponsorships, user?.id]
  );
  const pendingSentByMe = useMemo(
    () => sponsorships.filter((s) => s.status === "pending" && s.sponsor?.id === user?.id),
    [sponsorships, user?.id]
  );
  const pendingCount = pendingForMeAsRunner.length + pendingSentByMe.length;

  // ✅ Nettoyage de l’IIFE : calcul top-level, rendu stable
  const selfSponsor = useMemo(
    () => (user ? sponsorships.find((s) => s.runner?.id === user.id && s.sponsor?.id === user.id) || null : null),
    [sponsorships, user?.id]
  );
  const selfSponsorActive = !!selfSponsor;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500 text-lg">Chargement...</div>;
  }

  const isGuest = !user;
  const isIncomplete = user ? !isProfileComplete(user) : false;
  const isReadOnly = isGuest || isIncomplete;

  const myRunnerPotential = user?.role === "runner" ? (potentialByRunner.get(user.id) || 0) : 0;
  const mySponsorPotential = user ? (potentialBySponsor.get(user.id) || 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-3 md:px-6 py-10 md:py-16">
      {(isGuest || isIncomplete) && (
        <>
          {/* Bannière fixe sous l'AppShell */}
          <motion.div
            className="fixed left-0 right-0 z-50 pointer-events-none top-[72px] sm:top-[84px]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            role="alert"
            aria-live="polite"
          >
            <div className="mx-auto w-full max-w-[min(92vw,48rem)] px-3 pointer-events-auto">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl bg-white/65 md:bg-white/70 text-red-700 ring-1 ring-red-200/70 backdrop-blur-sm md:backdrop-blur-md shadow-sm px-3 py-2">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm sm:text-[15px] font-medium leading-snug whitespace-normal break-words">
                    {isGuest
                      ? "Vous n’êtes pas connecté. Connectez-vous pour parrainer un profil."
                      : "Votre profil est incomplet. Complétez-le pour parrainer un profil."}
                  </p>
                </div>

                {isGuest ? (
                  <div className="flex items-center gap-2">
                    <a
                      href="/login"
                      className="hidden sm:inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50/50 transition"
                    >
                      Se connecter
                    </a>
                    
                    <a
                      href="/signup"
                      className="inline-flex items-center justify-center rounded-lg border border-red-200/70 bg-white/90 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-white transition"
                    >
                      Créer un compte
                    </a>
                    
                  </div>
                ) : (
                  <a
                    href="/onboarding"
                    className="inline-flex items-center justify-center rounded-lg border border-red-200/70 bg-white/85 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-white transition"
                  >
                    Compléter mon profil
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Espace pour éviter le chevauchement */}
          <div className="h-12 sm:h-14" />
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
        />
        <StatCard
          title={user ? "Votre potentiel (parrain)" : "—"}
          value={user ? chf(mySponsorPotential) : "—"}
          hint={user ? "Somme de vos engagements acceptés" : "Connectez-vous pour voir"}
        />
        <StatCard title="Parrainages acceptés" value={`${globalAcceptedCount}`} hint="Nombre total sur la plateforme" />
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

        {/* ---------------- Demandes en attente (modernisée) ---------------- */}
        <Section
          title={
            <span className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Demandes en attente
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-yellow-500/10 text-yellow-700 text-xs font-semibold px-2 py-0.5 border border-yellow-200">
                {pendingCount}
              </span>
            </span>
          }
          icon={null}
          color="from-yellow-500 via-gray-700 to-yellow-800"
        >
          {pendingCount === 0 ? (
            <EmptyState text="Aucune demande en attente" />
          ) : (
            <div className="space-y-6">
              {pendingForMeAsRunner.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    À traiter (vous êtes le/la marcheur·euse)
                  </h3>
                  <div className="grid gap-3">
                    {pendingForMeAsRunner.map((s) => {
                      const km = Number(s.runner?.expected_km) || 0;
                      const pledge = Number(s.pledge_per_km) || 0;
                      const potential = pledge * km;
                      return (
                        <PendingItem
                          key={s.id}
                          title={<span><strong>{s.sponsor?.full_name || "Parrain inconnu"}</strong> souhaite parrainer <strong>{s.runner?.full_name}</strong></span>}
                          metaLeft={[
                            { label: "Contribution", value: `${formatCHF(pledge)}/km` },
                            { label: "Potentiel", value: formatCHF(potential) },
                          ]}
                          createdAt={s.created_at}
                          right={
                            <div className="flex gap-2">
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
                          fromNow={fromNow}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingSentByMe.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    Envoyées (en attente du/de la marcheur·euse)
                  </h3>
                  <div className="grid gap-3">
                    {pendingSentByMe.map((s) => {
                      const km = Number(s.runner?.expected_km) || 0;
                      const pledge = Number(s.pledge_per_km) || 0;
                      const potential = pledge * km;
                      return (
                        <PendingItem
                          key={s.id}
                          title={<span>Vous souhaitez parrainer <strong>{s.runner?.full_name}</strong></span>}
                          metaLeft={[
                            { label: "Contribution", value: `${formatCHF(pledge)}/km` },
                            { label: "Potentiel", value: formatCHF(potential) },
                          ]}
                          createdAt={s.created_at}
                          right={
                            <button
                              onClick={() => cancelSponsorship(s.id)}
                              disabled={processingId === s.id}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50"
                            >
                              {processingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              <span>Annuler</span>
                            </button>
                          }
                          fromNow={fromNow}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ---------------- Parrainages actifs (calcul corrigé) ---------------- */}
        <Section title="Parrainages actifs" icon={<UserCheck className="w-5 h-5" />} color="from-green-600 via-black to-red-600">
          {sponsorships.filter((s) => s.status === "accepted" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id)).length === 0 && (
            <EmptyState text="Aucun parrainage actif" />
          )}

          <div className="grid gap-4">
            {sponsorships
              .filter((s) => s.status === "accepted" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id))
              .map((s) => {
                const isRunner = s.runner?.id === user?.id;
                const runner = s.runner;
                const sponsor = s.sponsor;
                // ✅ Correction : potentiel = pledge_per_km * expected_km
                const linePotential = (Number(s.pledge_per_km) || 0) * (Number(runner?.expected_km) || 0);

                return (
                  <Card key={s.id}>
                    <div className="flex flex-col">
                      <p className="font-semibold text-gray-900 text-base">{runner?.full_name || "Marcheur inconnu"}</p>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <InfoTile label="Ville">{runner?.city || "—"}</InfoTile>
                        <InfoTile label="Objectif">{(runner?.expected_km || 0) + " km"}</InfoTile>
                        <InfoTile label="Contribution">{formatCHF(Number(s.pledge_per_km) || 0) + "/km"}</InfoTile>
                        <InfoTile label="Potentiel estimé">{formatCHF(linePotential)}</InfoTile>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            isRunner ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isRunner ? `Parrain : ${sponsor?.full_name || "Inconnu"}` : `Vous parrainez ce marcheur`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => cancelSponsorship(s.id)}
                      disabled={processingId === s.id}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50"
                      aria-label="Annuler le parrainage"
                      title="Annuler le parrainage"
                    >
                      {processingId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </Card>
                );
              })}
          </div>
        </Section>

        <Section title="Profils à soutenir" icon={<Users className="w-5 h-5" />} color="from-blue-600 via-black to-green-600">
          {/* Barre de recherche */}
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
            {filteredRunners.length === 0 ? (
              <EmptyState text="Aucun profil ne correspond à votre recherche." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredRunners.slice(0, visibleCount).map((runner: any) => {
                  const agg = sponsorsByRunner[runner.id] || { accepted: [], pending: [] };

                  const myLink = user
                    ? sponsorships.find(
                        (s) =>
                          s.runner?.id === runner.id &&
                          s.sponsor?.id === user?.id &&
                          ["pending", "accepted"].includes(s.status)
                      )
                    : null;

                  const isSelf = user ? runner.id === user.id : false;
                  const isProcessingThisCard = processingId === runner.id || processingId === myLink?.id;
                  const actionDisabled = isSelf || isReadOnly;

                  const runnerPotential = potentialByRunner.get(runner.id) || 0;
                  const myLinkStatus: "pending" | "accepted" | null =
                    myLink ? (myLink.status === "accepted" ? "accepted" : "pending") : null;

                  const isMain = !!MAIN_RUNNER_ID && runner.id === MAIN_RUNNER_ID;
                  const isTop = topRunnerIds.has(runner.id);

                  return (
                    <RunnerCard
                      key={runner.id}
                      runner={runner}
                      isMain={isMain}
                      isTop={isTop}
                      accepted={agg.accepted}
                      pending={agg.pending}
                      potentialCHF={runnerPotential}
                      processing={isProcessingThisCard}
                      myLinkStatus={myLinkStatus}
                      isActionDisabled={actionDisabled}
                      onAction={() => {
                        if (actionDisabled) {
                          return showToast(
                            "error",
                            isGuest ? "Connectez-vous pour parrainer un marcheur." : "Complétez d’abord votre profil."
                          );
                        }
                        if (myLink) return cancelSponsorship(myLink.id);
                        return sendSponsorshipRequest(runner.id);
                      }}
                      formatCurrency={formatCHF}
                    />
                  );
                })}
              </div>
            )}
          </Suspense>

          {/* Sentinel pour charger plus */}
          {filteredRunners.length > 0 && visibleCount < filteredRunners.length && (
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
    </div>
  );
}

/* --- Reusable Components --- */
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
    <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-sm md:backdrop-blur-md shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition-all contain-content">
      {children}
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-600">{title}</p>
      <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function ActionButton({ text, color, onClick, loading }: any) {
  const colors = color === "green" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600";
  return (
    <button onClick={onClick} disabled={loading} className={`px-4 py-2 text-sm rounded-xl text-white ${colors} transition-all disabled:opacity-50`}>
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

/* Élément de ligne pour les demandes en attente (UI modernisée) */
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
    <div className="group flex items-start justify-between gap-4 rounded-2xl border border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 transition-colors px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-gray-900 font-medium truncate">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {metaLeft.map((m, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-yellow-200 px-2 py-0.5 text-[11px] text-gray-700">
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
      <div className="shrink-0">{right}</div>
    </div>
  );
}
