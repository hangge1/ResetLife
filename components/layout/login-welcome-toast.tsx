"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function LoginWelcomeToast({ name }: { name: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);

    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div aria-live="polite" className="login-welcome-toast" role="status">
      <CheckCircle2 aria-hidden="true" className="login-welcome-toast__icon" />
      <span>欢迎{name}</span>
    </div>
  );
}
