# ChargeHub — India's EV Charging Station Finder

Discover, navigate, and charge your EV at stations across India. Real-time availability, pricing, connector compatibility, and more.

Built with [TanStack Start](https://tanstack.com/start), [React](https://react.dev), [Supabase](https://supabase.com), [Leaflet](https://leafletjs.com), and [Tailwind CSS v4](https://tailwindcss.com).

## Features

- **Interactive Map** — Leaflet map with marker clusters, live status colours, and fly-to animation
- **Smart Filters** — Filter by connector type (CCS2, CHAdeMO, Type 2, GB/T, Tesla), power level, operator, and vehicle compatibility
- **Search & Near Me** — Geocode any city/area via Nominatim; browser geolocation for "Near Me"
- **Station Details** — Connector-level availability, pricing, amenities, and one-tap Google Maps navigation
- **Favourites** — Save/unsave stations (requires sign-in; RLS-scoped)
- **Issue Reporting** — Report broken chargers or inaccurate info
- **Google Maps API Integration** — Custom dark/light map themes, SVG status pins, info windows, and an in-app toggle between Google Maps and OpenStreetMap
- **Razorpay Demo Payments** — Integrated with Razorpay Standard Checkout in Test Mode. Supports energy selection (kWh), live ₹/kWh breakdown, GST calculation, real-time Razorpay popup checkout, simulated payment approval, and live interactive battery charging session HUD
- **Auth** — Email/password and Google OAuth via Supabase Auth
- **Profile** — Edit name, select your EV model, view saved stations
- **Dark Mode** — Themed light/dark with system-preference detection
- **Responsive** — Mobile-first layout with hamburger nav, sheet filters, and map/list view toggle

## Development

```sh
git clone <this-repository-url>
cd pixel-perfect-pixels
npm install
npm run dev
```

### Environment Variables

Configure the following variables in your `.env` file (or directly in the application UI settings):

```sh
# Supabase
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key"
VITE_SUPABASE_URL="https://your_project.supabase.co"

# Google Maps API (Optional: defaults to OpenStreetMap if not provided)
VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."

# Razorpay Test Key (Demo mode)
VITE_RAZORPAY_KEY_ID="rzp_test_..."
```

## Data Model

The Supabase database has seven tables. RLS is enabled on all user-scoped tables so each user can only access their own data.

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  operators   │       │     stations     │       │  connectors  │
├──────────────┤  1──M ├──────────────────┤  1──M ├──────────────┤
│ id      (PK) │◄──────│ operator_id (FK) │       │ station_id   │
│ name         │       │ id          (PK) │◄──────│ id      (PK) │
│ logo_url     │       │ name             │       │ type         │
└──────────────┘       │ address          │       │ power_kw     │
                       │ city             │       │ price_per_kwh│
                       │ lat / lng        │       │ status (enum)│
                       │ opening_hours    │       └──────────────┘
                       │ amenities[]      │
                       │ created_at       │
                       └──────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │ 1──M          │ 1──M          │
    ┌─────────┴──────┐  ┌────┴──────────┐    │
    │  favourites    │  │ issue_reports │    │
    ├────────────────┤  ├───────────────┤    │
    │ id        (PK) │  │ id       (PK) │    │
    │ user_id        │  │ station_id(FK)│    │
    │ station_id(FK) │  │ user_id       │    │
    │ created_at     │  │ description   │    │
    └────────────────┘  │ created_at    │    │
                        └───────────────┘    │
                                             │
    ┌──────────────┐       ┌────────────┐    │
    │   vehicles   │       │  profiles  │    │
    ├──────────────┤  FK   ├────────────┤    │
    │ id      (PK) │◄──────│ vehicle_id │    │
    │ make         │       │ id    (PK) │    │
    │ model        │       │ full_name  │    │
    │ connector_   │       │ created_at │    │
    │   types[]    │       └────────────┘    │
    │ max_charge_kw│                         │
    └──────────────┘                         │
```

### Tables

| Table           | Description                                                             | RLS         |
| --------------- | ----------------------------------------------------------------------- | ----------- |
| `operators`     | Charging network operators (Tata Power, Ather, etc.)                    | Public read |
| `stations`      | Charging station locations with address, coordinates, amenities         | Public read |
| `connectors`    | Individual charge points at a station — type, power, price, live status | Public read |
| `vehicles`      | EV models sold in India with their supported connector types            | Public read |
| `profiles`      | User profile with name and selected vehicle                             | User-scoped |
| `favourites`    | User's bookmarked stations                                              | User-scoped |
| `issue_reports` | Community-reported problems at stations                                 | User-scoped |

### Enums

- `connector_status`: `available` | `in_use` | `offline`

### Seed Data

- **5 operators** — e.g. Tata Power, Ather Grid, ChargeZone
- **40 stations** — across Mumbai, Delhi, Bengaluru, Pune
- **15 EV models** — Tata Nexon EV, MG ZS EV, Hyundai Ioniq 5, etc.

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── Navbar.tsx        # App navigation
│   ├── StationCard.tsx   # Reusable station card
│   ├── StationMap.tsx    # Leaflet map wrapper
│   ├── FilterPanel.tsx   # Filter sidebar / sheet
│   └── ThemeToggle.tsx   # Dark mode toggle
├── hooks/
│   ├── useAuth.tsx       # Supabase auth state
│   └── useChargeData.ts  # React Query hooks for all data
├── lib/
│   ├── types.ts          # Shared TypeScript types
│   ├── station-utils.ts  # Filtering, distance, status helpers
│   └── utils.ts          # cn() utility
├── routes/
│   ├── __root.tsx        # App shell (head, providers, toaster)
│   ├── index.tsx         # Landing page
│   ├── map.tsx           # Map + filters + station list
│   ├── station/$id.tsx   # Station detail
│   ├── login.tsx         # Email + Google sign-in
│   ├── signup.tsx        # Account creation
│   └── profile.tsx       # Profile + favourites
├── services/
│   └── stationService.ts # Supabase data access layer
└── integrations/
    └── supabase/         # Auto-generated Supabase client + types
```

## Tech Stack

| Layer     | Technology                                |
| --------- | ----------------------------------------- |
| Framework | TanStack Start (Vite + SSR)               |
| UI        | React 19 + shadcn/ui (New York)           |
| Styling   | Tailwind CSS v4 with custom design tokens |
| Maps      | Leaflet + leaflet.markercluster           |
| Backend   | Supabase (Postgres, Auth, RLS)            |
| State     | TanStack Query (React Query)              |
| Routing   | TanStack Router (file-based)              |
| Fonts     | Space Grotesk (headings) + DM Sans (body) |
