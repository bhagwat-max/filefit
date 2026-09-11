import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://filefit-mu.vercel.app"),
  title: "FileFit — Resize photos, signatures and PDFs",
  description: "Resize photos and signatures, change image dimensions, and optimise PDFs privately in your browser. Free, fast and easy to use.",
  applicationName: "FileFit",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FileFit — The right file, ready in seconds",
    description: "Make your photo, signature or PDF the size you need. Free and private.",
    type: "website",
    url: "/",
    siteName: "FileFit",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#165940" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
