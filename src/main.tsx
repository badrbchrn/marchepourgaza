import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./i18n";
import "./index.css";
import "leaflet/dist/leaflet.css?inline";

import AppShell from "./ui/AppShell";
import Home from "./pages/Home";
import Participate from "./pages/Participate";
import Media from "./pages/Media";
import Track from "./pages/Track";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import SignUp from "./pages/Signup";
import Association from "./pages/Association";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: "participer", element: <Participate /> },
      { path: "media", element: <Media /> },
      { path: "track", element: <Track /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "login", element: <Login /> },
      { path: "onboarding", element: <Onboarding /> },
      { path: "signup", element: <SignUp /> },
      { path: "association", element: <Association /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
