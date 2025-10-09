// src/components/ProtectedRoute.tsx
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

type Props = { children: ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const { token, fetchMe } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!token) {
      nav("/login");
    } else {
      fetchMe();
    }
  }, [token, fetchMe, nav]);

  if (!token) return null; // (ou un spinner)
  return <>{children}</>;
}
