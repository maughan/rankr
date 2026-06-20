// Server-only. Never import from client components.
import { prisma } from "@/lib/prisma";

/** Returns whether a feature flag is enabled. Defaults to true if the flag doesn't exist. */
export async function isFlagEnabled(key: string): Promise<boolean> {
  try {
    const flag = await (prisma as any).featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });
    return flag?.enabled ?? true;
  } catch {
    return true;
  }
}

/** Returns all feature flags as a key→enabled map. */
export async function getAllFlags(): Promise<Record<string, boolean>> {
  try {
    const flags = await (prisma as any).featureFlag.findMany({
      select: { key: true, enabled: true },
    });
    return Object.fromEntries(flags.map((f: { key: string; enabled: boolean }) => [f.key, f.enabled]));
  } catch {
    return {};
  }
}
