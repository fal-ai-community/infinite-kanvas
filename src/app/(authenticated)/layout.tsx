import { PropsWithChildren } from "react";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/icons";
import Link from "next/link";

export default function AuthenticatedLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Logo className="h-6 w-6" />
              <span className="font-bold">Infinite Kanvas</span>
            </Link>
          </div>

          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
