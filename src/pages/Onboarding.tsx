import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { User, MapPin, Phone, Target, Coins, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Onboarding() {
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("runner");
  const [expectedKm, setExpectedKm] = useState("");
  const [desiredPledge, setDesiredPledge] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasActiveSponsorship, setHasActiveSponsorship] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const navigate = useNavigate();

  // --- Initialisation ---
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // Bloque les utilisateurs non confirmés (ceux qui n'ont pas cliqué sur le lien magique)
      if (!user.email_confirmed_at) {
        showToast("error", "Veuillez confirmer votre adresse e-mail avant de continuer.");
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      // Récupère le profil s’il existe
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setHasProfile(true);
        setFullName(profile.full_name ?? "");
        setCity(profile.city ?? "");
        setPhone(profile.phone ?? "");
        setRole(profile.role ?? "runner");
        setExpectedKm(profile.expected_km > 0 ? String(profile.expected_km) : "");
        setDesiredPledge(profile.desired_pledge > 0 ? String(profile.desired_pledge) : "");
      }

      // Vérifie les parrainages actifs
      const { data: sponsorships } = await supabase
        .from("sponsorships")
        .select("id")
        .eq("runner_id", user.id)
        .eq("status", "accepted");

      setHasActiveSponsorship((sponsorships?.length || 0) > 0);
    })();
  }, [navigate]);

  // --- Toast helper ---
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // --- Validation helpers ---
  const phoneRegex = /^\+?[0-9\s\-]{6,20}$/;
  const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50}$/;

  // --- Sauvegarde du profil ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 🚫 Vérifie si l'email est bien confirmé
    if (!user.email_confirmed_at) {
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

    try {
      if (role === "runner") {
        if (!expectedKm || (!desiredPledge && !hasActiveSponsorship)) {
          showToast("error", "Veuillez remplir tous les champs obligatoires.");
          setSaving(false);
          return;
        }

        const expectedKmNumber = parseFloat(expectedKm);
        const desiredPledgeNumber = parseFloat(desiredPledge);

        if (
          isNaN(expectedKmNumber) ||
          expectedKmNumber <= 0 ||
          expectedKmNumber > 180
        ) {
          showToast("error", "Veuillez entrer un nombre de kilomètres valide. (1-180km)");
          setSaving(false);
          return;
        }

        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: fullName.trim(),
          city: city.trim(),
          phone: phone.trim(),
          role,
          expected_km: expectedKmNumber,
          desired_pledge: hasActiveSponsorship ? undefined : desiredPledgeNumber,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: fullName.trim(),
          city: city.trim(),
          phone: phone.trim(),
          role,
          expected_km: 0,
          desired_pledge: 0,
        });

        if (error) throw error;
      }

      if (!hasProfile && password.trim() !== "") {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) throw pwdError;
      }

      showToast("success", "Profil enregistré avec succès !");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch {
      showToast("error", "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 -mt-10">
      <form
        onSubmit={handleSave}
        className="w-full max-w-3xl bg-white shadow-md rounded-2xl p-8 space-y-6 border border-gray-200"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {hasProfile ? "Modifier mon profil" : "Compléter votre profil"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ces informations permettent d’afficher votre profil et de faciliter le parrainage.
          </p>
        </div>

        {/* Form */}
        <div className="grid sm:grid-cols-2 gap-5">
          <AnimatedInput
            label="Nom complet"
            icon={<User className="w-4 h-4 text-blue-500" />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <AnimatedSelect
            label="Rôle"
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
            onChange={(e) => setCity(e.target.value)}
            required
          />

          <AnimatedInput
            label="Téléphone"
            icon={<Phone className="w-4 h-4 text-purple-500" />}
            type="tel"
            inputMode="tel"
            pattern="^\+?[0-9\s\-]{6,20}$"
            title="Format valide : +41 76 123 45 67"
            placeholder="+41 76 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
                onChange={(e) => setExpectedKm(e.target.value)}
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
                onChange={(e) => setDesiredPledge(e.target.value)}
                required={!hasActiveSponsorship}
                placeholder="Ex: 5"
                disabled={hasActiveSponsorship}
              />

              {hasActiveSponsorship && (
                <p className="text-xs text-gray-500 sm:col-span-2">
                  Vous avez déjà des parrainages actifs — le montant par km ne peut plus être modifié.
                </p>
              )}
            </>
          )}

          {!hasProfile && (
            <AnimatedInput
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="sm:col-span-2"
            />
          )}
        </div>

        <motion.button
          type="submit"
          disabled={saving}
          className="w-full mt-4 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
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
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
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
function AnimatedInput({ label, icon, className = "", ...props }: any) {
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

function AnimatedSelect({ label, options, ...props }: any) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        {...props}
        className="w-full p-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </motion.div>
  );
}
