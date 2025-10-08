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
  const [expectedKm, setExpectedKm] = useState<number>(0);
  const [desiredPledge, setDesiredPledge] = useState<number>(0);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

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
        setExpectedKm(profile.expected_km ?? 0);
        setDesiredPledge(profile.desired_pledge ?? 0);
      }
    })();
  }, [navigate]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      city,
      phone,
      role,
      expected_km: role === "runner" ? expectedKm : 0,
      desired_pledge: role === "runner" ? desiredPledge : 0,
    });

    if (profileError) {
      showToast("error", profileError.message);
      setSaving(false);
      return;
    }

    if (!hasProfile && password.trim() !== "") {
      const { error: pwdError } = await supabase.auth.updateUser({ password });
      if (pwdError) {
        showToast("error", "Erreur mot de passe : " + pwdError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    showToast("success", "Profil enregistré avec succès !");
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 -mt-10">
      <form
        onSubmit={handleSave}
        className="w-full max-w-3xl bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-200 backdrop-blur-sm"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-extrabold text-gray-900">
            {hasProfile ? "Modifier mon profil" : "Compléter votre profil"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ces infos permettent d’afficher votre profil et de faciliter le parrainage.
          </p>
        </motion.div>

        {/* Grid form */}
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
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <AnimatedInput
            label="Téléphone"
            icon={<Phone className="w-4 h-4 text-purple-500" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {role === "runner" && (
            <>
              <AnimatedInput
                label="Km prévus"
                icon={<Target className="w-4 h-4 text-red-500" />}
                type="number"
                value={expectedKm}
                onChange={(e) => setExpectedKm(Number(e.target.value))}
              />

              <AnimatedInput
                label="CHF/km souhaités"
                icon={<Coins className="w-4 h-4 text-yellow-500" />}
                type="number"
                step="0.1"
                value={desiredPledge}
                onChange={(e) => setDesiredPledge(Number(e.target.value))}
              />
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

        {/* Bouton */}
        <motion.button
          type="submit"
          disabled={saving}
          className="relative w-full mt-4 bg-gray-900 text-white py-3 rounded-lg font-semibold shadow-md overflow-hidden group disabled:opacity-50"
          whileHover={{ scale: 1.01 }}
        >
          <span className="relative z-10">
            {saving ? "Enregistrement..." : hasProfile ? "Enregistrer les modifications" : "Enregistrer et continuer"}
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-green-600 via-black to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" />
        </motion.button>
      </form>

      {/* Toasts améliorés */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-5 py-3 rounded-xl shadow-2xl border text-white backdrop-blur-lg z-50 ${
              toast.type === "success"
                ? "bg-gradient-to-r from-green-600 via-emerald-500 to-green-700 border-green-400/30"
                : "bg-gradient-to-r from-red-600 via-rose-500 to-red-700 border-red-400/30"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <CheckCircle className="w-6 h-6 text-white/90" />
              ) : (
                <XCircle className="w-6 h-6 text-white/90" />
              )}
              <div>
                <p className="font-semibold">
                  {toast.type === "success" ? "Succès" : "Erreur"}
                </p>
                <p className="text-sm text-white/90">{toast.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Composants utilitaires pour champs animés --- */
function AnimatedInput({ label, icon, className = "", ...props }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`relative ${className}`}
    >
      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        {...props}
        className="w-full p-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
      />
    </motion.div>
  );
}

function AnimatedSelect({ label, options, ...props }: any) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        {...props}
        className="w-full p-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
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
