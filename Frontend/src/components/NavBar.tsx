import { useAuth } from "../store/auth";
import { useNavigate } from "react-router-dom";
import Timer from "./Timer";

export default function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="font-bold">Mission Vitale</div>
        <div className="flex items-center gap-3">
          <Timer />
          {user && <span className="text-sm text-gray-600">Connecté : <b>{user.username}</b></span>}
          {user && (
            <button
              className="px-3 py-1.5 rounded-md bg-gray-900 text-white hover:opacity-90"
              onClick={() => { logout(); nav("/login"); }}
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
