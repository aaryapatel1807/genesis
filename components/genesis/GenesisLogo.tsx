import Link from 'next/link';

/** Genesis wordmark: teal ring + amber dot, per the Figma. */
export function GenesisLogo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="qa-logo" aria-label="Genesis home">
      <span className="qa-logo-mark" aria-hidden="true" />
      GENESIS
    </Link>
  );
}
