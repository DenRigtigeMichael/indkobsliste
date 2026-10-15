import type { Metadata, Viewport } from "next";
import { Figtree, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Indkøbsliste",
  description:
    "Fælles indkøbsliste til jer to — afkrydsninger synkroniseres, og varer fremhæves når det er tid at købe igen.",
  applicationName: "Indkøbsliste",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Indkøbsliste",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1f4d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="da"
      className={`${syne.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="atmosphere relative min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
