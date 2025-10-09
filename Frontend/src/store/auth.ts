import { create } from "zustand";
import { api } from "../lib/api";
import type { TokenResponse, User } from "../types";

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem("token"),
  user: null,
  loading: false,
  error: null,

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      await api("/users/register", { method: "POST", body: { username, password } });
      // enchaîner par login
      await get().login(username, password);
    } catch (e: any) {
      set({ error: e.message || "Inscription impossible" });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const data = (await api("/users/login", {
        method: "POST",
        body: { username, password },
      })) as TokenResponse;

      localStorage.setItem("token", data.access_token);
      set({ token: data.access_token });
      await get().fetchMe();
    } catch (e: any) {
      set({ error: "Identifiants invalides" });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const me = (await api("/users/me", { token })) as User;
      set({ user: me });
    } catch {
      // token invalide => logout
      get().logout();
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },
}));
