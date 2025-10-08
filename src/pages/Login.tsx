import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const navigate = useNavigate();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      showToast("error", "Email ou mot de passe incorrect.");
    } else {
      showToast("success", "Connexion réussie !");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md backdrop-blur-xl bg-white/70 border border-gray-200 rounded-3xl shadow-xl p-8 md:p-10 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <LogIn className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              Se connecter
            </span>
          </h1>
          <p className="text-gray-500 text-sm">
            Accédez à votre espace personnel pour gérer votre profil et vos parrainages.
          </p>
        </div>

        {/* Email */}
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

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          className="w-full py-3 rounded-xl font-semibold text-white shadow-md transition-all bg-gradient-to-r from-green-600 via-black to-red-600 hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </motion.button>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm pt-2">
          Pas encore de compte ?{" "}
          <a href="/signup" className="text-green-700 hover:underline font-medium">
            S’inscrire
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
            ${toast.type === "success" ? "bg-green-600/80" : "bg-red-600/80"}`}
        >
          {toast.message}
        </motion.div>
      )}
    </div>
  );
}
