import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sepatifay",
  description: "A minimal, modern black-and-white music streaming app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-black text-white min-h-[100dvh] selection:bg-white/20`}
      >
        {/* Ambient Dark Mesh Background */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-black">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#fa243c]/10 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/10 blur-[120px] mix-blend-screen" />
        </div>

        <Providers>
           <Toaster
              position="bottom-center"
              toastOptions={{
                  style: { background: 'rgba(30, 30, 30, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '16px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }
              }}
           />
           {children}
        </Providers>
      </body>
    </html>
  );
}
