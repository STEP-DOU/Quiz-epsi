import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../store/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const { login, loading, error, token } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await login(username, password);
      nav("/");
    } catch {}
  }

  if (token) {
    nav("/");
    return null;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow">
        <h1 className="text-xl font-bold mb-4">Connexion</h1>
        <label className="block text-sm mb-1">Nom d’utilisateur</label>
        <input
          className="w-full border rounded-md px-3 py-2 mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ex: steph"
        />
        <label className="block text-sm mb-1">Mot de passe</label>
        <input
          type="password"
          className="w-full border rounded-md px-3 py-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-md bg-gray-900 text-white py-2 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <p className="text-sm text-gray-600 mt-3">
          Pas de compte ? <Link className="text-blue-600" to="/register">S’inscrire</Link>
        </p>
      </form>
    </div>
  );
}
