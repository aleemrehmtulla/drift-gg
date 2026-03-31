import { useEffect, useRef } from "react";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/cn";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export default function App({ Component, pageProps, router }: AppProps) {
  const isFirstRender = useRef(true);
  const skipAnimation = isFirstRender.current && router.pathname === "/";

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <div className={cn(inter.variable, "font-sans")}>
      {process.env.NEXT_PUBLIC_AHREFS_KEY && (
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key={process.env.NEXT_PUBLIC_AHREFS_KEY}
          strategy="afterInteractive"
        />
      )}
      <Layout>
        <AnimatePresence mode="wait">
          <motion.div
            key={router.pathname}
            className="flex-1 flex flex-col"
            initial={skipAnimation ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </Layout>
    </div>
  );
}
