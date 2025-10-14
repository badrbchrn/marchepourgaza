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
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Role = "runner" | "sponsor";

const toNumber = (v: string): number => {
  if (typeof v !== "string") return NaN;
  const clean = v.replace(/\s+/g, "").replace(",", ".");
  return Number.parseFloat(clean);
};

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

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const phoneRegex = /^\+?[0-9()\s.\-]{6,24}$/;
  const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50}$/;

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const isConfirmed = Boolean(
          (user as any).email_confirmed_at || (user as any).confirmed_at
        );
        if (!isConfirmed) {
          showToast("error", "Veuillez confirmer votre e-mail avant de continuer.");
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
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
          setRole((profile.role as Role) ?? "runner");
          setExpectedKm(profile.expected_km > 0 ? String(profile.expected_km) : "");
          setDesiredPledge(profile.desired_pledge > 0 ? String(profile.desired_pledge) : "");
        }

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

  const readyForPublic = useMemo(() => {
    const hasContact = Boolean(fullName.trim() && city.trim() && phone.trim());
    if (!hasContact) return false;

    if (role === "sponsor") return true;

    const km = toNumber(expectedKm);
    const pledge = toNumber(desiredPledge);
    const kmOk = Number.isFinite(km) && km > 0 && km <= 180;
    const pledgeOk = hasActiveSponsorship ? true : (Number.isFinite(pledge) && pledge > 0);

    return kmOk && pledgeOk;
  }, [role, fullName, city, phone, expectedKm, desiredPledge, hasActiveSponsorship]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const base = {
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        city: city.trim(),
        phone: phone.trim(),
        role,
        is_onboarded: readyForPublic,
      };

      if (role === "runner") {
        const expectedKmNumber = toNumber(expectedKm);
        const desiredPledgeNumber = toNumber(desiredPledge);
        const payload = {
          ...base,
          expected_km: expectedKmNumber,
          ...(hasActiveSponsorship ? {} : { desired_pledge: desiredPledgeNumber }),
        };
        const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .upsert({ ...base, expected_km: 0, desired_pledge: 0 }, { onConflict: "id" });
        if (error) throw error;
      }

      if (!hasProfile && password.trim() !== "") {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) throw pwdError;
      }

      showToast("success", "Profil enregistré avec succès !");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      showToast("error", err?.message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <motion.form
        onSubmit={handleSave}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl backdrop-blur-xl bg-white/70 border border-gray-200 rounded-3xl shadow-xl p-8 md:p-10 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              {hasProfile ? "Modifier votre profil" : "Compléter votre profil"}
            </span>
          </h1>
          <p className="text-gray-500 text-sm">
            Ces informations permettent de vous afficher publiquement et de faciliter le parrainage.
          </p>
        </div>

        {/* Status */}
        <div
          className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
            readyForPublic
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          }`}
        >
          {readyForPublic ? <Eye className="w-4 h-4 mt-0.5" /> : <EyeOff className="w-4 h-4 mt-0.5" />}
          <div>
            <p className="font-semibold">
              {readyForPublic ? "Profil public actif" : "Profil encore privé"}
            </p>
            {!readyForPublic && (
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                {!fullName.trim() && <li>Nom complet requis</li>}
                {!city.trim() && <li>Ville requise</li>}
                {!phone.trim() && <li>Téléphone requis</li>}
              </ul>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="grid sm:grid-cols-2 gap-5">
          <AnimatedInput
            label="Nom complet"
            icon={<User className="w-4 h-4 text-green-600" />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <AnimatedSelect
            label="Rôle"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={[
              { value: "runner", label: "Marcheur" },
              { value: "sponsor", label: "Parrain" },
            ]}
          />

          <AnimatedInput
            label="Ville"
            icon={<MapPin className="w-4 h-4 text-green-600" />}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />

          <AnimatedInput
            label="Téléphone"
            icon={<Phone className="w-4 h-4 text-green-600" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+41 76 123 45 67"
            required
          />

          {role === "runner" && (
            <>
              <AnimatedInput
                label="Kilomètres prévus"
                icon={<Target className="w-4 h-4 text-green-600" />}
                value={expectedKm}
                onChange={(e) => setExpectedKm(e.target.value)}
                placeholder="Ex: 180"
                required
              />

              <AnimatedInput
                label="CHF / km souhaité"
                icon={<Coins className="w-4 h-4 text-green-600" />}
                value={desiredPledge}
                onChange={(e) => setDesiredPledge(e.target.value)}
                placeholder="Ex: 5"
                required={!hasActiveSponsorship}
                disabled={hasActiveSponsorship}
              />
            </>
          )}

          {!hasProfile && (
            <AnimatedInput
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sm:col-span-2"
            />
          )}
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={saving || loading}
          className="relative w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-green-600 via-black to-red-600 hover:brightness-110 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </motion.button>
      </motion.form>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl backdrop-blur-lg border border-white/20 shadow-2xl text-white text-sm font-medium z-[9999] ${
              toast.type === "success"
                ? "bg-green-600/90 ring-2 ring-green-400/50"
                : "bg-red-600/90 ring-2 ring-red-400/50"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? <CheckCircle /> : <XCircle />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Input Animé --- */
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
        className="w-full p-3 rounded-lg border border-gray-300 text-sm bg-white/70 focus:ring-2 focus:ring-green-600 focus:border-green-600 transition disabled:bg-gray-100 disabled:text-gray-500"
      />
    </motion.div>
  );
}

/* --- Select --- */
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
        className="w-full p-3 rounded-lg border border-gray-300 text-sm bg-white/70 focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
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
