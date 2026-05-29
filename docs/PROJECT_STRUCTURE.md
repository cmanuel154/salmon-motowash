# Salmon Moto Wash — Project Structure

## Project Overview

**Salmon Moto Wash** (SMW) is a motorcycle wash membership and operations management app for a physical wash location in **Sukatani, Depok**. Tagline: **"Less for More"**.

The app handles member registration, cashier (POS) transactions, loyalty vouchers, worker assignment, daily cash summaries, finance tracking, and an owner/admin settings panel — all from a single browser-based interface.

Stack: **React + Vite**, JSX only (no TypeScript), all state persisted via **localStorage**. Currently the live version uses **Firebase Firestore** as the data layer (via `src/firebase.js` and `src/db.js`), but the local-first data model mirrors the localStorage schema documented below.

---

## Folder Tree

```
Salmon Motowash/
├── src/
│   ├── main.jsx                          # React root — mounts <App /> into #root
│   ├── App.jsx                           # App shell: auth gate, page router, data wiring
│   ├── firebase.js                       # Firebase app init + Firestore export
│   ├── db.js                             # Firestore CRUD helpers (getAll, setItem, etc.)
│   │
│   ├── pages/
│   │   ├── Login.jsx                     # Username/password login form
│   │   ├── Dashboard.jsx                 # KPI overview, charts, worker leaderboard
│   │   ├── Kasir.jsx                     # POS — 4-step cashier flow (plate → member → payment → receipt)
│   │   ├── Member.jsx                    # Member list, search, detail, edit, delete
│   │   ├── Riwayat.jsx                   # Transaction history with date/payment filters
│   │   ├── Finance.jsx                   # Income & expense tracker, monthly report print
│   │   └── Pengaturan.jsx                # Settings: users, motor types, workers, cash log
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Toast.jsx                 # Slide-in notification (success / error / warning)
│   │   │   ├── LoyaltyBar.jsx            # 5-slot progress dots — 1 dot per wash toward voucher
│   │   │   ├── RatingModal.jsx           # Post-service 1–5 star rating modal (triggered on "Selesai")
│   │   │   ├── WorkerAvatar.jsx          # Base64 photo or initials fallback avatar
│   │   │   └── InstallBanner.jsx         # PWA "Add to Home Screen" banner with dismiss
│   │   │
│   │   └── layout/
│   │       ├── Navbar.jsx                # Top bar — logo, tab links, user info, logout
│   │       └── PageContainer.jsx         # Consistent page wrapper (padding, bg, max-width)
│   │
│   ├── hooks/
│   │   ├── useToasts.js                  # Toast queue state — addToast(message, type)
│   │   ├── useIsMobile.js                # Responsive breakpoint watcher (≤768px = mobile)
│   │   └── useInstallPrompt.js           # Captures beforeinstallprompt — exposes canInstall + install()
│   │
│   ├── utils/
│   │   ├── format.js                     # formatRp, fmtDate, todayStr, timeStr
│   │   ├── idGenerator.js                # nextMemberId, nextTrxId, nextCashId, nextMotorId, nextWorkerId
│   │   ├── loyalty.js                    # Voucher earn/redeem logic, washCount → progress
│   │   └── receiptPrinter.js             # generateReceiptHtml + printReceipt (opens print window)
│   │
│   ├── constants/
│   │   ├── theme.js                      # C color map, shared inline style objects (inputBase, btnRed, btnGhost)
│   │   └── defaults.js                   # INITIAL_MOTOR_TYPES, INITIAL_USERS, ADDITIONALS_LIST, ALL_TABS, PERM_META
│   │
│   └── assets/
│       ├── logo.png                      # Full-color logo — used in Navbar and Login page
│       └── logo - black.png             # Black/grayscale logo — used in printed receipts and laporan bulanan
│
├── index.html                            # Vite HTML entry point, sets app title and #root mount
├── vite.config.js                        # Vite config: React plugin, PWA plugin (vite-plugin-pwa)
└── package.json                          # Dependencies and dev scripts
```

---

## File Descriptions

### `src/main.jsx`

| Attribute | Detail |
|---|---|
| Feature | All |
| What it does | React entry point — calls `ReactDOM.createRoot('#root').render(<App />)` |

---

### `src/App.jsx`

