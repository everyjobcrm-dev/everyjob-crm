import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-display-raw",
  subsets: ["latin", "hebrew"],
  // 900 added: the hero headline needs real weight to carry the scale bump.
  weight: ["400", "500", "700", "900"],
});

const heebo = Heebo({
  variable: "--font-body-raw",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "everyJob | אנשים טובים, משמרות טובות",
  description: "everyJob מחברת בין אנשים טובים לעבודה טובה ולצוותים מנצחים.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${frankRuhlLibre.variable} ${heebo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}