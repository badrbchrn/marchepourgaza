import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Phone,
  Target,
  Coins,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Role = "runner" | "sponsor";

export default function Onboarding() {
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("runner");
  const [expectedKm, setExpectedKm] = useState("");
  const [desiredPledge, setDesiredPledge] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [hasProfile, setHasProfile] = useState(false);
  const [hasActiveSponsorship, setHasActiveSponsorship] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const navigate = useNavigate();

  // --- Toast helper ---
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // --- Validation helpers ---
  const phoneRegex = /^\+?[0-9\s\-]{6,20}$/;
  const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50}$/;

  // --- Initialisation ---
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        // Email confirmé : gérer confirmed_at ET email_confirmed_at (compat)
        const isConfirmed = Boolean(
          (user as any).email_confirmed_at || (user as any).confirmed_at
        );
        if (!isConfirmed) {
          showToast("error", "Veuillez confirmer votre adresse e-mail avant de continuer.");
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
          return;
        }

        // Récupère le profil s’il existe (policy self_select)
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profErr) console.error(profErr);

        if (profile) {
          setHasProfile(true);
          setFullName(profile.full_name ?? "");
          setCity(profile.city ?? "");
          setPhone(profile.phone ?? "");
          setRole((profile.role as Role) ?? "runner");
          setExpectedKm(profile.expected_km > 0 ? String(profile.expected_km) : "");
          setDesiredPledge(profile.desired_pledge > 0 ? String(profile.desired_pledge) : "");
        }

        // Vérifie les parrainages ACCEPTÉS (verrouille desired_pledge)
        const { data: sponsorships } = await supabase
          .from("sponsorships")
          .select("id")
          .eq("runner_id", user.id)
          .eq("status", "accepted");

        setHasActiveSponsorship((sponsorships?.length || 0) > 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // --- Calcul: prêt pour affichage public ? (même logique que ton SQL "dur") ---
  const readyForPublic = useMemo(() => {
    const hasContact = Boolean(fullName.trim() && city.trim() && phone.trim());
    if (!hasContact) return false;

    if (role === "sponsor") return true;

    const km = Number.parseFloat(expectedKm);
    const pledge = Number.parseFloat(desiredPledge);
    const kmOk = Number.isFinite(km) && km > 0 && km <= 180;
    const pledgeOk = hasActiveSponsorship ? true : (Number.isFinite(pledge) && pledge > 0);

    return kmOk && pledgeOk;
  }, [role, fullName, city, phone, expectedKm, desiredPledge, hasActiveSponsorship]);

  // --- Sauvegarde du profil ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isConfirmed = Boolean(
      (user as any).email_confirmed_at || (user as any).confirmed_at
    );
    if (!isConfirmed) {
      showToast("error", "Veuillez confirmer votre email avant de continuer.");
      setSaving(false);
      return;
    }

    // --- Validations côté client ---
    if (!fullName.trim()) {
      showToast("error", "Veuillez indiquer votre nom complet.");
      setSaving(false);
      return;
    }
    if (!cityRegex.test(city)) {
      showToast("error", "Nom de ville invalide.");
      setSaving(false);
      return;
    }
    if (!phoneRegex.test(phone)) {
      showToast("error", "Numéro de téléphone invalide.");
      setSaving(false);
      return;
    }

    // Normalisation light
    const fullNameClean = fullName.trim().replace(/\s+/g, " ");
    const cityClean = city.trim().replace(/\s+/g, " ");
    const phoneClean = phone.trim();

    try {
      const base: Record<string, any> = {
        id: user.id,
        email: user.email, // utile pour RLS publique
        full_name: fullNameClean,
        city: cityClean,
        phone: phoneClean,
        role,
        is_onboarded: readyForPublic, // 👉 visibilité publique auto si conditions ok
      };

      if (role === "runner") {
        if (!expectedKm || (!desiredPledge && !hasActiveSponsorship)) {
          showToast("error", "Veuillez remplir tous les champs obligatoires.");
          setSaving(false);
          return;
        }

        const expectedKmNumber = Number.parseFloat(expectedKm);
        const desiredPledgeNumber = Number.parseFloat(desiredPledge);

        if (!Number.isFinite(expectedKmNumber) || expectedKmNumber <= 0 || expectedKmNumber > 180) {
          showToast("error", "Veuillez entrer un nombre de kilomètres valide. (1-180km)");
          setSaving(false);
          return;
        }

        const payload = {
          ...base,
          expected_km: expectedKmNumber,
          // si parrainage actif, on NE TOUCHE PAS desired_pledge
          ...(hasActiveSponsorship
            ? {}
            : {
                desired_pledge: Number.isFinite(desiredPledgeNumber)
                  ? desiredPledgeNumber
                  : null,
              }),
        };

        const { error } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
      } else {
        const payload = {
          ...base,
          expected_km: 0,
          desired_pledge: 0,
        };
        const { error } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
      }

      // Mot de passe optionnel (uniquement 1ère fois)
      if (!hasProfile && password.trim() !== "") {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) throw pwdError;
      }

      showToast(
        "success",
        readyForPublic
          ? "Profil enregistré ! Vous êtes maintenant visible publiquement."
          : "Profil enregistré ! Complétez les infos pour être visible publiquement."
      );

      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      console.error(err);
      showToast("error", err?.message ?? "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 -mt-10">
      <form
        onSubmit={handleSave}
        aria-busy={loading}
        className={`w-full max-w-3xl bg-white shadow-md rounded-2xl p-8 space-y-6 border border-gray-200 transition ${
          loading ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {hasProfile ? "Modifier mon profil" : "Compléter votre profil"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ces informations permettent d’afficher votre profil et de faciliter le parrainage.
          </p>
        </div>

        {/* Statut de visibilité */}
        <div
          className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
            readyForPublic
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {readyForPublic ? <Eye className="w-4 h-4 mt-0.5" /> : <EyeOff className="w-4 h-4 mt-0.5" />}
          <div>
            <p className="font-semibold">
              {readyForPublic ? "Votre profil sera visible publiquement" : "Profil encore privé"}
            </p>
            {!readyForPublic && (
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                {!fullName.trim() && <li>Ajoutez votre nom complet</li>}
                {!city.trim() && <li>Indiquez votre ville</li>}
                {!phone.trim() && <li>Indiquez votre téléphone</li>}
                {role === "runner" && (
                  <>
                    {!(Number.parseFloat(expectedKm) > 0) && <li>Renseignez vos kilomètres prévus</li>}
                    {!hasActiveSponsorship && !(Number.parseFloat(desiredPledge) > 0) && (
                      <li>Indiquez le CHF/km souhaité (ou obtenez un parrainage accepté)</li>
                    )}
                  </>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="grid sm:grid-cols-2 gap-5">
          <AnimatedInput
            label="Nom complet"
            icon={<User className="w-4 h-4 text-blue-500" />}
            value={fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
            required
          />

          <AnimatedSelect
            label="Rôle"
            value={role}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setRole(e.target.value as Role)
            }
            options={[
              { value: "runner", label: "Marcheur" },
              { value: "sponsor", label: "Parrain" },
            ]}
          />

          <AnimatedInput
            label="Ville"
            icon={<MapPin className="w-4 h-4 text-green-500" />}
            type="text"
            pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50}$"
            title="Entrez une ville valide"
            value={city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
            required
          />

          <AnimatedInput
            label="Téléphone"
            icon={<Phone className="w-4 h-4 text-purple-500" />}
            type="tel"
            inputMode="tel"
            pattern="^\\+?[0-9\\s\\-]{6,20}$"
            title="Format valide : +41 76 123 45 67"
            placeholder="+41 76 123 45 67"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            required
          />

          {role === "runner" && (
            <>
              <AnimatedInput
                label="Km prévus"
                icon={<Target className="w-4 h-4 text-red-500" />}
                type="number"
                min="1"
                max="180"
                step="0.1"
                value={expectedKm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpectedKm(e.target.value)}
                required
                placeholder="Ex: 180"
              />

              <AnimatedInput
                label="CHF/km souhaités"
                icon={<Coins className="w-4 h-4 text-yellow-500" />}
                type="number"
                min="1"
                step="0.1"
                value={desiredPledge}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesiredPledge(e.target.value)}
                required={!hasActiveSponsorship}
                placeholder="Ex: 5"
                disabled={hasActiveSponsorship}
              />

              {hasActiveSponsorship && (
                <p className="text-xs text-gray-500 sm:col-span-2 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" />
                  Vous avez déjà des parrainages actifs — le montant par km ne peut plus être modifié.
                </p>
              )}
            </>
          )}

          {!hasProfile && (
            <AnimatedInput
              label="Mot de passe (optionnel)"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="sm:col-span-2"
            />
          )}
        </div>

        <motion.button
          type="submit"
          disabled={saving || loading}
          className="w-full mt-2 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          whileHover={{ scale: 1.01 }}
        >
          {saving
            ? "Enregistrement..."
            : hasProfile
            ? "Enregistrer les modifications"
            : "Enregistrer et continuer"}
        </motion.button>
      </form>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-4 py-2 rounded-md shadow-md text-sm z-50 font-medium ${
              toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Composants utilitaires --- */
function AnimatedInput({
  label,
  icon,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={`relative ${className}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        {...props}
        className="w-full p-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600 transition disabled:bg-gray-100 disabled:text-gray-500"
      />
    </motion.div>
  );
}

function AnimatedSelect({
  label,
  options,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }} className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        {...props}
        className="w-full p-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </motion.div>
  );
}