| Attribute | Detail |
|---|---|
| Feature | All |
| What it does | Top-level shell. Seeds initial data on first load, manages `currentUser` auth state, owns all collection state (members, transactions, cashLog, motorTypes, workers), and routes to the active page via a `page` key. All data mutations are passed down as props. |
| Notes | Currently a single-file monolith containing all pages, components, hooks, and utilities inline. The tree above reflects the intended refactored structure. |

---

### `src/firebase.js`

| Attribute | Detail |
|---|---|
| Feature | All |
| What it does | Calls `initializeApp(firebaseConfig)` and exports `db = getFirestore(app)` |
| Notes | Config values come from the Firebase console. Do not expose publicly. |

---

### `src/db.js`

| Attribute | Detail |
|---|---|
| Feature | All |
| What it does | Thin Firestore abstraction: `getAll(col)`, `setItem(col, id, data)`, `updateItem(col, id, data)`, `deleteItem(col, id)`, `queryWhere(col, field, value)`, `listenTo(col, callback)` |
| Notes | `listenTo` uses `onSnapshot` for real-time UI updates. All other operations are one-shot promises. |

---

### `src/pages/`

#### `Login.jsx`
| Feature | Auth |
|---|---|
| What it does | Renders a centered login card with username + password fields. On submit, looks up the credential in `smw_users` (localStorage) or the `users` Firestore collection. Redirects to Dashboard on success. Displays an inline error on failure. |
| Notes | No session token — auth state lives in React state only (lost on page reload → re-login required). |

#### `Dashboard.jsx`
| Feature | Dashboard |
|---|---|
| What it does | Displays KPI tiles (total members, total washes today, revenue today, revenue this month), a daily revenue bar chart (by day in current month), a payment method donut chart, a top-5 loyal members leaderboard, a worker performance table (washes assigned, avg duration, avg rating), and a recent transactions list. |
| Notes | Revenue excludes voucher redemptions (`isVoucherRedemption: true`). Charts use Recharts. |

#### `Kasir.jsx`
| Feature | Kasir |
|---|---|
| What it does | 4-step POS flow: **(1) Input Plat** — plate search with autocomplete suggestions; **(2) Register** — shown only if plate is not found, creates a new member; **(3) Payment** — worker selector, motor type grid, add-on checkbox (Wax), payment method buttons, price breakdown; **(4) Receipt** — transaction summary + loyalty bar. Auto-prints an HTML receipt in a new tab on confirm. |
| Notes | Queue number (`Q-01` format) resets daily. Worker distribution panel at the top shows per-worker motor count and avg rating for the current day. A "Riwayat Hari Ini" table below the form shows all today's transactions with a "✓ Selesai" action that triggers the rating modal. |

#### `Member.jsx`
| Feature | Member |
|---|---|
| What it does | Searchable, paginated member list. Each card shows plate, name, phone, loyalty bar, voucher count, total wash count, and total spent. Supports inline edit (name, phone, voucher balance) and soft-delete. |
| Notes | `washCount` and `totalSpent` are updated by Kasir, not editable here directly. |

#### `Riwayat.jsx`
| Feature | Riwayat |
|---|---|
| What it does | Full transaction history table with filters for date range, payment method, and text search (plate/member name). Rows show time, plate, motor type, worker, status (menunggu/selesai), payment badge, and total. Users with `riwayat_edit` permission can void/edit entries. |
| Notes | Edit access is a separate permission (`riwayat_edit`) distinct from read-only `riwayat`. |

#### `Finance.jsx`
| Feature | Finance |
|---|---|
| What it does | Income and expense tracker. Auto-imported cash entries come from Kasir transactions (editable: false). Manual entries can be added via a form (type, amount, description, category, date). Displays a monthly summary with a bar chart, category breakdown, and net balance. "Cetak Laporan" prints a monthly report using `logo - black.png`. |
| Notes | Kasir-sourced entries have `editable: false` and are locked in the UI — they cannot be modified or deleted. Manual entries have `editable: true`. |

#### `Pengaturan.jsx`
| Feature | Settings |
|---|---|
| What it does | Superuser settings page (requires `pengaturan` permission) with four sub-panels: **(1) Manajemen Pengguna** — add/edit/delete users, assign permission badges; **(2) Jenis Motor** — add/toggle-active motor types with custom prices; **(3) Pekerja** — add workers with a base64 photo upload, toggle active status; **(4) Cash Log** — view all cash entries with source tags. |
| Notes | Owner (`id: u1`) cannot be deleted. At least one active motor type must remain. |

---

### `src/components/ui/`

