# PostHog Analytics — Funnel Definitions

All events are defined in [`lib/analytics/events.ts`](../lib/analytics/events.ts).
Client events use [`lib/analytics/client.ts`](../lib/analytics/client.ts); server events use [`lib/analytics/server.ts`](../lib/analytics/server.ts).

---

## Core Funnels

### 1. Activation Funnel

Measures whether a new visitor becomes an engaged user.

| Step | Event | Where |
|------|-------|-------|
| 1 | `signup_started` | authModal — user opens signup tab |
| 2 | `signup_completed` | server — user record created |
| 3 | `ranking_started` | client — user navigates to `/s/[id]/s` |
| 4 | `ranking_submitted` | server — first PUT to `/api/rankings` |
| 5 | `ranking_completed_100pct` | server — all items placed |

**Key metric:** conversion from `signup_completed` → `ranking_submitted` within 24 hours.

---

### 2. Viral Loop Funnel

Measures the share → visit → convert cycle.

| Step | Event | Where |
|------|-------|-------|
| 1 | `share_modal_opened` | client — user opens ShareCardModal |
| 2 | `share_action_taken` | client — download / copy / native share |
| 3 | `shared_link_visited` | server — someone opens `/r/[token]` |
| 4 | `shared_link_visitor_signed_up` | server — visitor creates an account |
| 5 | `shared_link_visitor_ranked` | server — visitor submits their first ranking |

**Attribution window:** 7 days (cookie `rankr_share_ref` TTL).

**Key metrics:**
- Share → visit rate: unique `shared_link_visited` / unique `share_action_taken`
- Visit → signup rate: `shared_link_visitor_signed_up` / `shared_link_visited` (is_first_visit=true)
- Visit → ranked rate: `shared_link_visitor_ranked` / `shared_link_visited` (is_first_visit=true)

---

### 3. Payoff → Share Funnel

Measures whether the post-ranking experience converts to sharing.

| Step | Event | Where |
|------|-------|-------|
| 1 | `ranking_submitted` | server |
| 2 | `payoff_screen_viewed` | client — alignment animation completes |
| 3 | `share_modal_opened` | client — share button tapped |
| 4 | `share_action_taken` | client — image exported |

**Key metric:** `payoff_screen_viewed` → `share_action_taken` conversion rate.

---

### 4. Social Graph Funnel

Measures follow / engagement growth.

| Step | Event | Notes |
|------|-------|-------|
| `profile_viewed` | User visits `/u/[username]` | client |
| `follow_added` | Follow button clicked | server |
| `feed_viewed` | User lands on `/feed` | client |
| `comparison_viewed` | User taps another ranker's pill | client |

---

## Event Property Index

### Engagement
| Event | Properties |
|-------|-----------|
| `ranking_started` | `list_id`, `list_creator_id`, `is_anonymous`, `is_first_ranking_for_user` |
| `ranking_submitted` | `list_id`, `items_ranked`, `alignment_pct`, `is_complete`, `was_partial` |
| `payoff_screen_viewed` | `list_id`, `alignment_pct` |
| `share_modal_opened` | `list_id`, `from_surface`, `share_template` |
| `share_action_taken` | `action` (copy_link\|copy_image\|download\|native_share), `template`, `format` |
| `comparison_viewed` | `list_id` |
| `feed_viewed` | _(none)_ |
| `profile_viewed` | `is_own_profile` |

### Viral Loop
| Event | Properties |
|-------|-----------|
| `shared_link_visited` | `ref_list_id`, `ref_user_id`, `is_first_visit`, `viewer_logged_in` |
| `shared_link_visitor_signed_up` | `ref_list_id`, `ref_user_id`, `time_to_first_visit_seconds` |
| `shared_link_visitor_ranked` | `ref_list_id`, `ref_user_id` |

### Auth
| Event | Properties |
|-------|-----------|
| `signup_completed` | `user_id`, `username` |
| `signin_completed` | `user_id` |

### List Management
| Event | Properties |
|-------|-----------|
| `list_created` | `list_id`, `category`, `item_count` |
| `list_published` | `list_id`, `visibility`, `from_state` |

---

## Implementation Notes

- **PII policy:** event properties contain IDs only. Names, emails, usernames are set on the PostHog *person* via `identify` / `$set`, never in event properties.
- **Server shutdown:** every `captureServer` call awaits `ph._shutdown()` to ensure events flush before the Vercel function exits.
- **Dev isolation:** `captureServer` and the client provider are no-ops unless `NODE_ENV === "production"` and the key is not the placeholder `phc_REPLACE_ME`.
- **Attribution cookie:** `rankr_share_ref` (httpOnly, 7-day TTL). Set on first visit to a shareable link; cleared after `shared_link_visitor_signed_up` or `shared_link_visitor_ranked` fires.
