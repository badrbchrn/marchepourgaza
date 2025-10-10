import { Link } from "react-router-dom";
import {
  Heart,
  Users,
  Globe,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Handshake,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------------- Animations ---------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function Home() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sponsorshipCount, setSponsorshipCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [totalFunds, setTotalFunds] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, role");
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

      // 💰 Total potentiel
      const { data: validSponsorships } = await supabase
        .from("sponsorships")
        .select(
          `
          pledge_per_km,
          runner:runner_id (expected_km)
        `
        )
        .eq("status", "accepted");

      if (validSponsorships) {
        const total = validSponsorships.reduce((sum, s) => {
          const km = s.runner?.expected_km || 0;
          const pledge = s.pledge_per_km || 0;
          return sum + km * pledge;
        }, 0);
        setTotalFunds(total);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ---------------- HERO (conservé) ---------------- */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="min-h-[calc(100vh-80px)] flex flex-col md:flex-row items-center justify-between px-6 md:px-16 lg:px-24 bg-gradient-to-br from-gray-100 via-white to-gray-50 py-16"
      >
        {/* Texte d’intro */}
        <motion.div
          variants={fadeUp}
          className="flex-1 text-left space-y-6 md:pr-12"
        >
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

          {/* KPIs raffinés */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-4 max-w-xl"
          >
            <KPI value={profiles.length} label="Participants" tone="ink" />
            <KPI value={sponsorshipCount} label="Parrainages" tone="success" />
            <KPI value={waitingCount} label="En attente" tone="warning" />
          </motion.div>

          {/* 💰 Total potentiel */}
          {totalFunds !== null && (
            <p className="text-sm text-gray-700/90 max-w-lg">
              Les parrainages validés représentent{" "}
              <strong className="text-green-700">
                {totalFunds.toFixed(2)} CHF
              </strong>{" "}
              de soutien <b>potentiel</b> pour l’association.
            </p>
          )}

          {/* CTA principal */}
          <div className="pt-2">
            <Link
              to="/participer"
              className="group inline-flex items-center gap-2 rounded-2xl p-[1.5px] bg-gradient-to-r from-emerald-600 via-gray-900 to-rose-600 hover:brightness-105 transition"
            >
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm md:text-base font-semibold text-slate-900 ring-1 ring-black/5 shadow-sm group-hover:shadow-md">
                <Handshake className="h-4 w-4 text-emerald-600" />
                Participer maintenant
                <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition" />
              </span>
            </Link>
          </div>
        </motion.div>

        {/* Vidéo téléphone (inchangée) */}
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5 pointer-events-none"></div>
          </div>
        </motion.div>
      </motion.section>

      <SectionDivider color="gaza" />

      {/* ---------------- Comment ça marche ---------------- */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeUp}
        viewport={{ once: true, amount: 0.3 }}
        className="py-18 md:py-20 bg-white"
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Comment ça marche ?
          </motion.h2>
          <p className="text-gray-600 mb-10">
            Inscrivez-vous, trouvez des parrains, et marchez pour une cause
            juste. Simple et transparent.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <Step
              number="1"
              title="Je m’inscris"
              text="Créez votre profil pour rejoindre la marche."
            />
            <Step
              number="2"
              title="Je parraine / me fais parrainer"
              text="Associez marcheurs et donateurs en 1 clic."
            />
            <Step
              number="3"
              title="Je marche, chaque km compte"
              text="Suivi en direct activé le jour J."
            />
          </div>

          <div className="pt-10">
            <Link
              to="/participer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 via-black to-red-600 px-6 py-3 text-white font-semibold shadow-md hover:scale-[1.02] transition"
            >
              Rejoindre la marche
              <ArrowRight className="h-4 w-4 opacity-80" />
            </Link>
          </div>
        </div>
      </motion.section>

      <SectionDivider color="gray" />

      {/* ---------------- Pourquoi cette marche ---------------- */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeUp}
        viewport={{ once: true, amount: 0.3 }}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
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

      {/* ---------------- Carte (placeholder avant J) ---------------- */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeUp}
        viewport={{ once: true, amount: 0.3 }}
        className="py-20 bg-white"
      >
        <div className="max-w-6xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Carte des marcheurs</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            La carte de suivi en direct sera disponible <strong>le jour de la marche</strong>.
            Vous pourrez suivre le parcours, les participants et partager votre position en temps réel.
          </p>

          <div className="mt-2 rounded-3xl p-[1.5px] bg-gradient-to-r from-emerald-600 via-gray-900 to-rose-600 shadow-sm">
            <div className="rounded-3xl bg-gradient-to-br from-green-50 via-white to-red-50 border border-gray-200/70 shadow-inner p-10 flex flex-col items-center justify-center space-y-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <p className="text-lg font-semibold text-gray-800">
                Bientôt disponible — Suivez-nous pour le grand départ 🕊️
              </p>
              <div className="text-xs text-gray-500">
                Activation du suivi live au départ officiel
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              to="/participer"
              className="group inline-flex items-center gap-2 rounded-2xl p-[1.5px] bg-gradient-to-r from-emerald-600 via-gray-900 to-rose-600 hover:brightness-105 transition"
            >
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-black/5 shadow-sm group-hover:shadow-md">
                Je soutiens dès maintenant
                <Sparkles className="h-4 w-4 text-amber-500" />
              </span>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/* ---------------- Sous-composants ---------------- */

function KPI({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "success" | "warning" | "ink";
}) {
  const toneColor =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
      ? "text-amber-600"
      : "text-gray-900";
  const ringColor =
    tone === "success"
      ? "ring-emerald-100"
      : tone === "warning"
      ? "ring-amber-100"
      : "ring-gray-100";

  return (
    <motion.div
      variants={fadeUp}
      className={`text-center bg-white rounded-2xl px-5 py-4 shadow-sm ring-1 ${ringColor}`}
    >
      <p className={`text-3xl font-extrabold ${toneColor}`}>{value}</p>
      <p className="text-xs text-gray-600 tracking-wide">{label}</p>
    </motion.div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-6 text-center shadow-sm hover:shadow-md transition">
      <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-green-600 via-black to-red-600 text-white font-bold text-sm shadow">
        {number}
      </div>
      <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm mt-1">{text}</p>
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-red-600/10 via-black/5 to-green-600/10" />
    </div>
  );
}

function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm hover:shadow-md transition">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-1 text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm">{text}</p>
      <div className="pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-gradient-to-br from-green-600/10 via-black/5 to-red-600/10" />
    </div>
  );
}

function SectionDivider({ color }: { color: "gaza" | "gray" }) {
  if (color === "gaza") {
    return (
      <div className="h-[2px] w-full bg-gradient-to-r from-red-600 via-black to-green-600 opacity-85" />
    );
  }
  return <div className="h-px w-full bg-gray-200" />;
}
