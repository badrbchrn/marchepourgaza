import { motion } from "framer-motion";
import { HeartHandshake, Globe, ExternalLink } from "lucide-react";

export default function Association() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdfdfd] via-[#f8f8f8] to-[#f2f2f2] text-gray-900">
      {/* HERO */}
      <motion.section
        className="relative flex flex-col items-center justify-center text-center py-24 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-transparent to-red-600/10 rounded-b-[3rem]"></div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-green-700 via-black to-red-700 bg-clip-text text-transparent drop-shadow-sm">
          Association Yaffa
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-700 leading-relaxed">
          Une passerelle entre la Suisse et la Palestine.<br />
          L’association Yaffa œuvre pour le soutien psychosocial, éducatif et artistique des familles et enfants de Gaza.
        </p>
      </motion.section>

      {/* INFO CARD */}
      <motion.section
        className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-10 md:p-14 border border-gray-100 relative z-10 -mt-10 mb-24"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="bg-gradient-to-r from-green-600 to-red-600 p-[2px] rounded-full w-16 h-16 flex items-center justify-center mb-6 shadow-md">
            <div className="bg-white rounded-full w-14 h-14 flex items-center justify-center">
              <Globe className="w-7 h-7 text-green-700" />
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-5 text-lg">
            <strong>Yaffa</strong> est une association genevoise à but non lucratif qui soutient des projets
            humanitaires et psychosociaux en Palestine — notamment à Gaza — à travers des initiatives
            locales et des partenariats durables.
          </p>

          <p className="text-gray-700 leading-relaxed mb-8">
            Retrouvez toutes les informations détaillées sur leurs programmes, leurs actions et comment les
            soutenir directement sur leur site officiel.
          </p>

          <a
            href="https://association-yaffa.ch"
            target="_blank"
            className="group inline-flex items-center justify-center gap-3 px-7 py-3 text-lg font-semibold rounded-full text-white bg-gradient-to-r from-green-700 via-black to-red-700 hover:scale-[1.03] transition-all shadow-lg hover:shadow-2xl"
          >
            <HeartHandshake className="w-5 h-5 group-hover:animate-pulse" />
            <span>Visiter le site de Yaffa</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>
      </motion.section>

      {/* CALL TO ACTION */}
      
    </div>
  );
}
