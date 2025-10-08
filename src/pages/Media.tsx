import { Mail, Instagram, Linkedin, Youtube } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Animation fluide d'apparition
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

// Icône TikTok personnalisée (SVG)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="currentColor"
    >
      <path d="M168 32a8 8 0 0 0-8 8v81.6a40 40 0 1 1-24-37.1V64a8 8 0 0 0-8-8H104a64 64 0 1 0 64 64V40a8 8 0 0 0-8-8Z" />
    </svg>
  );
}

export default function Contact() {
  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10">
      {/* --- Titre et intro --- */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="text-center mb-10"
      >
        {/* Titre Gaza stylisé */}
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-green-700 via-black to-red-600 bg-clip-text text-transparent drop-shadow-sm">
            Contact
          </span>
        </h1>

        <p className="text-gray-600 text-lg md:text-xl font-light mt-3">
          Une question, une collaboration ou un partenariat ? <br />
          Lyan sera ravi d’échanger avec vous.
        </p>
      </motion.div>

      {/* --- Carte principale --- */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200 p-8 md:p-10 max-w-md w-full text-center space-y-8"
      >
        {/* Email */}
        <div className="space-y-3">
          <Mail className="w-7 h-7 mx-auto text-green-600" />
          <p className="uppercase text-xs tracking-wider text-gray-500">
            Contact principal
          </p>
          <a
            href="mailto:kawehlyan@gmail.com"
            className="text-lg font-semibold text-gray-900 hover:text-green-700 transition-colors"
          >
            kawehlyan@gmail.com
          </a>
        </div>

        {/* Ligne décorative */}
        <div className="h-[2px] w-20 mx-auto bg-gradient-to-r from-red-600 via-black to-green-600 rounded-full"></div>

        {/* Réseaux sociaux */}
        <div>
          <p className="text-gray-600 text-sm uppercase tracking-wider mb-3">
            Retrouvez Lyan ici
          </p>
          <div className="flex justify-center gap-5 md:gap-6">
            <SocialIcon
              icon={<Youtube className="w-5 h-5" />}
              label="YouTube"
              url="https://www.youtube.com/@2InfinityandBeyonD."
            />
            <SocialIcon
              icon={<Instagram className="w-5 h-5" />}
              label="Instagram"
              url="https://www.instagram.com/lyan.kwh/"
            />
            <SocialIcon
              icon={<TikTokIcon className="w-5 h-5" />}
              label="TikTok"
              url="https://www.tiktok.com/@beyondlyan"
            />
            <SocialIcon
              icon={<Linkedin className="w-5 h-5" />}
              label="LinkedIn"
              url="https://www.linkedin.com/in/lyan-kaweh-053351230/"
            />
          </div>
        </div>

        {/* --- Bouton retour intégré --- */}
        <div className="pt-4">
          <Link
            to="/"
            className="inline-block text-sm bg-gradient-to-r from-green-600 via-black to-red-600 text-white font-medium px-6 py-2 rounded-xl shadow-sm hover:scale-105 transition-transform"
          >
            Retour à l’accueil
          </Link>
        </div>
      </motion.div>

      {/* --- Message final --- */}
      <p className="text-gray-500 text-sm italic mt-6 text-center">
        Ensemble, faisons avancer la marche pour Gaza !
      </p>
    </div>
  );
}

/* --- Icônes sociales --- */
function SocialIcon({
  icon,
  label,
  url,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group relative p-3 rounded-full bg-gray-900 text-white shadow-md transition-all hover:scale-110 hover:bg-gradient-to-r hover:from-green-600 hover:via-black hover:to-red-600"
    >
      <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      {icon}
    </a>
  );
}
