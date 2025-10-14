import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe2, LogOut, LogIn, UserPlus, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function AppShell() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Désactive la restauration auto du scroll par le navigateur (global)
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  // Remonte en haut à chaque changement d’URL (route et/ou query)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const links = [
    { to: "/participer", label: "Participer" },
    { to: "/track", label: "Marche" },
    { to: "/association", label: "Association YAFFA" },
    { to: "/media", label: "Médias & Contact" },
    
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900"
    >
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/60 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg hover:opacity-90 transition"
          >
            <img
              src="/media/watermelon.png"
              alt="Logo"
              className="h-8 w-8 object-contain rounded"
            />
            <span className="bg-gradient-to-r from-green-600 via-black to-red-600 bg-clip-text text-transparent">
              WalkForGaza
            </span>
          </Link>

          {/* Navigation Centrale */}
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`transition-all ${
                  location.pathname === link.to
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-black to-red-600 font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Lang + Auth + Menu */}
          <div className="flex items-center gap-3">
            {/* Auth */}
            {loading ? (
              <span className="text-sm text-gray-400">...</span>
            ) : user ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 via-black to-red-600 text-white text-sm font-medium shadow-sm hover:brightness-110 transition"
                >
                  <LogIn className="w-4 h-4" /> Se connecter
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition"
                >
                  <UserPlus className="w-4 h-4" /> S'inscrire
                </Link>
              </>
            )}

            {/* Menu burger (mobile) */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 md:hidden"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Ligne Gaza subtile */}
        <div className="h-[3px] w-full bg-gradient-to-r from-green-600 via-black to-red-600"></div>

        {/* Menu mobile */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="md:hidden backdrop-blur-xl bg-white/80 border-t border-gray-200 shadow-inner"
            >
              <div className="flex flex-col items-center py-4 space-y-4">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`text-sm ${
                      location.pathname === link.to
                        ? "text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-black to-red-600 font-semibold"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="pt-2 border-t border-gray-200 w-2/3" />

                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="text-gray-800 hover:underline text-sm"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="text-green-700 hover:underline text-sm"
                    >
                      Se connecter
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="text-gray-700 hover:underline text-sm"
                    >
                      S'inscrire
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 text-center text-sm text-gray-500 backdrop-blur-xl bg-white/50">
        <div className="h-[3px] w-full bg-gradient-to-r from-green-600 via-black to-red-600"></div>
        <p className="py-4">
          © {new Date().getFullYear()} —{" "}
          <span className="font-medium text-gray-700">Marche pour Gaza</span>
        </p>
      </footer>
    </motion.div>
  );
}
