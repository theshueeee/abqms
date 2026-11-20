import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "DentaQueue | Dental care, organised",
    template: "%s | DentaQueue",
  },
  description:
    "Appointments and live queue updates for the General Dental Clinic, Universiti Malaya.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