#### `Toast.jsx`
| Feature | All |
|---|---|
| What it does | Fixed-position toast stack (top-right). Each toast has a `type` (`success` → green, `error` → red, `warning` → amber) and auto-dismisses after 3 seconds via `useToasts`. |

#### `LoyaltyBar.jsx`
| Feature | Kasir, Member |
|---|---|
| What it does | Renders five circles, filled blue for each wash within the current 5-wash cycle (`washCount % 5`). Accepts a `big` prop for a larger "scan" size with text label. |
| Notes | Every 5th wash earns 1 free-wash voucher. |

#### `RatingModal.jsx`
| Feature | Kasir |
|---|---|
| What it does | Slide-up (mobile) or center (desktop) modal for rating a completed wash. 1–5 stars with Indonesian labels (Kurang → Luar Biasa!). Rating is optional — "Lewati" skips and marks the transaction `selesai` with `rating: null`. |

#### `WorkerAvatar.jsx`
| Feature | Kasir, Dashboard, Pengaturan |
|---|---|
| What it does | Renders a circular avatar. Uses the worker's `photo` (base64) if available, otherwise falls back to the first letter of their name on a colored background. |

#### `InstallBanner.jsx`
| Feature | All |
|---|---|
| What it does | Shown when the browser fires `beforeinstallprompt` (Android/desktop Chrome). Includes an "Install App" button and a dismiss (×) button. Dismissed state is stored in `localStorage` under `smw_pwa_dismissed`. |

---

### `src/components/layout/`

#### `Navbar.jsx`
| Feature | All |
|---|---|
| What it does | Sticky top navigation bar. Desktop: logo + horizontal tab links + user info + logout button. Mobile: logo + hamburger → full-width dropdown drawer with tab list. Tabs are filtered by `currentUser.permissions`. |

#### `PageContainer.jsx`
| Feature | All |
|---|---|
| What it does | Wrapper div applying consistent page padding (`40px 24px` desktop, `16px` mobile), `min-height: 100vh`, and `background: #0a0a0a`. |

---

### `src/hooks/`

#### `useToasts.js`
| Feature | All |
|---|---|
| What it does | Returns `{ toasts, addToast }`. `addToast(message, type)` appends a toast and schedules its removal after 3000 ms. |

#### `useIsMobile.js`
| Feature | All |
|---|---|
| What it does | Returns a boolean that is `true` when `window.innerWidth ≤ 768`. Attaches a resize listener and cleans up on unmount. |

#### `useInstallPrompt.js`
| Feature | All (PWA) |
|---|---|
| What it does | Listens for `beforeinstallprompt`, prevents its default, and stores the event. Returns `{ canInstall, install }` — `install()` triggers the browser's native install dialog. |

---

### `src/utils/`

#### `format.js`
| Feature | All |
|---|---|
| What it does | `formatRp(n)` → `"Rp 25.000"` (dot separator, Indonesian locale). `fmtDate(dateStr)` → `"28 Mei 2026"`. `todayStr()` → `"2026-05-28"`. `timeStr()` → `"14:35"`. |

#### `idGenerator.js`
| Feature | All |
|---|---|
| What it does | Functions that scan an existing array and return the next sequential ID: `nextMemberId(members)` → `"M004"`, `nextTrxId(transactions)` → `"TRX007"`, `nextCashId`, `nextMotorId`, `nextWorkerId`, `nextLogId`. |
| Notes | Pads to 3 digits. Does NOT use UUID — IDs are human-readable and sequential. |

#### `loyalty.js`
| Feature | Kasir, Member |
|---|---|
| What it does | `earnedVoucher(newWashCount)` → `true` if `newWashCount % 5 === 0`. `calcNewVouchers(current, earned, isVoucherPayment)` → net voucher balance after a transaction. `getProgress(washCount)` → `washCount % 5` (slots filled). |

#### `receiptPrinter.js`
| Feature | Kasir |
|---|---|
| What it does | `generateReceiptHtml(trx, member, logoAbsUrl)` returns a self-printing HTML string in thermal receipt format (80 mm width, monospace font, dashed dividers, loyalty bar in block characters). `printReceipt(trx, member)` opens a new window and writes the HTML to it — `window.onload` fires `window.print()` automatically. |
| Notes | Uses `logo - black.png` (absolute URL via `new URL(logoBlack, window.location.href).href`) for print compatibility. |

---

### `src/constants/`

#### `theme.js`
| Feature | All |
|---|---|
| What it does | Exports `C` (color map), `inputBase` (shared input style object), `btnRed` (primary CTA), `btnGhost` (secondary/cancel button), and `lbl(text)` (label JSX helper). |

