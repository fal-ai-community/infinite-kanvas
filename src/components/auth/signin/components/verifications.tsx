"use client";

import React from "react";
import * as Clerk from "@clerk/elements/common";
import * as ClerkSignIn from "@clerk/elements/sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SignInVerificationsStep = () => {
  return (
    <ClerkSignIn.Step name="verifications">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Verify your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We've sent a verification code to your email
          </p>
        </div>

        <div className="space-y-4">
          <ClerkSignIn.Strategy name="email_code">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Clerk.Field name="code" asChild>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter verification code"
                  autoComplete="one-time-code"
                  className="h-10"
                />
              </Clerk.Field>
              <Clerk.FieldError className="text-sm text-destructive" />
            </div>

            <ClerkSignIn.Action submit asChild>
              <Button className="w-full" size="lg">
                Verify
              </Button>
            </ClerkSignIn.Action>
          </ClerkSignIn.Strategy>

          <ClerkSignIn.Strategy name="password">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Clerk.Field name="password" asChild>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-10"
                />
              </Clerk.Field>
              <Clerk.FieldError className="text-sm text-destructive" />
            </div>

            <ClerkSignIn.Action submit asChild>
              <Button className="w-full" size="lg">
                Continue
              </Button>
            </ClerkSignIn.Action>
          </ClerkSignIn.Strategy>
        </div>
      </div>
    </ClerkSignIn.Step>
  );
};
