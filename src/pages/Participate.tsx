import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  Users,
  UserCheck,
  Handshake,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Participer() {
  const [user, setUser] = useState<any>(null);
  const [runners, setRunners] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- Chargement des données principales ---
  const fetchData = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Profil de l'utilisateur
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    setUser({ ...data.user, ...profileData });

    // Tous les marcheurs
    const { data: runnersData } = await supabase
      .from("profiles")
      .select("id, full_name, city, expected_km, desired_pledge, role")
      .eq("role", "runner");

    // Parrainages liés à l’utilisateur (on garde tel quel)
    const { data: sponsorshipData } = await supabase
      .from("sponsorships")
      .select(`
        id, status, pledge_per_km, max_amount,
        runner:runner_id(id, full_name, city, expected_km, desired_pledge),
        sponsor:sponsor_id(id, full_name)
      `)
      .or(`runner_id.eq.${data.user.id},sponsor_id.eq.${data.user.id}`);

    // ⬆️ NOTE: on ne restreint pas la liste globale des parrainages à ceux de l'utilisateur
    // pour afficher les parrains des autres coureurs, on recharge ci-dessous tous les parrainages
    // sans condition (lecture publique) UNIQUEMENT pour l'affichage agrégé (pas de logique sensible)
    const { data: allSponsorships } = await supabase
      .from("sponsorships")
      .select(`
        id, status, pledge_per_km, max_amount,
        runner:runner_id (
          id,
          full_name,
          city,
          expected_km,
          desired_pledge
        ),
        sponsor:sponsor_id (
          id,
          full_name
        )
      `)
      .then(async (res) => {
        // 🔄 Vérifie et complète les km manquants
        const updated = await Promise.all(
          (res.data || []).map(async (s) => {
            if (!s.runner?.expected_km || s.runner.expected_km === 0) {
              const { data: fullRunner } = await supabase
                .from("profiles")
                .select("expected_km, desired_pledge, city")
                .eq("id", s.runner?.id)
                .single();

              if (fullRunner) {
                s.runner = { ...s.runner, ...fullRunner };
              }
            }
            return s;
          })
        );
        return { data: updated };
      });


    setRunners(runnersData || []);
    setSponsorships(allSponsorships || sponsorshipData || []); // on privilégie la vision complète pour l'UI
    setLoading(false);
  };

  // --- Initialisation + realtime + polling ---
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

  // --- Regroupements pour multi-parrainages (memo pour perf) ---
  const sponsorsByRunner = useMemo(() => {
    const map: Record<
      string,
      { accepted: Array<any>; pending: Array<any> }
    > = {};
    (sponsorships || []).forEach((s) => {
      const rid = s.runner?.id;
      if (!rid) return;
      if (!map[rid]) map[rid] = { accepted: [], pending: [] };
      if (s.status === "accepted") map[rid].accepted.push(s);
      else if (s.status === "pending") map[rid].pending.push(s);
    });
    return map;
  }, [sponsorships]);

  // --- Toast helper ---
  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Envoyer une demande de parrainage ---
  const sendSponsorshipRequest = async (runnerId: string) => {
    if (!user) return showToast("error", "Connectez-vous pour parrainer un marcheur");
    if (user.role === "runner") return showToast("error", "Seuls les parrains peuvent parrainer un marcheur");
    if (runnerId === user.id) return showToast("error", "Vous ne pouvez pas vous parrainer vous-même");

    setProcessingId(runnerId);
    const runner = runners.find((r) => r.id === runnerId);

    // Vérifier s’il existe déjà une demande (évite les doublons pour ce binôme)
    const { data: existing } = await supabase
      .from("sponsorships")
      .select("id, status")
      .eq("runner_id", runnerId)
      .eq("sponsor_id", user.id)
      .neq("status", "rejected")
      .maybeSingle();

    if (existing) {
      showToast("info", "Une demande est déjà en cours ou acceptée");
      setProcessingId(null);
      return;
    }

    // Créer la demande (les autres parrains sont autorisés)
    const { error } = await supabase.from("sponsorships").insert({
      sponsor_id: user.id,
      runner_id: runnerId,
      pledge_per_km: runner?.desired_pledge || 1,
      max_amount: (runner?.desired_pledge || 1) * (runner?.expected_km || 0),
      status: "pending",
    });

    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("success", "Demande envoyée avec succès.");

    await fetchData();
    setProcessingId(null);
  };

  // --- Accepter / refuser une demande ---
  const updateSponsorshipStatus = async (id: string, status: "accepted" | "rejected") => {
    setProcessingId(id);
    const { error } = await supabase.from("sponsorships").update({ status }).eq("id", id);

    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("success", status === "accepted" ? "Parrainage accepté !" : "Demande refusée");

    await fetchData();
    setProcessingId(null);
  };

  // --- Annuler un parrainage ---
  const cancelSponsorship = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from("sponsorships").delete().eq("id", id);
    if (error) showToast("error", "Erreur: " + error.message);
    else showToast("info", "Parrainage annulé");
    await fetchData();
    setProcessingId(null);
  };

  // --- États de chargement / non connecté ---
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-lg">
        Chargement...
      </div>
    );

  if (!user)
    return (
      <div className="text-center py-20">
        <p className="text-lg text-gray-700 mb-4">
          Vous devez être connecté pour participer
        </p>
        <a href="/login" className="text-green-700 font-semibold hover:underline">
          Se connecter
        </a>
      </div>
    );

  // --- UI principale ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-3 md:px-6 py-10 md:py-16">
      {/* Header */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex justify-center items-center gap-3 mb-2">
          <Handshake className="w-8 h-8 text-gray-700" />
          <h1 className="text-3xl md:text-4xl font-extrabold">
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              Espace Parrainage
            </span>
          </h1>
        </div>
        <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base">
          Retrouvez vos parrainages, vos demandes en attentes ainsi que les marcheurs/marcheuses disponibles à parrainer.
        </p>
      </motion.div>

      {/* Toast Notification */}
      {toast && (
        <motion.div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl backdrop-blur-lg border border-white/20 shadow-2xl text-white z-[9999]
          ${
            toast.type === "success"
              ? "bg-green-600/80"
              : toast.type === "error"
              ? "bg-red-600/80"
              : "bg-gray-700/80"
          }`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" && <CheckCircle className="w-5 h-5" />}
            {toast.type === "error" && <XCircle className="w-5 h-5" />}
            {toast.type === "info" && <Info className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </motion.div>
      )}

      {/* --- SECTIONS --- */}
      <div className="flex flex-col gap-8 md:gap-10 max-w-7xl mx-auto">
        <Section
          title="Marcheurs/Marcheuses disponibles"
          icon={<Users className="w-5 h-5" />}
          color="from-blue-600 via-black to-green-600"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {runners.map((runner) => {
              // ❌ On ne cache plus les coureurs déjà parrainés
              const alreadySponsoredByMe = sponsorships.some(
                (s) =>
                  s.runner?.id === runner.id &&
                  s.sponsor?.id === user?.id &&
                  ["pending", "accepted"].includes(s.status)
              );

              const agg = sponsorsByRunner[runner.id] || { accepted: [], pending: [] };

              return (
                <motion.div
                  key={runner.id}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 sm:p-5 rounded-2xl bg-white/70 backdrop-blur-md shadow-sm border border-gray-200 hover:shadow-lg transition-all w-full"
                >
                  <div className="mb-3">
                    <p className="font-semibold text-gray-900 text-lg">{runner.full_name}</p>
                    <p className="text-sm text-gray-500">{runner.city}</p>
                    <p className="text-sm text-gray-600">
                      Objectif : {runner.expected_km} km
                    </p>
                    <p className="text-sm text-gray-600">
                      Souhaite : {runner.desired_pledge} CHF/km
                    </p>
                  </div>

                  {/* Liste des parrains */}
                  {(agg.accepted.length > 0 || agg.pending.length > 0) && (
                    <div className="mb-3">
                      {agg.accepted.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Parrains (acceptés)</p>
                          <div className="flex flex-wrap gap-2">
                            {agg.accepted.map((s) => (
                              <span
                                key={s.id}
                                className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200"
                              >
                                {s.sponsor?.full_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agg.pending.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Demandes en attente</p>
                          <div className="flex flex-wrap gap-2">
                            {agg.pending.map((s) => (
                              <span
                                key={s.id}
                                className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200"
                              >
                                {s.sponsor?.full_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {user?.role !== "runner" && (
                    <button
                      onClick={() => sendSponsorshipRequest(runner.id)}
                      disabled={
                        processingId === runner.id ||
                        sponsorships.some(
                          (s) =>
                            s.runner?.id === runner.id &&
                            s.sponsor?.id === user?.id &&
                            ["pending", "accepted"].includes(s.status)
                        )
                      }
                      className={`w-full py-2 rounded-lg font-semibold shadow-md text-sm transition-all ${
                        sponsorships.some(
                          (s) =>
                            s.runner?.id === runner.id &&
                            s.sponsor?.id === user?.id &&
                            s.status === "accepted"
                        )
                          ? "bg-green-600 text-white cursor-default"
                          : sponsorships.some(
                              (s) =>
                                s.runner?.id === runner.id &&
                                s.sponsor?.id === user?.id &&
                                s.status === "pending"
                            )
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-600 via-black to-red-600 text-white hover:brightness-110"
                      }`}
                    >
                      {processingId === runner.id
                        ? "..."
                        : sponsorships.some(
                            (s) =>
                              s.runner?.id === runner.id &&
                              s.sponsor?.id === user?.id &&
                              s.status === "accepted"
                          )
                        ? "Parrainé !"
                        : sponsorships.some(
                            (s) =>
                              s.runner?.id === runner.id &&
                              s.sponsor?.id === user?.id &&
                              s.status === "pending"
                          )
                        ? "Demande envoyée"
                        : "Parrainer"}
                    </button>
                  )}

                </motion.div>
              );
            })}
          </div>
        </Section>
      {/* Parrainages actifs */}
        <Section
          title="Mes parrainages actifs"
          icon={<UserCheck className="w-5 h-5" />}
          color="from-green-600 via-black to-red-600"
        >
          {sponsorships.filter(
            (s) =>
              s.status === "accepted" &&
              (s.runner?.id === user?.id || s.sponsor?.id === user?.id)
          ).length === 0 && <EmptyState text="Aucun parrainage actif" />}

          <div className="grid gap-4">
            {sponsorships
              .filter(
                (s) =>
                  s.status === "accepted" &&
                  (s.runner?.id === user?.id || s.sponsor?.id === user?.id)
              )
              .map((s) => {
                const isRunner = s.runner?.id === user?.id;

                // On base l’affichage sur le coureur
                const runner = s.runner;
                const sponsor = s.sponsor;

                return (
                  <Card key={s.id}>
                    <div className="flex flex-col">
                      <p className="font-semibold text-gray-900 text-base">
                        {runner?.full_name || "Marcheur inconnu"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Ville : {runner?.city || "Non renseignée"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Objectif : {runner?.expected_km || 0} km
                      </p>
                      <p className="text-sm text-gray-600">
                        Contribution : {s.pledge_per_km} CHF/km
                      </p>
                      <p className="text-sm text-gray-600">
                        Total estimé :{" "}
                        <strong>
                          {(runner?.expected_km || 0) * s.pledge_per_km} CHF
                        </strong>
                      </p>

                      <div className="mt-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            isRunner
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isRunner
                            ? `Parrain : ${sponsor?.full_name || "Inconnu"}`
                            : `Vous parrainez ce marcheur`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => cancelSponsorship(s.id)}
                      disabled={processingId === s.id}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </Card>
                );
              })}
          </div>
        </Section>

        {/* Demandes en attente (inchangé hors filtre de visibilité perso) */}
        <Section
          title="Demandes en attente"
          icon={<Info className="w-5 h-5" />}
          color="from-yellow-500 via-gray-700 to-yellow-800"
        >
          {sponsorships.filter((s) => s.status === "pending" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id)).length === 0 && (
            <EmptyState text="Aucune demande en attente" />
          )}

          <div className="grid gap-4">
            {sponsorships
              .filter((s) => s.status === "pending" && (s.runner?.id === user?.id || s.sponsor?.id === user?.id))
              .map((s) => (
                <Card key={s.id}>
                  <p className="text-gray-800 font-medium truncate">
                    <strong>{s.sponsor?.full_name}</strong> souhaite parrainer{" "}
                    <strong>{s.runner?.full_name}</strong>
                  </p>

                  {user?.id === s.runner?.id ? (
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
                  ) : (
                    <span className="px-3 py-1 text-sm rounded bg-yellow-100 text-yellow-800 font-medium">
                      En attente du marcheur
                    </span>
                  )}
                </Card>
              ))}
          </div>
        </Section>

        {/* Liste des coureurs — MAJ pour multi-parrainages */}
        
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
      <h2
        className={`text-lg md:text-2xl font-bold mb-6 flex items-center gap-3 text-gray-800 bg-gradient-to-r ${color} bg-clip-text text-transparent`}
      >
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

function ActionButton({ text, color, onClick, loading }: any) {
  const colors =
    color === "green"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-500 hover:bg-red-600";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-4 py-2 text-sm rounded-xl text-white ${colors} transition-all disabled:opacity-50`}
    >
      {loading ? "..." : text}
    </button>
  );
}

function EmptyState({ text }: any) {
  return <p className="text-gray-500 italic text-sm">{text}</p>;
}