#### `defaults.js`
| Feature | All |
|---|---|
| What it does | Exports seed data and app-wide lookup tables: `INITIAL_MOTOR_TYPES`, `INITIAL_USERS` (owner + kasir1), `ADDITIONALS_LIST` (Wax +Rp5.000), `PAYMENT_LABELS`, `ALL_TABS` (nav tab definitions with Lucide icons), `PERM_META` (permission badge colors). |
| Notes | On first load, App.jsx checks each localStorage key and writes the matching `INITIAL_*` value if the key is absent. |

---

### `src/assets/`

| File | Where used |
|---|---|
| `logo.png` | Navbar (height 36px desktop, 28px mobile), Login page (width 180px) |
| `logo - black.png` | Receipt HTML (`printReceipt`), monthly Finance report print |

---

### Root Config Files

| File | Purpose |
|---|---|
| `index.html` | Vite HTML shell — sets `<title>Salmon Moto Wash</title>`, imports Google Fonts (Barlow Condensed 700, Barlow 400/500/600), mounts `<div id="root">` |
| `vite.config.js` | Vite config with `@vitejs/plugin-react` and `vite-plugin-pwa` (PWA manifest, service worker) |
| `package.json` | Dependencies: react 18, react-dom, recharts, lucide-react, firebase; devDeps: vite, @vitejs/plugin-react, vite-plugin-pwa, sharp |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 (JSX only — no TypeScript) |
| **Build tool** | Vite 5 |
| **Persistence** | localStorage (keys below) — primary local-first model |
| **Cloud sync** | Firebase Firestore (via `firebase.js` + `db.js`) — active in production |
| **Charts** | Recharts (`BarChart`, `PieChart`, `ResponsiveContainer`) |
| **Icons** | Lucide React |
| **Fonts** | Google Fonts — Barlow Condensed 700 (headings), Barlow 400/500/600 (body) |
| **PWA** | vite-plugin-pwa + `beforeinstallprompt` — installable on Android / desktop |
| **Hosting** | (Vite static build, deployable to any CDN or Firebase Hosting) |

---

## Data Models

### localStorage Keys

All keys are prefixed `smw_`. On first load, each key is seeded from `defaults.js` if it does not exist.

---

#### `smw_members` — `Member[]`

```json
{
  "id":         "M001",
  "plate":      "B1234ABC",
  "name":       "Andi Pratama",
  "phone":      "081234567890",
  "joinDate":   "2025-01-15",
  "washCount":  8,
  "vouchers":   1,
  "totalSpent": 161000
}
```

| Field | Notes |
|---|---|
| `id` | Sequential, M + 3-digit zero-padded |
| `plate` | Normalized: uppercase, no spaces (`normalizePlate`) |
| `washCount` | Cumulative total across all visits |
| `vouchers` | Current redeemable free-wash vouchers |
| `totalSpent` | Sum of `totalAmount` from non-voucher transactions |

---

#### `smw_transactions` — `Transaction[]`

```json
{
  "id":                 "TRX001",
  "memberId":           "M001",
  "plate":              "B1234ABC",
  "memberName":         "Andi Pratama",
  "date":               "2025-05-28",
  "time":               "14:35",
  "payment":            "cash",
  "motorType":          { "id": "MT001", "name": "Matic", "price": 23000 },
  "additionals":        ["wax"],
  "subtotal":           28000,
  "totalAmount":        28000,
  "isVoucherRedemption": false,
  "earnedVoucher":      false,
  "kasir":              "Kasir 1",
  "workerId":           "WRK001",
  "workerName":         "Budi",
  "queueNumber":        1,
  "status":             "menunggu",
  "createdAt":          "2025-05-28T14:35:00.000Z",
  "completedAt":        null,
  "rating":             null,
  "notes":              "ban kempis"
}
```

| Field | Notes |
|---|---|
| `payment` | `"cash"` \| `"qris"` \| `"transfer"` \| `"voucher"` |
| `motorType` | Snapshot of motor type at time of transaction (price may change later) |
| `additionals` | Array of add-on keys — currently only `"wax"` |
| `subtotal` | Service price + add-on prices (before voucher) |
| `totalAmount` | `0` for voucher redemptions, else equals `subtotal` |
| `queueNumber` | Integer; formatted as `Q-01` in UI and receipt. **Resets to 1 daily.** |
| `status` | `"menunggu"` (in-queue) → `"selesai"` (completed via "✓ Selesai" button) |
| `completedAt` | ISO timestamp set when status changes to `selesai` |
| `rating` | `1`–`5` or `null` (skipped) |
| `notes` | Optional motor condition note entered by kasir |

