"use client";

import React from "react";
import * as Clerk from "@clerk/elements/common";
import * as ClerkSignIn from "@clerk/elements/sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SignInResetPasswordStep = () => {
  return (
    <ClerkSignIn.Step name="reset-password">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Clerk.Field name="password" asChild>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                autoComplete="new-password"
                className="h-10"
              />
            </Clerk.Field>
            <Clerk.FieldError className="text-sm text-destructive" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Clerk.Field name="confirmPassword" asChild>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="h-10"
              />
            </Clerk.Field>
            <Clerk.FieldError className="text-sm text-destructive" />
          </div>

          <ClerkSignIn.Action submit asChild>
            <Button className="w-full" size="lg">
              Reset password
            </Button>
          </ClerkSignIn.Action>
        </div>
      </div>
    </ClerkSignIn.Step>
  );
};
