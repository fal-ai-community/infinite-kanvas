"use client";

import React from "react";
import * as Clerk from "@clerk/elements/common";
import * as ClerkSignIn from "@clerk/elements/sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SignInForgotPasswordStep = () => {
  return (
    <ClerkSignIn.Step name="forgot-password">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Forgot password?
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Clerk.Field name="identifier" asChild>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                className="h-10"
              />
            </Clerk.Field>
            <Clerk.FieldError className="text-sm text-destructive" />
          </div>

          <ClerkSignIn.Action submit asChild>
            <Button className="w-full" size="lg">
              Send reset link
            </Button>
          </ClerkSignIn.Action>

          <ClerkSignIn.Action navigate="start" asChild>
            <Button variant="link" className="w-full" size="sm">
              Back to sign in
            </Button>
          </ClerkSignIn.Action>
        </div>
      </div>
    </ClerkSignIn.Step>
  );
};
