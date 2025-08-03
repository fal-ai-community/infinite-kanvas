import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "bg-card shadow-lg",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          formFieldLabel: "text-foreground",
          formFieldInput: "bg-background border-input text-foreground",
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90",
          footerActionLink: "text-primary hover:text-primary/80",
          identityPreviewText: "text-foreground",
          identityPreviewEditButtonIcon: "text-muted-foreground",
          dividerLine: "bg-border",
          dividerText: "text-muted-foreground",
        },
      }}
    />
  );
}
