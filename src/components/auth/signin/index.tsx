"use client";

import React, { useEffect } from "react";
import * as ClerkSignIn from "@clerk/elements/sign-in";
import { SignInStartStep } from "./components/start";
import { SignInVerificationsStep } from "./components/verifications";
import { SignInForgotPasswordStep } from "./components/forgot-password";
import { SignInResetPasswordStep } from "./components/reset-password";
import { SignInSsoCallbackStep } from "./components/sso-callback";

interface SignInProps {
  onSignInComplete?: () => void;
  onRedirect?: (path: string) => void;
  renderLogo?: () => React.ReactNode;
}

export const SignIn = ({
  onRedirect,
  onSignInComplete,
  renderLogo,
}: SignInProps) => {
  useEffect(() => {
    const handleClerkEvents = () => {
      const cb = () => {
        if (onSignInComplete) {
          onSignInComplete();
        } else if (onRedirect) {
          onRedirect("/");
        }
      };
      document.addEventListener("clerk:sign-in:complete", cb);
      return () => {
        document.removeEventListener("clerk:sign-in:complete", cb);
      };
    };
    const cleanup = handleClerkEvents();
    return cleanup;
  }, [onSignInComplete, onRedirect]);

  const goToHome = () => {
    try {
      if (onSignInComplete) {
        onSignInComplete();
      } else if (onRedirect) {
        onRedirect("/");
      }
    } catch (err) {
      console.error("Error during manual navigation:", err);
    }
  };

  return (
    <div className="w-full">
      <ClerkSignIn.Root routing="path" path="/sign-in">
        <SignInStartStep renderLogo={renderLogo} />
        <SignInSsoCallbackStep renderLogo={renderLogo} goToHome={goToHome} />
        <SignInVerificationsStep />
        <SignInForgotPasswordStep />
        <SignInResetPasswordStep />
      </ClerkSignIn.Root>
    </div>
  );
};
