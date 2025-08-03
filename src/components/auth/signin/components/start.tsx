"use client";

import React from "react";
import * as Clerk from "@clerk/elements/common";
import * as ClerkSignIn from "@clerk/elements/sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SignInStartStepProps {
  renderLogo?: () => React.ReactNode;
}

export const SignInStartStep = ({ renderLogo }: SignInStartStepProps) => {
  return (
    <ClerkSignIn.Step name="start">
      <div className="space-y-6">
        {renderLogo && renderLogo()}

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <div className="space-y-4">
          {/* OAuth providers */}
          <div className="grid gap-2">
            <Clerk.Connection name="google" asChild>
              <Button
                variant="default"
                className="w-full hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 active:bg-blue-100 dark:active:bg-blue-950/30 border-border transition-all duration-200"
                size="lg"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Continue with Google
              </Button>
            </Clerk.Connection>

            <Clerk.Connection name="github" asChild>
              <Button
                variant="default"
                className="w-full hover:bg-accent hover:text-accent-foreground active:bg-accent/80 border-border transition-all duration-200"
                size="lg"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                Continue with GitHub
              </Button>
            </Clerk.Connection>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email/username field */}
          <div className="space-y-2">
            <Label htmlFor="identifier">Email</Label>
            <Clerk.Field name="identifier" asChild>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter your email"
                autoComplete="email"
                className="h-10"
              />
            </Clerk.Field>
            <Clerk.FieldError className="text-sm text-destructive" />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <ClerkSignIn.Action
                navigate="forgot-password"
                className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors"
              >
                Forgot password?
              </ClerkSignIn.Action>
            </div>
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

          {/* Global error */}
          <Clerk.GlobalError className="text-sm text-destructive" />

          {/* Submit button */}
          <ClerkSignIn.Action submit asChild>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-all duration-200 font-medium"
              size="lg"
            >
              Sign in
            </Button>
          </ClerkSignIn.Action>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </ClerkSignIn.Step>
  );
};