---

#### `smw_users` — `User[]`

```json
{
  "id":          "u1",
  "username":    "owner",
  "password":    "owner123",
  "name":        "Owner",
  "permissions": ["dashboard","kasir","member","riwayat","riwayat_edit","finance","pengaturan"]
}
```

| Field | Notes |
|---|---|
| `permissions` | Array of tab/feature keys the user can access |
| `id: "u1"` | Owner — cannot be deleted |

---

#### `smw_motor_types` — `MotorType[]`

```json
{
  "id":     "MT001",
  "name":   "Matic",
  "price":  23000,
  "active": true
}
```

| Field | Notes |
|---|---|
| `active` | `false` hides from Kasir selection but preserves historical transaction data |

---

#### `smw_cashlog` — `CashEntry[]`

```json
{
  "id":          "CSH001",
  "type":        "income",
  "amount":      23000,
  "description": "Cuci motor — B1234ABC",
  "category":    "Pendapatan Cuci",
  "date":        "2025-05-28",
  "time":        "14:35",
  "source":      "kasir",
  "refTrxId":    "TRX001",
  "createdBy":   "Kasir 1",
  "editable":    false
}
```

| Field | Notes |
|---|---|
| `type` | `"income"` \| `"expense"` |
| `source` | `"kasir"` (auto-created from transaction) or `"manual"` (Finance page entry) |
| `editable` | **`false` for kasir-sourced entries** — locked in Finance UI. `true` for manual entries. |
| `refTrxId` | Links back to the originating transaction (kasir entries only) |

---

#### `smw_workers` — `Worker[]`

```json
{
  "id":     "WRK001",
  "name":   "Budi",
  "photo":  "data:image/jpeg;base64,...",
  "active": true
}
```

| Field | Notes |
|---|---|
| `photo` | Base64-encoded image string (uploaded via file input in Pengaturan). Falls back to initials avatar if `null`. |
| `active` | `false` hides from Kasir worker selector |

---

## Business Rules

### Service & Pricing

- **Service type:** Touchless only (all washes are touchless — `serviceType: "touchless"`)
- **Default motor types** (admin-editable in Pengaturan):
  - Matic — Rp 23.000
  - Sport — Rp 25.000
  - Bebek — Rp 23.000
  - Besar (>250cc) — Rp 30.000
- **Add-on:** +Wax — Rp 5.000 (only available add-on; more can be added to `ADDITIONALS_LIST`)

### Loyalty Program

- Every **5 washes** earns **1 free-wash voucher** (`washCount % 5 === 0` after increment)
- Vouchers can be redeemed by selecting "Voucher Gratis" as payment method
- Voucher redemption: `totalAmount = 0`, `washCount` still increments, can earn another voucher
- Voucher balance displayed on member card, Kasir payment step, and printed receipt

### Queue Numbers

- Format: `Q-01`, `Q-02`, … (zero-padded to 2 digits)
- Derived from count of today's transactions + 1 at time of transaction creation
- **Resets to Q-01 each new calendar day** (no persistent counter — recalculated from `smw_transactions` filtered by `date === todayStr()`)

### Currency

- All amounts in **IDR (Indonesian Rupiah)**
- Format: `Rp X.XXX` using dot separator (`toLocaleString('id-ID')`)
- Abbreviated on charts: `23k` (thousands), `1.5jt` (millions)

### Cash Entries

- Kasir transactions **automatically create** a `CashEntry` with `source: "kasir"` and `editable: false`
- These entries are visible in Finance but **cannot be edited or deleted**
- Manual Finance entries (`source: "manual"`) are fully editable
- Voucher transactions generate a cash entry with `amount: 0`

### Seeding on First Load

- App checks each localStorage key on mount
- If `smw_users` is empty → write `INITIAL_USERS` (owner + kasir1)
- If `smw_motor_types` is empty → write `INITIAL_MOTOR_TYPES` (4 defaults)
- Demo member/transaction data (`INITIAL_MEMBERS`, `INITIAL_TRANSACTIONS`) may be seeded in development but should be cleared before production use

### Language

- All UI text is in **Bahasa Indonesia** (labels, toasts, receipts, reports)

---

## Brand & Design System

