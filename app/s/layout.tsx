import type { Metadata } from "next";

// The /s dashboard is auth-gated — never index it.
// Child routes (/s/[id]) override this per-page based on list visibility.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ListsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
