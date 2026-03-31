import Head from "next/head";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Not found — Drift.gg</title>
        <meta name="description" content="The page you're looking for doesn't exist. Play Drift.gg — a rhythm game that tests how well you can keep a beat." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-[var(--text-muted)] mb-6">
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="text-[var(--accent)] hover:underline text-base"
        >
          Play solo instead?
        </Link>
      </div>
    </>
  );
}
