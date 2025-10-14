import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ShieldCheck, Sparkles, CheckCircle, XCircle, X } from "lucide-react";

const TOAST_LIFETIME = 4000;

export default function Signup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), TOAST_LIFETIME);
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

    if (error) showToast("error", error.message);
    else {
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
          className="relative w-full py-2.5 md:py-3 rounded-lg font-semibold text-white 
            transition-all shadow-md flex items-center justify-center gap-2
            bg-gradient-to-r from-green-600 via-black to-red-600
            hover:brightness-110 disabled:opacity-50"
        >
          <span className="tracking-wide text-sm md:text-base">
            {loading ? "Envoi du lien..." : "Recevoir le lien magique"}
          </span>
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-300" />
          <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-60 transition-opacity duration-700"></span>
        </motion.button>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm pt-2">
          Déjà inscrit ?{" "}
          <a href="/login" className="text-green-700 hover:underline font-medium">
            Se connecter
          </a>
        </p>
      </motion.form>

      <Toast toast={toast} setToast={setToast} />
    </div>
  );
}

/* Toast Component */
function Toast({ toast, setToast }: any) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.message}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="fixed bottom-6 right-6 z-[9999]"
        >
          <div
            className={`relative max-w-[92vw] sm:max-w-md rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/20 border border-white/10 text-white
              ${toast.type === "success" ? "bg-emerald-600/90" : "bg-red-600/90"}`}
          >
            <span
              className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                toast.type === "success" ? "bg-emerald-300/90" : "bg-red-300/90"
              }`}
            />
            <div className="flex items-start gap-3 pr-8">
              {toast.type === "success" ? (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
              <div className="text-sm sm:text-base font-medium leading-snug">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="absolute top-2.5 right-2.5 inline-flex items-center justify-center rounded-md/8 hover:bg-white/10 transition p-1"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 opacity-90" />
              </button>
            </div>
            <div className="absolute left-0 right-0 bottom-0 h-1.5 rounded-b-2xl overflow-hidden bg-white/15">
              <motion.div
                key={toast.message}
                initial={{ width: "100%" }}
                animate={{ width: 0 }}
                transition={{ duration: TOAST_LIFETIME / 1000, ease: "linear" }}
                className={`h-full ${toast.type === "success" ? "bg-emerald-300" : "bg-red-300"}`}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
