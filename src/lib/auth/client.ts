"use client";

export {
  useAuth,
  useUser,
  useClerk,
  useSignIn,
  useSignUp,
  useSession,
  useOrganization,
  useOrganizationList,
} from "@clerk/nextjs";

// Re-export commonly used components
export {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  RedirectToSignUp,
  UserButton,
  OrganizationSwitcher,
} from "@clerk/nextjs";