### Colors

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0a0a0a` | Page background |
| `surface` | `#141414` | Navbar, cards, modals |
| `card` | `#1a1a1a` | Inner cards, input backgrounds |
| `border` | `#2a2a2a` | All borders |
| `red` | `#E8372A` | Primary CTA, brand accent, queue number |
| `blue` | `#3B9FD4` | QRIS badge, loyalty fill, selected states |
| `white` | `#FFFFFF` | Primary text |
| `muted` | `#6b7280` | Secondary text, labels, inactive states |
| `green` | `#22c55e` | Cash badge, success toasts, "Selesai" status |
| `amber` | `#f59e0b` | Warning toasts, Wax add-on, worker leader highlight, ratings |

### Typography

| Font | Weight | Usage |
|---|---|---|
| Barlow Condensed | 700 | Page headings, section titles, large numbers, CTA button labels |
| Barlow | 400 | Body text, descriptions |
| Barlow | 500 | Secondary body |
| Barlow | 600 | Labels, nav items, table headers, input labels |

### Design Tokens

- **Dark industrial aesthetic** — near-black surfaces, high contrast red/blue accents
- **Border radius:** 4px (badges, small chips) to 16px (main cards and modals)
- **Button height:** 44px minimum touch target on mobile
- **No shadows except** modal overlays (`0 4px 16px rgba(0,0,0,0.5)`)

### Logo Usage

| Asset | Context |
|---|---|
| `logo.png` (color) | Navbar (36px tall desktop, 28px mobile), Login page (180px wide) |
| `logo - black.png` (monochrome) | Thermal receipt HTML, laporan bulanan print — avoids color ink |

---

## Permissions & Auth

### Auth Mechanism

- No backend — credentials are matched against `smw_users` in localStorage at login time
- Auth state lives in React state (`currentUser`). Reloading the page requires re-login.
- Passwords are stored in plaintext in localStorage (no hashing — internal staff tool)

### Permission Keys

| Key | Grants access to |
|---|---|
| `dashboard` | Dashboard tab |
| `kasir` | Kasir tab |
| `member` | Member tab |
| `riwayat` | Riwayat tab (read-only history) |
| `riwayat_edit` | Riwayat tab edit/void actions (additive with `riwayat`) |
| `finance` | Finance tab |
| `pengaturan` | Pengaturan tab — **superuser**, grants all admin controls |

### Rules

- `currentUser.permissions` is a string array; Navbar renders only matching tabs
- **Owner** (`id: "u1"`) has all permissions and **cannot be deleted** from Pengaturan
- `"pengaturan"` permission is the effective superuser gate — it controls user/worker/motor-type management
- Default kasir account (`kasir1`) has only `["kasir"]` — no read access to members, finance, or history

---

## Feature Backlog

### High Priority

| # | Feature | Notes |
|---|---|---|
| #8 | Live antrian on Dashboard | Show queue with status (menunggu/selesai) as a live board |
| #25 | Delete confirmation — type "HAPUS" | Prevent accidental member or user deletion |
| #19 | Backup & restore JSON | Export all localStorage data as JSON; import to restore |
| #20 | Jam operasional on receipt | Print opening/closing hours on thermal receipt |
| #13 | Churn alert >30 days | Flag members who haven't visited in 30+ days on Member page |

### Medium Priority

| # | Feature | Notes |
|---|---|---|
| #9 | Revenue target | Set a monthly target and show progress on Dashboard |
| #17 | Profit margin in Finance | Show margin % after expenses are subtracted from income |
| #18 | Export CSV | Download transaction history or member list as CSV |
| #5 | Estimated wait time on receipt | Show estimated completion time based on queue length |
| #26 | Browser notification for pending >30 min | Alert if a transaction has been in "menunggu" too long |

### Future / Nice-to-Have

| # | Feature | Notes |
|---|---|---|
| #27 | Full PWA support | Offline queue, background sync when connectivity returns |
| #10 | Busiest hour analytics | Heatmap of transactions by hour-of-day on Dashboard |
| #21 | Promo / discount | Percentage or fixed-amount discount at kasir step |
| #14 | Referral program | Member earns a bonus wash when they refer a new member |
| #22 | Multi-branch | Branch selector, per-branch data isolation |

### Excluded (Decided Against)

| # | Feature | Reason |
|---|---|---|
| #11 | Member tier system (Bronze/Silver/Gold) | Added complexity with minimal operational benefit at current scale |
| #12 | Birthday reward | Requires reliable phone/date data; not collected consistently |
