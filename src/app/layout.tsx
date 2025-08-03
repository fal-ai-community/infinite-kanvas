import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CoreProviders } from "./core-providers";
import { focal, hal, halMono, commitMono, inconsolata } from "@/lib/fonts";
import { BotIdClient } from "botid/client";
import { Analytics } from "@vercel/analytics/next";
import { ClerkProvider } from "@clerk/nextjs";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { ThemeProvider } from "@/providers/theme-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Flux Kontext Dev - AI Style Transfer | Powered by fal.ai",
    template: "%s | Flux Kontext Dev",
  },
  description:
    "Transform your photos with AI-powered style transfer in seconds. Choose from LoRA models and prompt-based styles including anime, oil painting, cyberpunk, and more. Powered by fal.ai's fast AI infrastructure.",
  keywords: [
    "AI style transfer",
    "image transformation",
    "flux model",
    "LoRA",
    "AI art",
    "fal.ai",
    "photo styling",
    "artificial intelligence",
    "machine learning",
    "image generation",
  ],
  authors: [{ name: "fal.ai" }],
  creator: "fal.ai",
  publisher: "fal.ai",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Flux Kontext Dev - AI Style Transfer | Powered by fal.ai",
    description:
      "Transform your photos with AI-powered style transfer in seconds. Choose from LoRA models and prompt-based styles.",
    siteName: "Flux Kontext Dev",
    images: [
      {
        url: "/og-img-compress.png",
        width: 1200,
        height: 630,
        alt: "Flux Kontext Dev - AI Style Transfer Demo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flux Kontext Dev - AI Style Transfer | Powered by fal.ai",
    description:
      "Transform your photos with AI-powered style transfer in seconds. Choose from LoRA models and prompt-based styles.",
    creator: "@fal_ai",
    site: "@fal_ai",
    images: [
      {
        url: "/og-img-compress.png",
        width: 1200,
        height: 630,
        alt: "Flux Kontext Dev - AI Style Transfer Demo",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={[
        hal.variable,
        halMono.variable,
        focal.variable,
        inconsolata.variable,
        commitMono.variable,
      ].join(" ")}
      suppressHydrationWarning
    >
      <head>
        <BotIdClient
          protect={[
            {
              path: "/api/trpc/*",
              method: "POST",
            },
            {
              path: "/api/fal",
              method: "POST",
            },
          ]}
        />
      </head>
      <body className={`font-sans bg-background text-foreground min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider>
            <CoreProviders>
              {children}
              <ServiceWorkerRegistration />
            </CoreProviders>
          </ClerkProvider>
        </ThemeProvider>
      </body>
      <Analytics />
    </html>
  );
}
