import { motion } from "framer-motion";
import { MapPinned, Clock, Flag, ArrowRight, Navigation } from "lucide-react";

export default function Marche() {
  const etapes = [
    { ville: "Genève (Pont du Mont-Blanc)", km: "0 km", heure: "07h00 (sam.)" },
    { ville: "Versoix", km: "10 km", heure: "09h00" },
    { ville: "Nyon", km: "25 km", heure: "12h00" },
    { ville: "Rolle", km: "40 km", heure: "15h00" },
    { ville: "Morges", km: "55 km", heure: "18h00" },
    { ville: "Lausanne (Ouchy)", km: "60 km", heure: "19h30" },
    { ville: "Lutry", km: "70 km", heure: "21h30" },
    { ville: "Vevey", km: "85 km", heure: "00h30 (dim.)" },
    { ville: "Montreux", km: "90 km", heure: "01h30" },
    { ville: "Villeneuve", km: "100 km", heure: "03h30" },
    { ville: "Saint-Gingolph (FR)", km: "115 km", heure: "06h30" },
    { ville: "Évian-les-Bains", km: "130 km", heure: "09h30" },
    { ville: "Thonon-les-Bains", km: "150 km", heure: "13h30" },
    { ville: "Hermance", km: "170 km", heure: "17h30" },
    { ville: "Genève (Arrivée officielle)", km: "180 km", heure: "19h00" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-800 font-sans">
      {/* SECTION LIVE TRACKING */}
      <motion.section
        className="bg-gradient-to-r from-green-700 via-black to-red-700 text-white py-16 px-6 md:px-10 text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="max-w-3xl mx-auto">
          <Navigation className="w-12 h-12 mx-auto mb-4 text-white/90" />
          <h2 className="text-3xl font-extrabold mb-3">
            Suivi en direct – Jour de la marche
          </h2>
          <p className="text-white/90 text-lg leading-relaxed mb-6">
            Le jour du départ, chaque marcheur pourra partager sa position en temps réel, et vous pourrez suivre l'avancée de Lyan en direct!
            Un moyen de vivre ensemble cette aventure de solidarité, où que vous soyez.
          </p>
          <p className="text-white/80 italic">
            Le module de suivi sera activé automatiquement le 25 octobre 2025 à 07h00.
          </p>
        </div>
      </motion.section>
      <br></br>

      {/* SECTION ÉTAPES */}
      <motion.section
        className="max-w-6xl mx-auto px-6 md:px-10 pb-24"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-10 bg-gradient-to-r from-green-700 via-black to-red-700 bg-clip-text text-transparent">
          Étapes et heures de passage
        </h2>

        {/* INDICATION DE SLIDE */}
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-3 text-sm">
          <ArrowRight className="w-4 h-4 text-gray-400 animate-pulse" />
          <span>Faites glisser de gauche à droite pour découvrir les étapes</span>
        </div>

        {/* TIMELINE */}
        <div className="relative flex overflow-x-auto no-scrollbar py-6 px-2 md:px-4 space-x-6">
          {etapes.map((etape, i) => (
            <motion.div
              key={i}
              className="flex-shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all w-[210px] md:w-[240px] flex flex-col items-center text-center p-4"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.1, delay: i * 0.005 }} // animation accélérée
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-green-700 via-black to-red-700 text-white mb-2 text-sm font-semibold">
                {i + 1}
              </div>
              <p className="font-semibold text-gray-800 text-sm md:text-base">
                {etape.ville}
              </p>
              <p className="text-xs text-gray-500 mt-1">{etape.km}</p>
              <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{etape.heure}</span>
              </div>
            </motion.div>
          ))}

          {/* Ligne de progression */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-green-700 via-black to-red-700 -z-10"></div>
        </div>
      </motion.section>

      {/* SECTION LIEN PARRAINAGE */}
      <motion.section
        className="text-center py-5"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <p className="text-gray-700 italic text-lg mb-6">
          Vous pouvez déjà soutenir la marche en parrainant un participant.
        </p>
        <a
          href="/participer"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-green-700 via-black to-red-700 text-white font-semibold hover:brightness-110 transition-all shadow-md"
        >
          Accéder au parrainage
        </a>
      </motion.section>
    </div>
  );
}
