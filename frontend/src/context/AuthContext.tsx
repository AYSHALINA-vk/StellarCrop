"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { User } from "../lib/api";

interface AuthContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    const saved = Cookies.get("stellarcrop_user");
    if (saved) {
      try {
        setUserState(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) Cookies.set("stellarcrop_user", JSON.stringify(u), { expires: 1 });
    else Cookies.remove("stellarcrop_user");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout: () => setUser(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);