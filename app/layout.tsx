// Next.js requires a default export for layout files.
// Named export + re-export as default satisfies both that requirement
// and the CLAUDE.md named-exports convention.
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLCG Internal",
  description: "Blue Line Consulting Group internal admin",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

export default RootLayout;
