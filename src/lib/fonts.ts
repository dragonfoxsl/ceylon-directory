import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";

// Display & body — self-hosted Satoshi (variable, 300–900) from Fontshare.
export const satoshi = localFont({
  src: [
    {
      path: "../app/fonts/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "../app/fonts/Satoshi-VariableItalic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "fallback",
  fallback: ["system-ui", "sans-serif"],
});

// Numeric & mono — prices (LKR), dates, IDs, dashboard/admin figures.
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
