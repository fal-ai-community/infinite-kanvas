import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "fal infinite kanvas",
  description: "Collaborative infinite kanvas workspace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
