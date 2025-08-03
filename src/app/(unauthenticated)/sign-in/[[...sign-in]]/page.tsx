"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignIn as CustomSignInComponent } from "@/components/auth/signin";
import { Logo } from "@/components/icons";

export default function SignInPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, router]);

  const handleSignInComplete = () => {
    // The useEffect above will handle redirection when isSignedIn becomes true
  };

  const handleRedirect = (path: string) => {
    router.push(path);
  };

  const renderLogo = () => null;

  return (
    <CustomSignInComponent
      onSignInComplete={handleSignInComplete}
      onRedirect={handleRedirect}
      renderLogo={renderLogo}
    />
  );
}
