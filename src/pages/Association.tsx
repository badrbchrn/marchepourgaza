import { motion } from "framer-motion";
import {
  HeartHandshake,
  Globe,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  HandHeart,
  Images,
  Snowflake,
  BookOpen,
  Users,
} from "lucide-react";

// ---- Images ----
const HERO_IMG = "/media/IMG_5056.jpeg";     // kits
const CHILDREN_IMG = "/media/IMG_5053.jpeg"; // bonnets & écharpes
const FIELD_IMG = "/media/IMG_5055.jpeg";    // distribution terrain
const YAFFA_LOGO = "/media/logoYAFFA.png";   // <<—— nouveau

// Fallback image
const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop stop-color='#f1f5f9' offset='0'/>
          <stop stop-color='#e2e8f0' offset='1'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='630' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#64748b' font-family='system-ui' font-size='28'>
        Image indisponible
      </text>
    </svg>`
  );

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay },
  viewport: { once: true, margin: "-80px" },
});

export default function Association() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdfdfd] via-[#fafafa] to-[#f5f5f5] text-gray-900">
      {/* ======================= HERO ======================= */}
      <section className="relative">
        <div className="relative mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-b-[2.2rem]">
            <img
              src={HERO_IMG}
              onError={(e) => (e.currentTarget.src = FALLBACK)}
              alt="Aide humanitaire: kits alimentaires distribués à Gaza"
              className="h-[46vh] w-full object-cover sm:h-[54vh] md:h-[58vh]"
              loading="eager"
            />
            {/* voile */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />

            {/* Logo YAFFA mis en avant */}
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
              <div className="rounded-2xl bg-white/90 p-2 ring-1 ring-black/10 shadow-lg backdrop-blur">
                <img
                  src={YAFFA_LOGO}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  alt="Logo Association Yaffa"
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                />
              </div>
            </div>

            {/* contenu texte */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full px-5 sm:px-8">
                <div className="mx-auto max-w-5xl text-white">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md ring-1 ring-white/20">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Partenaire de WalkForGaza
                  </span>

                  <motion.h1
                    className="mt-4 text-4xl font-extrabold tracking-tight drop-shadow sm:text-5xl md:text-6xl"
                    {...fadeUp(0.05)}
                  >
                    Association <span className="text-red-300">Yaffa</span>
                  </motion.h1>

                  <motion.p
                    className="mt-3 max-w-3xl text-sm/6 sm:text-base/7 text-white/90"
                    {...fadeUp(0.12)}
                  >
                    Une passerelle entre la Suisse et la Palestine. Yaffa œuvre
                    pour le soutien psychosocial, éducatif et artistique des
                    familles et enfants de Gaza.
                  </motion.p>

                  <motion.div className="mt-6" {...fadeUp(0.2)}>
                    <a
                      href="#qui-est-yaffa"
                      className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/5 hover:bg-white"
                    >
                      En savoir plus
                      <ExternalLink className="h-4 w-4 opacity-70" />
                    </a>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================ SECTION : Qui est Yaffa ? ================ */}
      <motion.section
        id="qui-est-yaffa"
        className="mx-auto mt-10 max-w-7xl px-5 sm:px-8"
        {...fadeUp(0.05)}
      >
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <div className="relative rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            {/* petit logo subtil en haut à droite */}
            <img
              src={YAFFA_LOGO}
              onError={(e) => (e.currentTarget.style.display = "none")}
              alt=""
              className="pointer-events-none absolute right-5 top-5 h-7 w-7 opacity-70"
            />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600/15 to-red-600/15 ring-1 ring-black/5">
                <Globe className="h-5 w-5 text-green-700" />
              </div>
              <h2 className="text-2xl font-bold">Qui est Yaffa&nbsp;?</h2>
            </div>

            <div className="mt-4 space-y-4 text-gray-700">
              <p className="mt-1 max-w-3xl text-gray-700 leading-snug">

                <strong>Yaffa</strong> est une association genevoise à but non
                lucratif. Elle conçoit, coordonne et soutient des projets
                d’intervention psychosociale, ainsi que des initiatives
                éducatives et artistiques, en collaboration avec des partenaires
                locaux à Gaza.
              </p>
              <p className="mt-1 max-w-3xl text-gray-700 leading-snug">
                Sur le terrain, les équipes accompagnent les enfants, les mamans
                et les familles au plus près des besoins concrets, avec une
                attention portée au lien social, à la confiance et aux
                perspectives.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <FeaturePill icon={<ShieldCheck className="h-4 w-4" />}>
                Transparence & terrain
              </FeaturePill>
              <FeaturePill icon={<HandHeart className="h-4 w-4" />}>
                Impact direct familles
              </FeaturePill>
              <FeaturePill icon={<Sparkles className="h-4 w-4" />}>
                Activités éducatives & artistiques
              </FeaturePill>
              <FeaturePill icon={<Images className="h-4 w-4" />}>
                Actions documentées
              </FeaturePill>
            </div>

            <div className="mt-6">
              <a
                href="https://association-yaffa.ch"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-700 via-black to-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110"
              >
                <HeartHandshake className="h-4 w-4" />
                Visiter le site de Yaffa
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            </div>
          </div>

          {/* Image à droite + watermark logo discret */}
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <img
              src={CHILDREN_IMG}
              onError={(e) => (e.currentTarget.src = FALLBACK)}
              alt="Hiver au chaud : bonnets & écharpes"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-5">
              {/* watermark discret */}
              <img
                src={YAFFA_LOGO}
                onError={(e) => (e.currentTarget.style.display = "none")}
                alt=""
                className="ml-auto h-6 w-6 opacity-90"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ================ Programme Sourire ================ */}
      <motion.section
        className="mx-auto mt-10 max-w-7xl px-5 sm:px-8"
        {...fadeUp(0.05)}
      >
        <div className="items-center justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:flex md:p-8">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-green-600/10 ring-1 ring-green-600/20">
              <Sparkles className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Programme “Sourire”</h3>
              <p className="mt-1 max-w-3xl text-gray-700 leading-snug">
                Démarche psychosociale communautaire menée avec des partenaires
                locaux à Gaza. Activités éducatives et artistiques, écoute, et
                reconstruction du lien social — un même fil conducteur&nbsp;:
                redonner confiance et perspectives.
              </p>
            </div>
          </div>

          <a
            href="https://association-yaffa.ch/projet-sourire/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 md:mt-0"
          >
            En savoir plus
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </a>
        </div>
      </motion.section>

      {/* ============ Liste d'actions + image à droite ============ */}
      <motion.section
        className="mx-auto mt-12 max-w-7xl px-5 sm:px-8"
        {...fadeUp(0.05)}
      >
        <div className="mb-4 flex items-center gap-2">
          {/* petit logo subtil près du titre */}
          <img
            src={YAFFA_LOGO}
            onError={(e) => (e.currentTarget.style.display = "none")}
            alt=""
            className="h-6 w-6 opacity-80"
          />
          <h3 className="text-2xl font-extrabold text-slate-800">Que fait Yaffa ?</h3>
        </div>

        <div className="grid gap-5 md:grid-cols-12 items-stretch">
          {/* Liste d'actions */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-7 md:p-8">
            <ul className="space-y-5">
              <ActionItem
                icon={<HeartHandshake className="h-5 w-5 text-green-700" />}
                title="Distribution de kits alimentaires"
                desc="Aides d’urgence (huile, conserves, légumineuses, eau) remises aux familles les plus exposées."
              />
              <ActionItem
                icon={<Snowflake className="h-5 w-5 text-sky-700" />}
                title="Hiver au chaud"
                desc="Bonnets, écharpes et vêtements chauds pour les enfants afin d’affronter la saison froide."
              />
              <ActionItem
                icon={<Sparkles className="h-5 w-5 text-yellow-700" />}
                title="Ateliers éducatifs et artistiques"
                desc="Espaces d’expression, activités créatives et ludiques pour renforcer résilience et confiance."
              />
              <ActionItem
                icon={<Users className="h-5 w-5 text-rose-700" />}
                title="Accompagnement psychosocial"
                desc="Écoute, cercles de parole et soutien de proximité pour enfants et mamans."
              />
              <ActionItem
                icon={<BookOpen className="h-5 w-5 text-indigo-700" />}
                title="Soutien scolaire"
                desc="Rattrapage, aide aux devoirs et animations pédagogiques menés avec les partenaires locaux."
              />
              <ActionItem
                icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
                title="Aide ciblée aux familles vulnérables"
                desc="Interventions adaptées aux besoins identifiés sur le terrain, en coordination avec les équipes locales."
              />
            </ul>
          </div>

          {/* Image à droite (pleine hauteur) + watermark discret */}
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm md:col-span-5 flex">
            <img
              src={FIELD_IMG}
              onError={(e) => (e.currentTarget.src = FALLBACK)}
              alt="Distribution sur le terrain"
              loading="lazy"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Distribution sur le terrain</p>
                <img
                  src={YAFFA_LOGO}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  alt=""
                  className="h-6 w-6 opacity-90"
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Photos fournies par l’Association Yaffa, utilisées avec autorisation.
        </p>
      </motion.section>

      {/* ======================= CTA ======================= */}
      <motion.section
        className="mx-auto my-14 max-w-7xl px-5 sm:px-8"
        {...fadeUp(0.05)}
      >
        <div className="relative items-center justify-between rounded-3xl border border-gray-200 bg-gradient-to-br from-green-50 via-white to-red-50 p-6 shadow-sm md:flex md:p-8">
          {/* petit logo subtil en filigrane */}
          <img
            src={YAFFA_LOGO}
            onError={(e) => (e.currentTarget.style.display = "none")}
            alt=""
            className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 opacity-20"
          />

          <div>
            <h4 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
              <img
                src={YAFFA_LOGO}
                onError={(e) => (e.currentTarget.style.display = "none")}
                alt=""
                className="h-6 w-6"
              />
              Envie de soutenir Yaffa&nbsp;?
            </h4>
            <p className="mt-1 max-w-3xl text-gray-700 leading-snug">
              Découvrez leurs projets, faites un don ou contactez l’équipe
              directement sur leur site officiel.
            </p>
          </div>

          <a
            href="https://pay.raisenow.io/msgxh?lng=fr"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-green-700 via-black to-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110 md:mt-0"
          >
            <HeartHandshake className="h-4 w-4" />
            Soutenir Yaffa
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </a>
        </div>
      </motion.section>
    </div>
  );
}

/* ======================= Petits composants ======================= */

function FeaturePill({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      {icon}
      {children}
    </span>
  );
}

function ActionItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{desc}</p>
      </div>
    </li>
  );
}
