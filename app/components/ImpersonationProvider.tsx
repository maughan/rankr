"use client";

import { createContext, useContext } from "react";

interface ImpersonationCtx {
  isImpersonating: boolean;
  targetUsername: string | null;
  targetUserId: number | null;
}

const ImpersonationContext = createContext<ImpersonationCtx>({
  isImpersonating: false,
  targetUsername: null,
  targetUserId: null,
});

export function ImpersonationProvider({
  children,
  isImpersonating,
  targetUsername,
  targetUserId,
}: {
  children: React.ReactNode;
  isImpersonating: boolean;
  targetUsername: string | null;
  targetUserId: number | null;
}) {
  return (
    <ImpersonationContext.Provider
      value={{ isImpersonating, targetUsername, targetUserId }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationCtx {
  return useContext(ImpersonationContext);
}
