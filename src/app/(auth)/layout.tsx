import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
      <div className="hidden flex-col justify-between bg-nilo p-10 text-white lg:flex">
        <Link href="/" className="w-fit transition-opacity hover:opacity-80">
          <BrandMark inverted />
        </Link>
        <div>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-12">
            <path d="M5 1.5 L17.5 7 L5 12.5 Z" fill="var(--simrik)" />
            <path d="M5 10.5 L20.5 16.5 L5 22.5 Z" fill="#faf9f7" />
          </svg>
          <p className="mt-6 max-w-sm font-heading text-3xl font-semibold leading-snug">
            Every report on the record. Every fix verified by the community.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            From a pothole in your ward to a national pattern — CivicChain keeps
            civic issues public, trackable, and harder to ignore.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">
          जनताको आवाज, सबैको नजरमा
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 lg:hidden">
          <BrandMark />
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
