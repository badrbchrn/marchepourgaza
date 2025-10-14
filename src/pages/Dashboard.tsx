import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { User, MapPin, Users, Eye, EyeOff, Info } from "lucide-react";
import { motion } from "framer-motion";

type Role = "runner" | "sponsor";
type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  phone: string | null;
  role: Role;
  is_onboarded: boolean;
  expected_km: number | null;
  desired_pledge: number | null;
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasActiveSponsorship, setHasActiveSponsorship] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }
        setUser(user);

        // Compat: email_confirmed_at (OTP) ou confirmed_at
        const isConfirmed = Boolean(
          (user as any).email_confirmed_at || (user as any).confirmed_at
        );
        if (!isConfirmed) {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
          return;
        }

        // Profil complet (policy self_select)
        const { data: p } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, city, phone, role, is_onboarded, expected_km, desired_pledge"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (p) setProfile(p as Profile);

        // Parrainages ACCEPTÉS (pour checklist runner)
        const { data: s } = await supabase
          .from("sponsorships")
          .select("id")
          .eq("runner_id", user.id)
          .eq("status", "accepted");

        setHasActiveSponsorship((s?.length ?? 0) > 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const name =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "";

  // Lyan only (via env ID sinon fallback sur nom exact "Lyan")
  const LYAN_ID = import.meta.env.VITE_LYAN_USER_ID as string | undefined;
  const isLyan =
    (!!LYAN_ID && user?.id === LYAN_ID) ||
    (profile?.full_name?.trim().toLowerCase() === "lyan");

  // Statut public (même logique que l’onboarding “dur”)
  const readyForPublic = useMemo(() => {
    if (!profile) return false;
    const hasContact =
      Boolean(profile.full_name?.trim()) &&
      Boolean(profile.city?.trim()) &&
      Boolean(profile.phone?.trim());
    if (!hasContact) return false;

    if (profile.role === "sponsor") return true;

    const km = Number(profile.expected_km ?? 0);
    const pledge = Number(profile.desired_pledge ?? 0);
    const kmOk = Number.isFinite(km) && km > 0 && km <= 180;
    const pledgeOk = hasActiveSponsorship ? true : (Number.isFinite(pledge) && pledge > 0);

    return kmOk && pledgeOk;
  }, [profile, hasActiveSponsorship]);

  const missing: string[] = useMemo(() => {
    if (!profile) return [];
    const items: string[] = [];
    if (!profile.full_name?.trim()) items.push("Nom complet");
    if (!profile.city?.trim()) items.push("Ville");
    if (!profile.phone?.trim()) items.push("Téléphone");
    if (profile.role === "runner") {
      const km = Number(profile.expected_km ?? 0);
      const pledge = Number(profile.desired_pledge ?? 0);
      if (!(km > 0)) items.push("Kilomètres prévus");
      if (!hasActiveSponsorship && !(pledge > 0)) items.push("CHF/km souhaités (ou parrainage accepté)");
    }
    return items;
  }, [profile, hasActiveSponsorship]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`w-full max-w-6xl flex flex-col justify-center items-center rounded-3xl border border-gray-200 shadow-xl backdrop-blur-xl bg-white/70 px-6 md:px-10 py-10 md:py-12 ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Bienvenue{" "}
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              {name}
            </span>
          </h1>
          <p className="text-gray-600 text-base mt-2">
            Gérez votre profil et accédez à vos parrainages.
          </p>
        </div>

        {/* Statut de visibilité */}
        {profile && (
          <div className={`mb-8 w-full max-w-3xl rounded-2xl border p-4 ${profile.is_onboarded ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start gap-3">
              {profile.is_onboarded ? (
                <Eye className="w-5 h-5 text-green-700 mt-0.5" />
              ) : (
                <EyeOff className="w-5 h-5 text-amber-700 mt-0.5" />
              )}
              <div className="text-sm ">
                <p className={`font-semibold w-full text-center ${profile.is_onboarded ? "text-green-800" : "text-amber-800"}`}>
                  {profile.is_onboarded ? "Votre profil est visible publiquement" : "Votre profil est actuellement privé"}
                </p>
                {!profile.is_onboarded && (
                  <div className="mt-1 text-amber-800/90">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <span className="font-medium">Il manque encore :</span>
                    </div>
                    <ul className="list-disc ml-6 mt-1">
                      {missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <div className="mt-2">
                      <Link to="/onboarding" className="text-amber-900 underline hover:opacity-80">
                        Compléter mon profil
                      </Link>
                    </div>
                  </div>
                )}
                {profile.is_onboarded && !readyForPublic && (
                  <p className="mt-1 text-amber-800">
                    Votre profil est public, mais certaines infos ont peut-être changé. Pensez à vérifier dans{" "}
                    <Link to="/onboarding" className="underline">Onboarding</Link>.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cards - centrées */}
        <div className="w-full max-w-4xl mx-auto flex flex-wrap justify-center gap-6">
          <DashboardCard
            to="/onboarding"
            icon={<User className="w-8 h-8 text-green-600" />}
            title="Mon profil"
            text="Mettre à jour mes informations personnelles."
          />

          {/* Carte Diffusion position : UNIQUEMENT pour Lyan */}
          {isLyan && (
            <DashboardCard
              to="/track"
              icon={<MapPin className="w-8 h-8 text-red-600" />}
              title="Diffuser ma position"
              text="Activer le suivi GPS en temps réel."
            />
          )}

          <DashboardCard
            to="/participer"
            icon={<Users className="w-8 h-8 text-gray-800" />}
            title="Espace Parrainage"
            text="Découvrir et gérer mes parrainages."
          />
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-gray-200 pt-4 w-full text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} WalkForGaza — Ensemble pour une cause commune
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* 🔹 Active card component */
function DashboardCard({
  to,
  icon,
  title,
  text,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        className="block w-[300px] md:w-[340px] h-full rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center shadow-md hover:shadow-xl transition-all duration-300"
      >
        <div className="p-4 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner mb-2">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-snug">{text}</p>
      </Link>
    </motion.div>
  );
}
