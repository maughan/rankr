// Canonical PostHog event taxonomy for tierstack.dev.
// Every event name is a constant. Every payload is typed.
// No string literals are allowed outside this file.

// ── Event name constants ──────────────────────────────────────────────────────

export const E = {
  // Acquisition / activation
  SIGNUP_STARTED:                   "signup_started",
  SIGNUP_COMPLETED:                 "signup_completed",        // server
  SIGNIN_COMPLETED:                 "signin_completed",        // server
  USERNAME_PICKED:                  "username_picked",         // server (backfill)

  // Core list + ranking actions
  LIST_CREATED:                     "list_created",            // server
  LIST_PUBLISHED:                   "list_published",          // server
  LIST_DELETED:                     "list_deleted",            // server
  RANKING_STARTED:                  "ranking_started",         // client
  RANKING_SUBMITTED:                "ranking_submitted",       // server
  RANKING_COMPLETED_100PCT:         "ranking_completed_100pct", // server

  // Viral loop
  PAYOFF_SCREEN_VIEWED:             "payoff_screen_viewed",    // client
  SHARE_MODAL_OPENED:               "share_modal_opened",      // client
  SHARE_ACTION_TAKEN:               "share_action_taken",      // client
  SHARED_LINK_VISITED:              "shared_link_visited",     // server
  SHARED_LINK_VISITOR_SIGNED_UP:    "shared_link_visitor_signed_up",   // server
  SHARED_LINK_VISITOR_RANKED:       "shared_link_visitor_ranked",      // server

  // Onboarding funnel
  ONBOARDING_STARTED:                 "onboarding_started",            // server
  ONBOARDING_TOPIC_PICKED:            "onboarding_topic_picked",       // client
  ONBOARDING_RANKING_STARTED:         "onboarding_ranking_started",    // client
  ONBOARDING_RANKING_COMPLETED:       "onboarding_ranking_completed",  // server ← activation
  ONBOARDING_REVEAL_VIEWED:           "onboarding_reveal_viewed",      // client
  ONBOARDING_SHARE_CLICKED:           "onboarding_share_clicked",      // client
  ONBOARDING_BROWSE_CLICKED:          "onboarding_browse_clicked",     // client
  ONBOARDING_SKIPPED:                 "onboarding_skipped",            // server

  // Engagement
  COMPARISON_VIEWED:                "comparison_viewed",       // client
  FEED_VIEWED:                      "feed_viewed",             // client
  FOLLOW_ADDED:                     "follow_added",            // server
  FOLLOW_REMOVED:                   "follow_removed",          // server
  SURPRISE_ME_CLICKED:              "surprise_me_clicked",     // client
  BROWSE_CATEGORY_VISITED:          "browse_category_visited", // server
  PROFILE_VIEWED:                   "profile_viewed",          // server

  // Announcements
  ANNOUNCEMENT_SHOWN:               "announcement_shown",      // client
  ANNOUNCEMENT_DISMISSED:           "announcement_dismissed",  // client
  ANNOUNCEMENT_CTA_CLICKED:         "announcement_cta_clicked", // client

  // Impersonation (always admin-attributed, never target-attributed)
  IMPERSONATION_STARTED:            "impersonation_started",   // server
  IMPERSONATION_ENDED:              "impersonation_ended",     // client+server
  IMPERSONATION_EXTENDED:           "impersonation_extended",  // server
  IMPERSONATION_WRITE_BLOCKED:      "impersonation_write_blocked", // client
} as const;

export type EventName = (typeof E)[keyof typeof E];

// ── Per-event property shapes ─────────────────────────────────────────────────
// Only properties that vary per event. Standard context (env, etc.) is added
// by the capture wrappers. IDs only — no PII in event properties.

export interface EventProperties {
  [E.SIGNUP_STARTED]:                   Record<string, never>;
  [E.SIGNUP_COMPLETED]:                 { user_id: number; username: string };
  [E.SIGNIN_COMPLETED]:                 { user_id: number };
  [E.USERNAME_PICKED]:                  { user_id: number };

  [E.LIST_CREATED]:                     { list_id: number; category: string; item_count: number };
  [E.LIST_PUBLISHED]:                   { list_id: number; visibility: string; from_state: string };
  [E.LIST_DELETED]:                     { list_id: number };
  [E.RANKING_STARTED]:                  { list_id: number; list_creator_id: number; is_anonymous: boolean; is_first_ranking_for_user: boolean };
  [E.RANKING_SUBMITTED]:                { list_id: number; items_ranked: number; alignment_pct: number; is_complete: boolean; was_partial: boolean; time_to_complete_seconds: number };
  [E.RANKING_COMPLETED_100PCT]:         { list_id: number };

  [E.PAYOFF_SCREEN_VIEWED]:             { list_id: number; alignment_pct: number };
  [E.SHARE_MODAL_OPENED]:               { list_id: number; from_surface: string; share_template: string };
  [E.SHARE_ACTION_TAKEN]:               { action: "copy_link" | "copy_image" | "download" | "native_share"; template: string; format: string };
  [E.SHARED_LINK_VISITED]:              { ref_list_id: number; ref_user_id: number; is_first_visit: boolean; viewer_logged_in: boolean };
  [E.SHARED_LINK_VISITOR_SIGNED_UP]:    { ref_list_id: number; ref_user_id: number; time_to_first_visit_seconds: number };
  [E.SHARED_LINK_VISITOR_RANKED]:       { ref_list_id: number; ref_user_id: number };

  [E.ONBOARDING_STARTED]:               Record<string, never>;
  [E.ONBOARDING_TOPIC_PICKED]:          { topic: string };
  [E.ONBOARDING_RANKING_STARTED]:       Record<string, never>;
  [E.ONBOARDING_RANKING_COMPLETED]:     { list_id: number };
  [E.ONBOARDING_REVEAL_VIEWED]:         Record<string, never>;
  [E.ONBOARDING_SHARE_CLICKED]:         { list_id: number };
  [E.ONBOARDING_BROWSE_CLICKED]:        Record<string, never>;
  [E.ONBOARDING_SKIPPED]:               { at_step: "topic" | "rank" | "reveal" };

  [E.COMPARISON_VIEWED]:                { list_id: number };
  [E.FEED_VIEWED]:                      Record<string, never>;
  [E.FOLLOW_ADDED]:                     { target_user_id: number };
  [E.FOLLOW_REMOVED]:                   { target_user_id: number };
  [E.SURPRISE_ME_CLICKED]:              Record<string, never>;
  [E.BROWSE_CATEGORY_VISITED]:          { category: string };
  [E.PROFILE_VIEWED]:                   { is_own_profile: boolean };

  [E.ANNOUNCEMENT_SHOWN]:              { announcement_id: number; severity: string };
  [E.ANNOUNCEMENT_DISMISSED]:          { announcement_id: number; severity: string };
  [E.ANNOUNCEMENT_CTA_CLICKED]:        { announcement_id: number };

  [E.IMPERSONATION_STARTED]:           { target_user_id: number; reason: string | null };
  [E.IMPERSONATION_ENDED]:             { target_user_id: number; duration_seconds: number; ended_by: "manual" | "expiry" };
  [E.IMPERSONATION_EXTENDED]:          { target_user_id: number };
  [E.IMPERSONATION_WRITE_BLOCKED]:     { target_user_id: number; attempted_path: string };
}
