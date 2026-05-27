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
    imageSizeError: "File's too big - 5 MB max.",
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
    spicyDetail: (
      item: string,
      userTier: string,
      crowdTier: string,
      n: number
    ) =>
      `${item}: you said ${userTier}, the crowd says ${crowdTier}. (${n} rankers)`,
  },

  // ── Submission loader ─────────────────────────────────────────────────────
  submissionLoader: {
    narratorMessages: [
      "Tallying your hot takes…",
      "Asking 142 strangers if you're right…",
      "Calculating how wrong you are…",
      "Finding your taste twin…",
      "Measuring your spice level…",
      "Consulting the consensus…",
    ],
    shuffleCaption: "Sorting the verdict…",
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
    anonDisabledDetail: "The creator has turned off anonymous submissions.",
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

  // ── Divisive item ─────────────────────────────────────────────────────────
  divisive: {
    eyebrow: "most divisive",
    caption: (n: number) =>
      `${n} ranker${n !== 1 ? "s" : ""}. Zero consensus.`,
    shareLabel: "Share most divisive",
  },

  // ── Payoff screen ─────────────────────────────────────────────────────────
  nemesis: {
    eyebrow: "taste nemesis",
    detail: (handle: string, n: number, total: number) =>
      `@${handle} disagrees with you on ${n} of ${total} items.`,
    shareLabel: "Share your nemesis",
  },

  closestMatch: {
    shareLabel: "Share your closest match",
  },

  payoff: {
    eyebrow: "ranking submitted",

    // Page title — four states: first/re × complete/partial
    titleFirstComplete: "Done.",
    titleFirstPartial: "Saved.",
    titleResubmitComplete: "Updated.",
    titleResubmitPartial: "Hot reload.",

    // Subtitle
    subtitleComplete: (n: number, total: number) =>
      `${n} of ${total} ranked. Strong opinions, hold for applause.`,
    subtitlePartial: (n: number, total: number) =>
      `${n} of ${total} ranked. Come back to finish.`,

    // Alignment stat
    alignedWith: (n: number) =>
      `aligned with ${n} other ranker${n !== 1 ? "s" : ""}`,
    alignedFew: (n: number) =>
      `aligned with ${n} other${n !== 1 ? "s" : ""} — results may shift`,
    alignedFirst: "First in. No comparisons yet — you're the standard.",

    // Hottest take card
    hottestTakeEyebrow: "your hottest take",
    hottestTakeSupportLine: (
      tier: string,
      pct: number,
      dir: "above" | "below"
    ) =>
      dir === "above"
        ? `${pct}% of rankers put it in ${tier}-tier or lower`
        : `${pct}% of rankers put it in ${tier}-tier or higher`,

    // Closest match card
    closestMatchEyebrow: "closest taste match",
    closestMatchDetail: (handle: string, n: number, total: number) =>
      `@${handle} agrees with you on ${n} of ${total}`,
    closestMatchFew: "most aligned so far",

    // Extras row labels
    contrarianLabel: "contrarian picks",
    perfectMatchLabel: "perfect matches",
    sTierLabel: "in your S-tier",

    // CTAs
    ctaShare: "Share my hot takes",
    ctaShareFirst: "Share your ranking",
    ctaCompare: "See the full comparison",
    ctaFinish: "Finish ranking",
    ctaSignup: "Save your ranking to come back later",

    // Footer
    browseLists: "Browse more lists",

    // Surprise me
    surpriseMe: "Surprise me",

    // Rank similar
    rankSimilarEyebrow: "Rank next",
    rankSimilarHeading: "Lists your crowd also ranked",
    rankSimilarCoRankers: (n: number) => `${n} ranker${n !== 1 ? "s" : ""} in common`,

    // No data
    noRankingFound: "No ranking found for this list.",
  },

  // ── Publish flow ─────────────────────────────────────────────────────────
  publish: {
    loaderMessages: [
      "Publishing your list…",
      "Opening the gates…",
      "Making it live…",
      "Letting the world in…",
    ],
    celebrationTitle: "Your list is live.",
    celebrationSubhead: (title: string) =>
      `"${title}" is now public. Time to let people argue about it.`,
    celebrationCta: "Start ranking",
    celebrationShare: "Share it",
    celebrationDismiss: "View list",
  },

  // ── Hidden list banners ───────────────────────────────────────────────────
  hidden: {
    creatorBanner: "Archived. Rankings are frozen.",
    creatorCta: "Make it live again",
    rankerBanner: "This list is archived. Your ranking is still here.",
  },

  // ── Invites ───────────────────────────────────────────────────────────────
  invites: {
    createFailed: "Couldn't create invite link.",
    revokeFailed: "Couldn't remove invite.",
    sectionLabel: "Invite links",
    sectionHint: "Anyone with an invite link can view and rank this private list.",
    createCta: "Create invite link",
    removeLabel: "Remove",
    emptyHint: "No active invite links.",
    newLinkLabel: "New link",
  },

  // ── Visibility transitions ────────────────────────────────────────────────
  visibility: {
    hiddenNoRankings:
      "No rankings yet — draft keeps it private without locking anything in.",
    hiddenNoRankingsCta: "Switch to Draft",
    publicToPrivateAnon: (n: number) =>
      `${n} anonymous submission${n !== 1 ? "s" : ""} exist. Switching to private stops new ones — existing rankings are kept.`,
    publicToPrivateAnonCta: "Got it",
    draftBlockedByRankings:
      "Can't revert to draft — rankings have already been submitted.",
  },

  // ── Profile settings ──────────────────────────────────────────────────────
  profile: {
    saved: "Profile saved.",
    saveFailed: "Couldn't save profile.",
    accountSaved: "Account saved.",
    accountSaveFailed: "Couldn't save account details.",
    usernameReserved: "That username is reserved.",
    usernameFormat: "3–20 characters: letters, numbers, underscores only.",
  },

  // ── Feed ─────────────────────────────────────────────────────────────────
  feed: {
    // Engagement items — N people stacked your list
    engagementLabel: (n: number, listTitle: string) =>
      `${n} ${n === 1 ? "person" : "people"} stacked "${listTitle}"`,
    engagementWindow: "since your last visit",
    engagementCta: "View results",

    // New followers
    newFollowersSingle: (handle: string) => `@${handle} followed you`,
    newFollowersMany: (n: number) => `${n} new followers`,
    newFollowersWindow: "since your last visit",
    newFollowersCta: "View followers",

    // Creator milestones
    milestoneLabel: (n: number, listTitle: string) =>
      `"${listTitle}" just hit ${n} ranking${n !== 1 ? "s" : ""}`,
    milestoneCta: "See the results",

    // Self re-engagement
    reEngagementLabel: (n: number, listTitle: string) =>
      `${n} new ranker${n !== 1 ? "s" : ""} on "${listTitle}" since you stacked it`,
    reEngagementCta: "See how you compare",

    // All-lists fallback
    fallbackHeading: "You're all caught up.",
    fallbackSubhead: "Here's what the community is ranking",
    fallbackRankCta: "Rank it",
  },

  // ── Support ───────────────────────────────────────────────────────────────
  support: {
    cardHeading: "Enjoying tierstack?",
    cardBody: "It's free and always will be. A coffee helps keep it that way.",
    cardCta: "Buy us a coffee",
    footerLinkLabel: "Support tierstack",
  },

  // ── Landing (source of truth — re-exported via app/landing/content.ts) ────
  landing: {
    eyebrow: "Tier lists. But actually fun.",
    headline: "The tier list maker\nfor people with opinions",
    tagline: "Your taste, peer-reviewed.",
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
    footerMaker: "Tier list maker",
    footerBrowse: "Browse tier lists",
    // SEO metadata — keyword-first, brand last
    seoTitle: "Tier List Maker - Create, Rank & Share Tier Lists · tierstack",
    seoDescription:
      "Make a tier list, rank anything S to F, and see how the crowd ranks it. A free tier list maker built for sharing.",
  },

  landingFeatures: [
    {
      icon: "◈",
      title: "Rank anything",
      body: "Movies, food, people, places. If it has an opinion, it belongs in a stack.",
    },
    {
      icon: "⇄",
      title: "Compare rankings",
      body: "Share your stack and get a head-to-head alignment score. 100% find your taste twin.",
    },
    {
      icon: "🔥",
      title: "Find the hot takes",
      body: "See what the crowd ranked highest, and exactly where you went your own way.",
    },
  ] as const,

  // ── SEO content block (landing page, below the fold) ─────────────────────
  seoContent: {
    whatHeading: "What is a tier list?",
    what: 'A tier list ranks things by letter grade, S at the top, F at the bottom. The format came out of gaming communities as a way to sort characters by power level, but it works for anything you have opinions about: movies, albums, fast food, programming languages, reality TV contestants. If it\'s rankable, it belongs in a tier list. (You\'ll see it spelled "tierlist" as one word and "tier list" as two, same thing, different keyboards.)',
    howHeading: "How to make a tier list on tierstack",
    steps: [
      {
        step: "Create a list",
        detail:
          "Name it, pick a category, and add the items you want to rank. Give each one a name, a colour, or upload an image.",
      },
      {
        step: "Drag items into tiers",
        detail:
          "Move items from the unranked pool into S through F. Nothing is locked in until you submit.",
      },
      {
        step: "Share the link",
        detail:
          "Generate a shareable link. Anyone can rank the same list, anonymously or with an account.",
      },
      {
        step: "See the verdict",
        detail:
          "The payoff screen shows your alignment score against the crowd, your most contrarian pick, and the person who ranked most like you.",
      },
    ],
  },

  // ── /tier-list-maker dedicated page ──────────────────────────────────────
  tierListMakerPage: {
    seoTitle: "Free Tier List Maker - Create & Share Tier Lists · tierstack",
    seoDescription:
      "tierstack is a free tier list maker. Build a tier list for anything, share it with a link, and see how the crowd ranked it.",
    h1: "Free tier list maker",
    intro:
      "Build a tier list for anything, movies, food, music, games. Share it with one link and see exactly how the crowd ranked it, who agreed with you, and where your takes were genuinely spicy.",
    featuresHeading: "Everything a tier list needs",
    howHeading: "How it works",
    steps: [
      {
        step: "Create",
        detail: "Start a new list. Add items, names, colours, or images.",
      },
      {
        step: "Rank",
        detail:
          "Drag items into S through F tiers until your ranking looks right.",
      },
      {
        step: "Share",
        detail: "One link. Anyone can rank — no account needed.",
      },
      {
        step: "Compare",
        detail:
          "See the crowd ranking, your alignment score, and your hottest takes.",
      },
    ],
    differentiatorHeading: "Not just a tier list builder",
    differentiator:
      "Most tier list tools are solo, you rank, you screenshot, you post. tierstack is built around comparison. Submit your ranking and immediately see where you land against everyone who ranked before you: an alignment score, your most contrarian pick, and the person whose taste most closely matches yours.",
    ctaLabel: "Make a tier list",
  },

  // ── /browse page ──────────────────────────────────────────────────────────
  browsePage: {
    seoTitle: "Browse Tier Lists by Category · tierstack",
    seoDescription:
      "Browse public tier lists on tierstack. Find popular rankings on movies, music, food, games, and more.",
    h1: "Browse tier lists",
    subtitle: "Explore public rankings by category.",
    empty: "No categories have enough public lists yet — check back soon.",
    categoryEmpty: "No public lists in this category yet — check back soon.",
  },

  // ── Taste archetype ───────────────────────────────────────────────────────
  //
  // One entry per archetype. All UI copy derives from here — the badge,
  // the detail sheet, and the share card all read from this map.
  // Add / tune copy here; never hardcode archetype strings in components.
  //
  // statLine() receives the most relevant signal value, formatted for humans
  // (e.g. a whole-number percentage). Keep it to one tight clause — it runs
  // below the archetype name in the badge.
  //
  archetypes: {
    contrarian: {
      name: "The Contrarian",
      desc: "The crowd zigs, you zag. Your rankings consistently land furthest from consensus — by design or by instinct, you call it differently.",
      tagline: "The crowd is usually wrong.",
      color: "#EF4444",   // red
      icon: "ti-bolt",
      statLine: (pct: number) => `disagrees with the crowd ${pct}% of the time`,
      shareLabel: "Share my archetype",
    },
    oracle: {
      name: "The Oracle",
      desc: "Eerily in tune with the crowd. Your rankings mirror consensus so closely it's almost eerie — you just know what's good.",
      tagline: "You just know.",
      color: "#4A8AE8",   // blue (accent)
      icon: "ti-brain",
      statLine: (pct: number) => `aligned with the crowd ${pct}% of the time`,
      shareLabel: "Share my archetype",
    },
    purist: {
      name: "The Purist",
      desc: "No half measures. Things are either S-tier or they belong at the bottom — middle ground is for people who haven't made up their mind.",
      tagline: "Strong opinions. Strongly held.",
      color: "#C44545",   // S-tier red
      icon: "ti-star",
      statLine: (pct: number) => `puts ${pct}% of items in the top or bottom tier`,
      shareLabel: "Share my archetype",
    },
    diplomat: {
      name: "The Diplomat",
      desc: "You see nuance where others see extremes. Most things land somewhere in the middle — because most things genuinely deserve it.",
      tagline: "It's complicated.",
      color: "#5DCAA5",   // teal (C-tier)
      icon: "ti-heart",
      statLine: (pct: number) => `keeps ${pct}% of rankings in the middle tiers`,
      shareLabel: "Share my archetype",
    },
    enthusiast: {
      name: "The Enthusiast",
      desc: "Everything deserves a fair shot — and most things earn it. Your rankings skew high because you genuinely find the good in things.",
      tagline: "Love the game. Love the players.",
      color: "#E08C2C",   // amber (A-tier)
      icon: "ti-rocket",
      statLine: (pct: number) => `ranks ${pct}% of items above the crowd average`,
      shareLabel: "Share my archetype",
    },
    critic: {
      name: "The Critic",
      desc: "High standards. Very high standards. S-tier is reserved for the genuinely exceptional — and you're not easily impressed.",
      tagline: "Someone has to keep the bar up.",
      color: "#85B7EB",   // D-tier blue
      icon: "ti-movie",
      statLine: (pct: number) => `ranks ${pct}% of items below the crowd average`,
      shareLabel: "Share my archetype",
    },
    wildcard: {
      name: "The Wildcard",
      desc: "No discernible pattern. No predictable bias. Just pure, unfiltered gut feel — a different list, a different person.",
      tagline: "Completely unpredictable.",
      color: "#AFA9EC",   // F-tier purple
      icon: "ti-mood-happy",
      statLine: (_pct?: number) => `impossible to predict`,
      shareLabel: "Share my archetype",
    },
  } as const,

  // ── Archetype forming state (own profile, not yet enough data) ────────────
  archetypeForming: {
    heading: "Your type is still forming.",
    subhead: "Rank across a few more lists to unlock your taste archetype.",
    cta: "Browse lists",
  },
};
