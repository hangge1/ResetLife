import { Info } from "lucide-react";

export function GuestModeNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="guest-mode-notice">
      <Info aria-hidden="true" className="guest-mode-notice__icon" />
      <span>{children}</span>
    </p>
  );
}
