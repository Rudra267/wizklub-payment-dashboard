import type { Metadata } from "next";
import DisableInspect from "@/components/DisableInspect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wizklub Payment Dashboard",
  description: "Payment lookup and transaction verification dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <DisableInspect />
        {children}
      </body>
    </html>
  );
}
