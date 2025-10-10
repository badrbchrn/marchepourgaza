import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Mail, ShieldCheck,Sparkles } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    setLoading(false);

    if (error) {
      showToast("error", error.message);
    } else {
      showToast("success", "📧 Vérifie ton email pour confirmer ton compte !");
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <motion.form
        onSubmit={handleSignup}
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md backdrop-blur-xl bg-white/70 border border-gray-200 rounded-3xl shadow-xl p-8 md:p-10 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              Créer un compte
            </span>
          </h1>
          <p className="text-gray-500 text-sm">
            Entrez votre adresse email pour recevoir un lien de confirmation sécurisé.
          </p>
        </div>

        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 p-3 rounded-lg border border-gray-300 bg-white/70 focus:ring-2 focus:ring-green-600 text-sm"
              required
            />
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={loading}
          className={`
            relative w-full py-2.5 md:py-3 rounded-lg font-semibold text-white 
            transition-all shadow-md flex items-center justify-center gap-2
            bg-gradient-to-r from-green-600 via-black to-red-600
            hover:brightness-110 disabled:opacity-50
          `}
        >
          {/* Icône magique */}
          <motion.span
            initial={{ rotate: -10, scale: 0.9, opacity: 0.7 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center"
          >
            
          </motion.span>

          {/* Texte dynamique */}
          <span className="tracking-wide text-sm md:text-base">
            {loading ? "Envoi du lien..." : "Recevoir le lien magique"}
          </span>
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-300" />
          {/* Effet de brillance subtile */}
          <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-60 transition-opacity duration-700"></span>
        </motion.button>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-sm pt-2">
          Déjà inscrit ?{" "}
          <a href="/login" className="text-green-700 hover:underline font-medium">
            Se connecter
          </a>
        </p>
      </motion.form>

      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl backdrop-blur-lg border border-white/20 shadow-2xl text-white text-sm font-medium z-[9999]
            ${
              toast.type === "success"
                ? "bg-green-600/80"
                : "bg-red-600/80"
            }`}
        >
          {toast.message}
        </motion.div>
      )}
    </div>
  );
}
