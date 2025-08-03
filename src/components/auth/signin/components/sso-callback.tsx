"use client";

import React from "react";
import * as ClerkSignIn from "@clerk/elements/sign-in";
import { Loader2 } from "lucide-react";

interface SignInSsoCallbackStepProps {
  renderLogo?: () => React.ReactNode;
  goToHome: () => void;
}

export const SignInSsoCallbackStep = ({
  renderLogo,
  goToHome,
}: SignInSsoCallbackStepProps) => {
  return (
    <ClerkSignIn.Step name="sso-callback">
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        {renderLogo && renderLogo()}

        <Loader2 className="h-8 w-8 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </ClerkSignIn.Step>
  );
};
