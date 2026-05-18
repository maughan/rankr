/**
 * VOICE RULES — read before adding strings
 *
 * 1. Specific over generic.  Name what failed ("Couldn't save the stack"),
 *    not what category of bad thing happened ("Error").
 * 2. Conversational over formal.  Write like a smart friend, not a support ticket.
 *    "Give it a name." not "Name field is required."
 * 3. Self-aware over earnest.  The app knows it's an app.  Lean into it.
 *    "You're in. Let's stack something." not "Registration successful."
 * 4. Never coercive.  No shame, no urgency-bait, no manufactured FOMO.
 * 5. Brevity.  If 5 words work, don't use 10.
 *    Exceptions: empty state subheads, which earn a little room.
 *
 * Descriptive strings (labels, headers, real data) live in the components —
 * only personality-bearing copy belongs here.
 */

export const S = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    loginSuccess: "Welcome back.",
    loginFailed: "Wrong email or password.",
    loginError: "Something went wrong. Try again.",
    signupSuccess: "You're in. Let's stack something.",
    signupTaken: "That handle or email is taken.",
    signupError: "Couldn't create account. Try again.",
    resetSuccess: "Password updated. You're back in.",
    resetError: "Reset failed. Try again.",
  },

  // ── List management ───────────────────────────────────────────────────────
  lists: {
    created: "Stack created.",
    createFailed: "Couldn't create the stack.",
    updated: "Saved.",
    updateFailed: "Couldn't save changes.",
    imageUploaded: "Cover image added.",
    imageUploadFailed: "Upload failed. Try again.",
    addItemsHint: "One per line or comma-separated.",
    shareDescription:
      "Give anyone a link to the community ranking. Enable anonymous submissions if you want people to weigh in.",
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  items: {
    updated: "Saved.",
    nameEmpty: "Give it a name.",
    nameTooLong: "Name's too long — 60 chars max.",
    invalidNames: "Names must be 60 characters or fewer.",
    addedCount: (n: number) => `${n} item${n !== 1 ? "s" : ""} dropped in.`,
    addFailed: "Couldn't add those items.",
    removedUndo: (name: string) => `Removed "${name}"`,
    removeFailed: (name: string) => `Couldn't remove "${name}".`,
    imageAdded: "Image added.",
    imageUploadFailed: "Upload failed. Try again.",
    imageRemoved: "Image removed.",
    imageRemoveFailed: "Couldn't remove the image.",
    imageTypeError: "JPEG, PNG, or WebP only.",
    imageSizeError: "File's too big — 5 MB max.",
  },

  // ── Rankings ──────────────────────────────────────────────────────────────
  rankings: {
    saved: "Stack saved.",
    saveFailed: "Couldn't save your stack. Try again.",
    submitted: "Stack submitted.",
    submitFailed: "Submission failed. Try again.",
    submitEmpty: "Place at least one item to submit.",
    submitRateLimit: "Too many submissions. Take a breath.",
    submitAnonDisabled: "Anonymous rankings are off for this list.",
    submitError: "Something went wrong. Try again.",
    spicyHeading: "That's a take.",
    spicyDetail: (item: string, userTier: string, crowdTier: string, n: number) =>
      `${item}: you said ${userTier}, the crowd says ${crowdTier}. (${n} rankers)`,
  },

  // ── Share ─────────────────────────────────────────────────────────────────
  share: {
    linkCreateFailed: "Couldn't create the link.",
    linkDisableFailed: "Couldn't disable sharing.",
    linkRotated: "Link rotated.",
    linkRotateFailed: "Couldn't rotate the link.",
    settingsUpdateFailed: "Couldn't save settings.",
  },

  // ── Errors ────────────────────────────────────────────────────────────────
  errors: {
    default: "Something went wrong",
    loadLists: "Couldn't load stacks",
    loadList: "Couldn't load this stack",
    linkNotFound: "Link not found",
    linkNotFoundDetail: "This link may have been disabled or rotated.",
    anonDisabledTitle: "Rankings closed.",
    anonDisabledDetail:
      "The creator has turned off anonymous submissions.",
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  empty: {
    library: {
      heading: "It's quiet here. Maybe too quiet.",
      subheadLoggedIn: "Make a stack. Pick a fight.",
      subheadLoggedOut: "Log in and start arguing about things.",
      ctaLoggedIn: "Create your first stack",
      ctaLoggedOut: "Log in to get started",
    },
    listNoItems: {
      heading: "An empty tier list is a wasted opportunity.",
      subhead: "Add some items to get the debate started.",
      cta: "Add items",
    },
    listNoRankings: {
      heading: "No one's stacked this yet.",
      subhead: "Drop a ranking to be the first.",
      cta: "Stack it",
    },
    anonNoRankings: {
      heading: "Nobody's ranked this yet.",
      subhead: "The thrones are vacant.",
      cta: "Stack this list",
    },
  },

  // ── Landing (source of truth — re-exported via app/landing/content.ts) ────
  landing: {
    eyebrow: "Tier lists. But actually fun.",
    headline: "Your taste,\npeer-reviewed.",
    subhead:
      "Make stacks. See who agrees, who's dead wrong, and what the crowd actually thinks. Compare your ranking against anyone.",
    ctaPrimary: "Start ranking",
    ctaSecondary: "Log in",
    heroAlignmentPct: 78,
    heroCreatorHandle: "@tierstack",
    featuredHeading: "Trending stacks",
    finalHeadline: "Ready to argue about something?",
    finalCta: "Start your first stack",
    finalUnderline: "No credit card. No spam. Just tier lists.",
    footerTagline: "Tier lists. But actually fun.",
  },

  landingFeatures: [
    {
      icon: "◈",
      title: "Rank anything",
      body: "Movies, food, people, places — if it has an opinion, it belongs in a stack.",
    },
    {
      icon: "⇄",
      title: "Compare rankings",
      body: "Share your stack and get a head-to-head alignment score. 100% means you're twins.",
    },
    {
      icon: "🔥",
      title: "Find the hot takes",
      body: "See what the crowd ranked highest — and exactly where you went your own way.",
    },
  ] as const,
};
