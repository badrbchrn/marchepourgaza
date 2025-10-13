import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RunnerCard from "@/components/RunnerCard";

import {
  Sparkles,
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  Users,
  UserCheck,
  Handshake,
  Star,
  SquarePlus,
  SquareCheck,
  Clock,
  Loader2,
  Award,
  HeartHandshake,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


export default function Participer() {
  const [user, setUser] = useState<any>(null);
  const [runners, setRunners] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const MAIN_RUNNER_ID = import.meta.env.VITE_LYAN_ID;

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

  // --- Envoyer une demande de parrainage ---
  const sendSponsorshipRequest = async (runnerId: string) => {
    if (!user) return showToast("error", "Connectez-vous pour parrainer un marcheur");
    if (!isProfileComplete(user)) {
      return showToast("error", "Complétez d'abord votre profil (nom, ville, téléphone).");
    }
    if (runnerId === user.id) {
      return showToast("error", "Vous ne pouvez pas vous parrainer vous-même.");
    }

    setProcessingId(runnerId);

    // Évite les doublons (on ignore uniquement celles déjà refusées)
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

  // --- Changer le statut (accepter / refuser) ---
  const updateSponsorshipStatus = async (id: string, status: "accepted" | "rejected") => {
    setProcessingId(id);
    const { error } = await supabase.from("sponsorships").update({ status }).eq("id", id);

    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("success", status === "accepted" ? "Parrainage accepté !" : "Demande refusée");

    await fetchData();
    setProcessingId(null);
  };

  // --- Annuler (pending/accepted) ---
  const cancelSponsorship = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from("sponsorships").delete().eq("id", id);
    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("info", "Parrainage annulé");
    await fetchData();
    setProcessingId(null);
  };


  const fetchData = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user ?? null;

      let profileData: any = null;
      if (currentUser) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
        profileData = p || null;
      }
      setUser(currentUser ? { ...currentUser, ...profileData } : null);

      const { data: runnersData } = await supabase
        .from("profiles")
        .select("id, full_name, city, phone, expected_km, desired_pledge, role")
        .eq("role", "runner");

      const { data: allSponsorships } = await supabase
        .from("sponsorships")
        .select(`
          id, status, pledge_per_km, max_amount,
          runner:runner_id ( id, full_name, city, expected_km, desired_pledge ),
          sponsor:sponsor_id ( id, full_name )
        `)
        .then(async (res) => {
          const updated = await Promise.all(
            (res?.data || []).map(async (s: any) => {
              if (!s.runner?.expected_km || s.runner.expected_km === 0) {
                const { data: fullRunner } = await supabase
                  .from("profiles").select("expected_km, desired_pledge, city").eq("id", s.runner?.id).single();
                if (fullRunner) s.runner = { ...s.runner, ...fullRunner };
              }
              return s;
            })
          );
          return { data: updated };
        });

      const sortedRunners = (runnersData || []).sort((a, b) => {
        if (a.id === MAIN_RUNNER_ID) return -1;
        if (b.id === MAIN_RUNNER_ID) return 1;
        return 0;
      });

      const filteredRunners = sortedRunners.filter(
        (r) =>
          !!r.full_name &&
          !!r.city &&
          typeof r.expected_km === "number" && r.expected_km > 0 &&
          typeof r.desired_pledge === "number" && r.desired_pledge > 0
      );

      setRunners(filteredRunners);
      setSponsorships(allSponsorships || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel("sponsorships-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsorships" }, fetchData)
      .subscribe();
    const interval = setInterval(fetchData, 5000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
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
    () => acceptedOnly.reduce((sum, s) => {
      const km = Number(s.runner?.expected_km) || 0;
      const line = (Number(s.pledge_per_km) || 0) * km;
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0),
    [acceptedOnly]
  );

  const globalAcceptedCount = acceptedOnly.length;

  const topRunnerId = useMemo(() => {
    let bestId: string | null = null;
    let bestCount = -1;
    for (const r of runners) {
      if (r.id === MAIN_RUNNER_ID) continue;
      const count = sponsorsByRunner[r.id]?.accepted.length || 0;
      if (count > bestCount) {
        bestCount = count;
        bestId = r.id;
      }
    }
    return bestId;
  }, [runners, sponsorsByRunner, MAIN_RUNNER_ID]);

  const chf = (n: number) =>
    new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 2 }).format(n);

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
        <motion.div
          className="max-w-3xl mx-auto mb-8 bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl shadow-sm text-center flex flex-col items-center justify-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
          <p className="text-sm leading-relaxed">
            {isGuest ? (
              <>Connectez-vous ou créez un compte pour interagir avec les marcheurs.{" "}
                <a href="/login" className="underline font-medium text-blue-700">Se connecter</a></>
            ) : (
              <>Complétez votre profil pour parrainer un marcheur.{" "}
                <a href="/onboarding" className="underline font-medium text-blue-700">Compléter mon profil</a></>
            )}
          </p>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        className="text-center mb-6 md:mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
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

      {/* Stats */}
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

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
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

      {/* SECTIONS */}
      <div className="flex flex-col gap-8 md:gap-10 max-w-7xl mx-auto">
        {/* Auto-parrainage */}
        {user?.role === "runner" && (
          <div className="text-center -mt-2">
            {(() => {
              const selfSponsor = sponsorships.find((s) => s.runner?.id === user.id && s.sponsor?.id === user.id);
              const active = !!selfSponsor;
              return (
                <>
                  <button
                    onClick={toggleSelfSponsorship}
                    disabled={processingId === user.id || isReadOnly}
                    className={`group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm
                      ${isReadOnly ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : active ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:brightness-110"
                        : "bg-gradient-to-r from-green-600 via-black to-red-600 text-white hover:brightness-110"}`}
                  >
                    {processingId === user.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Chargement...</span>
                      </>
                    ) : active ? (
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
                    {active ? "(Tu es actuellement ton propre parrain)" : "(Permet de te soutenir symboliquement toi-même)"}
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {/* Liste des marcheurs */}
        <Section title="Marcheurs/Marcheuses disponibles" icon={<Users className="w-5 h-5" />} color="from-blue-600 via-black to-green-600">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {runners.map((runner) => {
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

              const runnerPotential =
                (potentialByRunner.get(runner.id) || 0);

              const myLinkStatus: "pending" | "accepted" | null =
                myLink ? (myLink.status === "accepted" ? "accepted" : "pending") : null;

              const isMain = runner.id === MAIN_RUNNER_ID;
              const isTop = runner.id !== MAIN_RUNNER_ID && runner.id === topRunnerId;

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
                        isGuest
                          ? "Connectez-vous pour parrainer un marcheur."
                          : "Complétez d’abord votre profil."
                      );
                    }
                    if (myLink) return cancelSponsorship(myLink.id);
                    return sendSponsorshipRequest(runner.id);
                  }}
                  formatCurrency={(n) =>
                    new Intl.NumberFormat("fr-CH", {
                      style: "currency",
                      currency: "CHF",
                      maximumFractionDigits: 2,
                    }).format(n)
                  }
                />
              );
            })}
          </div>
        </Section>

        {/* Parrainages actifs */}
        <Section title="Mes parrainages actifs" icon={<UserCheck className="w-5 h-5" />} color="from-green-600 via-black to-red-600">
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
                const linePotential = (Number(s.pledge_per_km) || 0) * (Number(s.max_amount) || 0);

                return (
                  <Card key={s.id}>
                    <div className="flex flex-col">
                      <p className="font-semibold text-gray-900 text-base">{runner?.full_name || "Marcheur inconnu"}</p>
                      <p className="text-sm text-gray-600">Ville : {runner?.city || "Non renseignée"}</p>
                      <p className="text-sm text-gray-600">Objectif : {runner?.expected_km || 0} km</p>
                      <p className="text-sm text-gray-600">Contribution : {s.pledge_per_km} CHF/km</p>
                      <p className="text-sm text-gray-600">Potentiel estimé : <strong>{chf(linePotential)}</strong></p>

                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${isRunner ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                          {isRunner ? `Parrain : ${sponsor?.full_name || "Inconnu"}` : `Vous parrainez ce marcheur`}
                        </span>
                      </div>
                    </div>

                    <button onClick={() => cancelSponsorship(s.id)} disabled={processingId === s.id}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </Card>
                );
              })}
          </div>
        </Section>

        {/* Demandes en attente */}
        <Section title="Demandes en attente" icon={<Info className="w-5 h-5" />} color="from-yellow-500 via-gray-700 to-yellow-800">
          {sponsorships.filter((s) => s.status === "pending" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id)).length === 0 && (
            <EmptyState text="Aucune demande en attente" />
          )}

          <div className="grid gap-4">
            {sponsorships
              .filter((s) => s.status === "pending" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id))
              .map((s) => (
                <Card key={s.id}>
                  <p className="text-gray-800 font-medium truncate">
                    <strong>{s.sponsor?.full_name}</strong> souhaite parrainer <strong>{s.runner?.full_name}</strong>
                  </p>

                  {user?.id === s.runner?.id ? (
                    <div className="flex gap-2">
                      <ActionButton text="Accepter" color="green" onClick={() => updateSponsorshipStatus(s.id, "accepted")} loading={processingId === s.id} />
                      <ActionButton text="Refuser" color="red" onClick={() => updateSponsorshipStatus(s.id, "rejected")} loading={processingId === s.id} />
                    </div>
                  ) : (
                    <span className="px-3 py-1 text-sm rounded bg-yellow-100 text-yellow-800 font-medium">En attente du marcheur</span>
                  )}
                </Card>
              ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

/* --- Reusable Components --- */
function Section({ title, icon, color, children }: any) {
  return (
    <motion.section
      className="backdrop-blur-xl bg-white/70 rounded-3xl border border-gray-200 shadow-md p-6 md:p-8"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
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
    <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition-all">
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
