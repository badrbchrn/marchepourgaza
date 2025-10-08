import { Link } from "react-router-dom";
import { Heart, Users, Globe, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- Animations ---
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Home() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sponsorshipCount, setSponsorshipCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData } = await supabase.from("profiles").select("id, role");
      setProfiles(profilesData || []);

      const { count: accepted } = await supabase
        .from("sponsorships")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted");
      setSponsorshipCount(accepted || 0);

      // Marcheurs sans parrain
      const { data: runnersWithoutSponsors } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "runner");

      const { data: sponsoredRunners } = await supabase
        .from("sponsorships")
        .select("runner_id")
        .eq("status", "accepted");

      const sponsoredIds = sponsoredRunners?.map((r) => r.runner_id);
      const waiting = runnersWithoutSponsors?.filter(
        (r) => !sponsoredIds?.includes(r.id)
      );
      setWaitingCount(waiting?.length || 0);
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="min-h-[calc(100vh-80px)] flex flex-col md:flex-row items-center justify-between px-6 md:px-16 lg:px-24 bg-gradient-to-br from-gray-100 via-white to-gray-50 py-16"
      >
        {/* Texte d’intro */}
        <motion.div variants={fadeUp} className="flex-1 text-left space-y-6 md:pr-12">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-gray-900">
            Marche solidaire <br /> autour du Léman <br />
            <span className="bg-gradient-to-r from-red-600 via-black to-green-600 bg-clip-text text-transparent">
              pour Gaza
            </span>
          </h1>
          <p className="text-lg text-gray-700 max-w-lg">
            Rejoignez une marche de <strong>180 km</strong> autour du lac Léman
            et soutenez Gaza grâce à vos pas et vos parrains.
          </p>

          {/* Stats avec code couleur */}
          <div className="flex flex-wrap gap-6 pt-4">
            <StatBox
              value={profiles.length}
              label="Participants inscrits"
              color="black"
            />
            <StatBox
              value={sponsorshipCount}
              label="Parrainages validés"
              color="green"
            />
            <StatBox
              value={waitingCount}
              label="Marcheurs en attente"
              color="yellow"
            />
          </div>
        </motion.div>

        {/* Vidéo téléphone */}
        <motion.div
          variants={fadeUp}
          className="flex-1 flex justify-center mt-12 md:mt-0"
          animate={{ y: [0, -5, 0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative w-[220px] sm:w-[260px] md:w-[240px] aspect-[9/19] bg-black rounded-[2.2rem] shadow-2xl border-[6px] border-gray-900 overflow-hidden group">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-b-2xl z-20"></div>
            <video
              src="/media/video_optimized.mp4"
              autoPlay
              loop
              playsInline
              controls
              className="w-full h-full object-cover"
            />
            <style jsx>{`
              video::-webkit-media-controls {
                opacity: 0;
                transition: opacity 0.4s ease;
              }
              .group:hover video::-webkit-media-controls {
                opacity: 1;
              }
            `}</style>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5 pointer-events-none"></div>
          </div>
        </motion.div>
      </motion.section>

      <SectionDivider color="gaza" />

      {/* COMMENT ÇA MARCHE */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeUp}
        className="py-20 bg-white border-t border-gray-100"
      >
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          <motion.h2 className="text-3xl font-extrabold text-gray-900 mb-6">
            Comment ça marche ?
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            <Step
              number="1"
              title="Je m’inscris"
              text="Créez votre profil en quelques secondes pour rejoindre la marche."
            />
            <Step
              number="2"
              title="Je parraine ou me fais parrainer"
              text="Unissez vos forces avec un marcheur ou un donateur."
            />
            <Step
              number="3"
              title="Je donne / je marche"
              text="Le jour J, chaque kilomètre compte pour Gaza."
            />
          </div>

          <div className="pt-8">
            <Link
              to="/participer"
              className="inline-block bg-gradient-to-r from-green-600 via-black to-red-600 text-white font-semibold px-8 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              Participer maintenant
            </Link>
          </div>
        </div>
      </motion.section>

      <SectionDivider color="gray" />

      {/* POURQUOI CETTE MARCHE */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeUp}
        className="py-16 bg-gray-50"
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <img
            src="/media/watermelon.png"
            alt="Logo Gaza"
            className="mx-auto mb-6 h-14 w-auto"
          />
          <motion.h2 className="text-3xl font-bold mb-10 text-gray-900">
            Pourquoi cette marche ?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card
              icon={<Users className="w-10 h-10 mx-auto text-green-600" />}
              title="Solidarité"
              text="Unir nos pas pour soutenir Gaza et montrer notre engagement."
            />
            <Card
              icon={<Heart className="w-10 h-10 mx-auto text-red-600" />}
              title="Santé & Engagement"
              text="Prendre soin de soi tout en marchant pour une cause juste."
            />
            <Card
              icon={<Globe className="w-10 h-10 mx-auto text-black" />}
              title="Visibilité"
              text="Donner une voix à Gaza à travers chaque kilomètre parcouru."
            />
          </div>
        </div>
      </motion.section>

      <SectionDivider color="gaza" />

      {/* CARTE (désactivée avant jour J) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeUp}
        className="py-20 bg-white"
      >
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Carte des marcheurs</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            La carte de suivi en direct sera disponible <strong>le jour de la marche</strong>.<br />
            Vous pourrez suivre le parcours, les participants et partager votre position en temps réel.
          </p>

          <div className="mt-8 rounded-3xl bg-gradient-to-br from-green-100 via-white to-red-100 border border-gray-200 shadow-inner p-10 flex flex-col items-center justify-center space-y-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <p className="text-lg font-semibold text-gray-800">
              Bientôt disponible — Suivez-nous pour le grand départ 🕊️
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/* --- Sous-composants --- */
function StatBox({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "green" | "yellow" | "black";
}) {
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "yellow"
      ? "text-yellow-600"
      : "text-gray-900";

  return (
    <div className="text-center bg-white shadow-md rounded-xl px-6 py-4 border border-gray-200 flex-1 min-w-[120px]">
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-green-600 via-black to-red-600 text-white font-bold text-lg shadow-md">
        {number}
      </div>
      <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm max-w-xs">{text}</p>
    </div>
  );
}

function Card({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:scale-105 transition text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-xl mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm">{text}</p>
    </div>
  );
}

function SectionDivider({ color }: { color: "gaza" | "gray" }) {
  if (color === "gaza") {
    return (
      <div className="h-[2px] w-full bg-gradient-to-r from-red-600 via-black to-green-600 opacity-80"></div>
    );
  }
  return <div className="h-[1px] w-full bg-gray-200"></div>;
}
