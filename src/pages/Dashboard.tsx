import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { User, MapPin, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLiveAvailable, setIsLiveAvailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
    })();

    // 🔸 Vérifie si on est après le 25 octobre 2025 à 07h00
    const eventDate = new Date("2025-10-25T07:00:00+02:00");
    const now = new Date();
    setIsLiveAvailable(now >= eventDate);
  }, [navigate]);

  const name = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl flex flex-col justify-center items-center rounded-3xl border border-gray-200 shadow-xl backdrop-blur-xl bg-white/70 px-6 md:px-10 py-10 md:py-12"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Bienvenue{" "}
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              {name}
            </span>
          </h1>
          <p className="text-gray-600 text-base mt-2">
            Gérez votre profil, suivez votre position en direct et accédez à vos parrainages.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
          <DashboardCard
            to="/onboarding"
            icon={<User className="w-8 h-8 text-green-600" />}
            title="Mon profil"
            text="Mettez à jour vos informations personnelles."
          />

          {!isLiveAvailable ? (
            <DashboardCardDisabled
              icon={<MapPin className="w-8 h-8 text-red-600 opacity-60" />}
              title="Diffuser ma position"
              text="Disponible le jour de la marche (25 octobre 2025)."
            />
          ) : (
            <DashboardCard
              to="/track"
              icon={<MapPin className="w-8 h-8 text-red-600" />}
              title="Diffuser ma position"
              text="Activez le suivi GPS en temps réel."
            />
          )}

          <DashboardCard
            to="/participer"
            icon={<Users className="w-8 h-8 text-gray-800" />}
            title="Espace Parrainage"
            text="Découvrez et gérez vos parrainages."
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
        className="block h-full rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center shadow-md hover:shadow-xl transition-all duration-300"
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

/* 🔸 Disabled card component */
function DashboardCardDisabled({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-gray-200 bg-gray-50/70 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center shadow-sm cursor-not-allowed"
    >
      <div className="p-4 rounded-full bg-gray-100 shadow-inner mb-2">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-400 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm leading-snug">{text}</p>

    </motion.div>
  );
}
