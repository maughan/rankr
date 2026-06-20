# Tierstack

A tier-list ranking app where users create, share, and collectively rank anything. Build a tier list, share it with a link, and see how your rankings compare to the community consensus.

Live at [tierstack.dev](https://tierstack.dev)

---

## Features

- **Create tier lists** — build lists with custom items, tiers (S–F), colors, labels, and cover images
- **Drag-and-drop ranking** — intuitive dnd-kit interface for placing items into tiers
- **Shareable links** — generate a unique link so anyone (logged in or anonymous) can rank your list
- **Community consensus** — rankings are aggregated by weighted tier value to show where the crowd lands
- **Comparison view** — see your ranking vs. the creator's vs. the community side-by-side
- **Social graph** — follow/block users, browse public profiles, pin lists to your profile
- **Share cards** — generate branded images for social sharing ("head-to-head" and "hot takes" templates)
- **Dynamic OG images** — list and profile pages generate social preview images automatically
- **Anonymous rankings** — no account required to rank; sessions tracked by hashed IP + session token
- **Image uploads** — item images hosted and optimized via ImageKit

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI State | Redux Toolkit 2 |
| Server State | TanStack React Query 5 |
| Drag & Drop | dnd-kit v6 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Prisma managed) |
| Auth | JWT + Argon2 password hashing |
| Image hosting | ImageKit |
| Analytics | Vercel Analytics + Speed Insights |
| Deployment | Vercel |

---

## Project Structure

```
rankr/
├── app/
│   ├── api/              # API route handlers
│   ├── components/       # Shared React components
│   ├── landing/          # Landing page sections
│   ├── s/[id]/           # List detail, edit, and ranking pages
│   ├── r/[token]/        # Shared link view and anonymous ranking
│   ├── u/[username]/     # User profile pages
│   └── settings/         # Account settings
├── lib/
│   ├── api/              # React Query hooks (client-side fetching)
│   ├── server/           # Server-side utilities (auth, etag, profile data)
│   ├── store/            # Redux slices
│   └── helpers.ts        # Shared utilities
└── prisma/
    └── schema.prisma     # Database schema
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or a [Prisma Accelerate](https://www.prisma.io/data-platform/accelerate) connection string)
- ImageKit account (for image uploads)

### Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL=           # PostgreSQL connection string (supports Prisma Accelerate)
JWT_SECRET=             # Secret for signing JWT tokens
IMAGEKIT_PRIVATE_KEY=   # ImageKit private key
IMAGEKIT_PUBLIC_KEY=    # ImageKit public key
IMAGEKIT_URL_ENDPOINT=  # ImageKit URL endpoint
NEXT_PUBLIC_URL=        # Public app URL (e.g. https://tierstack.dev)
```

### Install & Run

```bash
npm install

# Apply database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build

```bash
npm run build
npm start
```

---

## Key Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/s` | Browse all public lists |
| `/s/[id]` | View a tier list |
| `/s/[id]/s` | Rank a list (authenticated) |
| `/r/[token]` | View a shared list |
| `/r/[token]/s` | Rank via shared link (anonymous or authenticated) |
| `/u/[username]` | User profile |
| `/settings/profile` | Edit your profile |

---

## Database

Schema is managed with Prisma. After changing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_change
```

Core models: `User`, `List`, `Item`, `Tier`, `Ranking`, `Follow`, `Block`, `UserListPin`, `UserUsernameHistory`.

---

## Testing

```bash
npm test
```

Uses Vitest with jsdom for unit tests.
