import { PropsWithChildren } from "react";
import { Logo } from "@/components/icons";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function UnauthenticatedLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center justify-center relative">
          <Link
            href="https://fal.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <Logo className="h-5 w-auto hover:opacity-80 transition-opacity" />
          </Link>
          <div className="absolute top-1/2 right-1 transform -translate-y-1/2">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
