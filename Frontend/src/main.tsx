// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";                            // ajuste le chemin si besoin
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MissionDetail from "./pages/MissionDetail";
import PuzzlePage from "./pages/Puzzle";
import MissionDebrief from "./pages/MissionDebrief";
import ProtectedRoute from "./components/ProtectedRoute";

import "./index.css"; // si tu as un fichier global de styles

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "missions/:id", element: <MissionDetail /> }, // <-- route mission
      { path: "missions/:id/debrief", element: <MissionDebrief /> },
      { path: "puzzles/:id", element: <PuzzlePage /> },     // <-- route puzzle
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
