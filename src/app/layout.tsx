import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linger — Some moments deserve to linger",
  description: "A private, collaborative scrapbook for memories that matter."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
