"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function SessionExpiredNotifier() {
  useEffect(() => {
    if (sessionStorage.getItem("rk_session_expired")) {
      sessionStorage.removeItem("rk_session_expired");
      toast("You've been signed out. Please log in again.");
    }
  }, []);

  return null;
}
