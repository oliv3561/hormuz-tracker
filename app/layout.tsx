import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hormuz Tracker — Strait of Hormuz Intelligence Dashboard",
  description:
    "Real-time vessel tracking, transit data, and market intelligence for the Strait of Hormuz crisis.",
  openGraph: {
    title: "Hormuz Tracker",
    description: "Strait of Hormuz real-time intelligence dashboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
