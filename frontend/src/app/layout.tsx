import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionProvider } from "@/components/session";
import { Header, Footer } from "@/components/ui";
import "./globals.css";
export const metadata: Metadata = {
  title: "Airbnb · Find your next stay",
  description:
    "Browse beautiful homes and book a stay. Full-stack assignment demo.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Suspense>
            <Header />
            {children}
            <Footer />
          </Suspense>
        </SessionProvider>
      </body>
    </html>
  );
}
