import { PropsWithChildren } from "react";

export default function PublicLayout({ children }: PropsWithChildren) {
  // Public routes have no shared layout - each page manages its own structure
  return <>{children}</>;
}
