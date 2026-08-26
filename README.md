# med+capsule

A visual medication reminder and tracker. You describe what a medicine *looks
like* — its shape and its colour — and the app draws it back to you on a timeline,
so confirming "yes, that's the right tablet" never requires reading a label.

Built with Expo (React Native + TypeScript), local SQLite, and OS-level repeating
notifications.

---

## Directory structure

```
med+capsule/
├── App.tsx                      Providers: safe area → theme → data store
├── index.js                     Expo root registration
├── app.json                     Expo config, notification plugin, permissions
├── babel.config.js              @ds / @app path aliases
├── tsconfig.json                strict, noUncheckedIndexedAccess
│
├── design-system/               ← THE ONLY SOURCE OF VISUAL TRUTH
│   ├── index.ts                 the single public entry point ('@ds')
│   ├── tokens/
│   │   ├── colors.ts            palette, light/dark themes, medicine swatches
│   │   ├── typography.ts        6-step scale + OS font-scale support
│   │   ├── spacing.ts           4pt grid, layout constants, touch targets
│   │   ├── radii.ts             corner radii + border widths
│   │   ├── elevation.ts         3 shadow levels + motion timings
│   │   ├── breakpoints.ts       the 3 widths the app reasons about
│   │   └── index.ts
│   ├── theme/
│   │   ├── ThemeProvider.tsx    useTheme() — the only way to get a colour
│   │   ├── useReducedMotion.ts  OS "Reduce Motion" setting
│   │   ├── useBreakpoint.ts     current size + its gutter, columns, rail width
│   │   ├── useEscapeKey.ts      Escape closes an overlay (web only)
│   │   └── index.ts
│   ├── primitives/
│   │   └── Stack.tsx            Stack / Row / Spacer / Divider
│   └── components/
│       ├── Text.tsx             semantic variant + tone; no raw fontSize
│       ├── Icon.tsx             38 hand-drawn SVG glyphs, no icon font
│       ├── PillShape.tsx        ← the signature component: 10 medicine forms
│       ├── Button.tsx           Button + IconButton
│       ├── Card.tsx             the app's only container surface
│       ├── CardGrid.tsx         1 / 2 / 3 columns by breakpoint
│       ├── Input.tsx            always-labelled text/numeric entry
│       ├── Chip.tsx             toggleable tag
│       ├── SegmentedControl.tsx single-choice switch
│       ├── SelectableTile.tsx   SelectableTile + SwatchDot (visual pickers)
│       ├── Badge.tsx            status marker (icon + word, never a bare dot)
│       ├── ProgressRing.tsx     ProgressRing + ProgressBar
│       ├── Stepper.tsx          keyboard-free numeric adjustment
│       ├── SwipeableRow.tsx     swipe-to-commit, pure RN Animated
│       ├── Sheet.tsx            bottom sheet
│       ├── EmptyState.tsx       EmptyState + InlineNotice
│       ├── CalendarMonth.tsx    stateless month grid (range picker + heat map)
│       ├── ListRow.tsx          settings-style row
│       └── Screen.tsx           Screen + ScreenHeader + Section
│
└── src/                         ← FUNCTIONAL CODE. Imports visuals only from '@ds'
    ├── domain/                  pure logic, no React, no I/O
    │   ├── types.ts             the data model
    │   ├── schedule.ts          ← the scheduling engine
    │   ├── inventory.ts         stock tracking + refill warnings
    │   ├── instructions.ts      instruction-tag catalogue
    │   ├── archive.ts           auto-archive + reactivation rules
    │   └── __tests__/           36 tests over the logic above
    ├── data/
    │   ├── db.ts                SQLite open + versioned migrations
    │   ├── webMemoryStore.ts    localStorage tables for the browser target
    │   └── repositories/        medication / doseLog / notificationRegistry
    │                            (each with a *.web.ts sibling — see below)
    ├── notifications/
    │   └── notifications.ts     repeating daily triggers, snooze, lock-screen actions
    ├── state/
    │   └── MedicationStore.tsx  the single store; pairs writes with side effects
    ├── navigation/
    │   ├── RootNavigator.tsx    3 destinations + modal stack
    │   ├── AppNavBar.tsx        bottom bar / icon rail / labelled rail
    │   └── linking.ts           URL <-> state mapping + browser tab title
    ├── features/
    │   ├── dashboard/           timeline home (DoseCard, TimelineRail, ActionSheet)
    │   ├── add-medication/      4-step onboarding + draft state & validation
    │   ├── medications/         active prescription library
    │   ├── archive/             finished courses + reactivation
    │   └── history/             per-medication record + adherence heat grid
    └── utils/                   date.ts (timezone-safe), id.ts
```

---

## The design-system contract

Feature code may import **only** from `'@ds'`. It never:

- writes a hex value, `rgba()`, `fontSize`, or `fontWeight`
- imports a design-system internal path (`@ds/tokens/colors`)
- uses `StyleSheet` to define appearance

This is enforceable with four greps, all of which currently return nothing:

```bash
grep -rnE '#[0-9A-Fa-f]{3,8}' src App.tsx      # raw colours
grep -rnE 'fontSize:|fontWeight:' src App.tsx  # raw type
grep -rn  "from '@ds/" src App.tsx             # deep imports
grep -rn  'StyleSheet' src                     # local styling
```

Layout values in feature code come from tokens too (`theme.space.lg`,
`theme.layout.doseRowMinHeight`), so a spacing change lands in one file.

---

## Running in a browser

The same source serves the web target. It is not a separate build of the app and it
is not a phone screenshot stretched to fill a monitor — the layout adapts at three
widths, and every screen reasons about the *name* of the width rather than a pixel
number of its own.

| | `compact` (<700) | `medium` (700–1023) | `expanded` (≥1024) |
|---|---|---|---|
| Navigation | bottom tab bar | leading icon rail | leading labelled rail |
| Content column | fills the viewport | centred, max 760 | centred, max 1180 |
| Gutter | 20 | 32 | 40 |
| Card grids | 1 column | 2 columns | 3 columns |
| Dashboard | one column | one column | timeline + summary rail |
| `<Sheet>` | bottom sheet | centred dialog | centred dialog |

One hook (`useBreakpoint()`) reports the size and everything derived from it — the
gutter, the column cap, the grid count, the rail width. A screen never sees a raw
width, so changing where the app switches shape is a one-line edit in
`tokens/breakpoints.ts`.

**Navigation moves to the leading edge, not the bottom.** A bottom tab bar exists
because a thumb cannot reach the top of a phone. A pointer has no such limit, and
pinning navigation to the bottom of a 1400px window puts it as far from the content
and the cursor as the screen allows. Vertical space is also the scarce axis in a
browser. So above `compact`, `AppNavBar` renders the same routes as a rail down the
left — React Navigation still owns the routes and the focus state; only the drawing
is ours.

**The bottom sheet becomes a dialog.** Same component, same callers: a sheet glued
to the bottom edge of a desktop window is the worst place on the screen to put a
decision. Above `compact` it centres itself, drops the drag handle (there is nothing
to drag with a mouse) and closes on Escape.

**Hover is a real state.** A phone has no hover, so on native this code never runs.
In a browser it is the only thing that says a card is clickable before you click it,
so `Card` and `ListRow` carry a `surfaceHovered` fill and a shadow step — a token,
not an opacity trick.

**URLs work, and so does the Back button.** `linking.ts` maps `/`, `/medications`,
`/archive`, `/add` and `/medication/:id` to navigation state, and the browser tab
title tracks the screen. Without it the address bar reads `/` everywhere and Back
leaves the app instead of the screen, which is the most jarring thing about a mobile
app served in a browser. Deep linking stays off on native, where notification taps
already handle entry.

**Data has a web sibling.** `expo-sqlite` has no web implementation in SDK 51 —
`openDatabaseAsync` throws — so each repository has a `*.web.ts` file that Metro
resolves ahead of the native one, backed by `webMemoryStore` (in memory, mirrored to
`localStorage`). Native is untouched. This is a review convenience, not a second
production backend. Notifications degrade the same way: `configure()` catches the
unsupported-target throw and the dashboard shows its "reminders are off" notice.

### Verified, and not

`npx expo export --platform web` bundles cleanly (672 modules) and the output was
checked to confirm the web repositories are the ones that got bundled and the SQLite
schema is absent. The layout itself has **not** been opened in a browser: `expo
start --web` needs Node 18+ and this machine has Node 16, so the responsive
behaviour above is reasoned rather than seen. A pass in a real browser at each of
the three widths is the obvious next step.

---

## Key design decisions

**Shape + colour are a design-system concern.** `MedicineForm` and
`MedicineInkName` are defined in `design-system/tokens` and
`design-system/components/PillShape.tsx`, then re-exported by `src/domain/types`.
The set of shapes a user can pick *is* a visual decision, so the design system
owns it and the domain refers to it — not the reverse.

**Nothing about the schedule is precomputed.** Dose occurrences are derived on
demand from `(schedule, duration, logs)`. Editing a medication is therefore
trivial: there are no stale future rows to migrate, and the timeline can render
any day — past or future — through one code path.

**Every schedule resolves to a repeating set of daily times.** "Every 4 hours from
08:00" becomes `00:00, 04:00, 08:00, 12:00, 16:00, 20:00`. This is what users
expect from a pill reminder, and crucially it lets the app register one *repeating
daily* OS notification per dose time instead of thousands of one-shots — iOS caps
an app at 64 pending local notifications, so enumerating a 6-month course is not
an option. Intervals that don't divide 24 evenly (every 5 hours) are walked
outward from the anchor and truncated at midnight, so no dose lands on the wrong
calendar day.

**Calendar days are `YYYY-MM-DD` strings; times are `HH:MM` strings.** A dose set
for 08:00 on the 3rd must stay 08:00 on the 3rd through a timezone change or a DST
boundary. `Date` objects are only built when a real instant is needed.

**`missed` is derived, not stored.** A dose is `missed` once it is 90 minutes past
due and still unlogged. No background job is needed to keep the data honest.

**Inventory moves only on the transition into or out of `taken`.** Not on a skip,
and not merely because a dose came due — the count reflects what actually left the
bottle.

**Archiving happens the day *after* the end date**, so the final day's doses stay
on the dashboard until that day is over. The sweep is idempotent and runs on every
app foreground.

**Reactivation asks for a fresh duration.** Silently restoring March's dates would
create a course whose every dose is already missed.

**Status is never colour alone.** Every state pairs a hue with an icon and a word
(`Badge`, `TimelineRail`), selection pairs fill with a 2.5pt border *and* a check
glyph, and pale medicine swatches carry a visible edge so a white tablet stays
visible on a white card.

**Swipe is an accelerator, never the only path.** Everything reachable by swipe is
also in the tap-opened `DoseActionSheet`, which is the route that works with a
screen reader or limited motor control.

---

## Running it

**Node 18+ is what Expo SDK 51 supports**, but both `expo start` and
`expo export` were verified working on Node 16 here. What does break on this
machine is the iOS simulator probe (`xcrun simctl` exits 72), which is a broken
Xcode command-line-tools install rather than anything to do with Node — the same
breakage takes out `/usr/bin/git` and `/usr/bin/python3`. Repair with
`sudo xcode-select -s /Library/Developer/CommandLineTools`.

```bash
npm install
npm run typecheck   # tsc --noEmit — currently clean
npm test            # 36 tests over the scheduling/archive/inventory logic
npm start           # Expo dev server (needs Node 18+)
npm run web         # dev server in a browser (needs Node 18+)

npx expo export --platform web --output-dir dist   # works on Node 16
npx serve dist                                     # then open the three widths
```

Notifications need a **physical device** — simulators cannot receive them, and
`requestPermission()` reports `undetermined` rather than a false denial there.

### Deploying the web build

`vercel.json` builds with `npm run build` (`expo export --platform web`) and serves
`dist/`. The rewrite that sends every unmatched path to `index.html` is not
boilerplate: `app.json` sets `web.output: "single"`, so `/medications` is a
client-side route with no file behind it, and without the rewrite every URL except
`/` returns 404 on a hard load or a refresh.

Note that a production export sets `__DEV__` false, which disables the demo seed —
a fresh deployment therefore opens on the real first-run empty state.

---

## Status against the brief

| Requirement | Where |
|---|---|
| `/design-system` with colors/typography/spacing/radii tokens | `design-system/tokens/` |
| Base components incl. `<PillShape>` | `design-system/components/` |
| Screens import styles exclusively from the design system | verified by the greps above |
| Medication name input | `steps/IdentityStep.tsx` |
| Visual shape selector (round, oval, capsule, drops, syrup, injection, …) | `PillShape.tsx` — 10 forms |
| Visual colour selector | `SwatchDot` — 13 swatches |
| Dosage input + unit toggle (mg/ml/pills/drops/puffs/units/sachets) | `steps/DosageStep.tsx` |
| Instruction tags | `domain/instructions.ts` — 9 tags |
| Frequency: once, twice, 3×, every N hours, custom times | `domain/schedule.ts` |
| Duration: 1 day / 7 days / 1 month / ongoing / custom range | `useMedicationDraft.ts`, `DateRangePicker.tsx` |
| Total inventory → low-stock refill warning | `domain/inventory.ts`, dashboard notices |
| Timeline dashboard of today's schedule | `DashboardScreen.tsx` |
| Swipe or tap to log Taken / Skipped / Snoozed | `DoseCard.tsx`, `DoseActionSheet.tsx` |
| Auto-move to Archive when duration ends | `domain/archive.ts` + store sweep |
| Adherence history | `MedicationDetailScreen.tsx` heat grid |
| Reactivate an archived prescription | `ArchiveScreen.tsx` |
| Background push notifications | `notifications/notifications.ts` |
| Local database (SQLite) | `data/db.ts` |

### Not built (deliberately out of scope for the MVP)

- **Cloud sync / accounts.** The brief specifies a local store for the MVP.
- **A Settings screen.** `useColorSchemePreference()` exists in the design system
  for pinning light/dark, but nothing calls it yet — appearance follows the OS. On
  the web that also means no in-app light/dark switch, which a browser user is more
  likely to want than a phone user.
- **A master–detail desktop layout.** A medication's record is a pushed route, so at
  `expanded` it takes the whole window and the nav rail goes with it. Keeping the
  rail and opening the record beside the list is the right desktop shape, but it
  means restructuring the navigator, not adding a breakpoint.
- **Component snapshot tests.** The 36 tests cover the logic layer, which is where
  a bug is dangerous; the UI layer has no test harness configured.
- **Refill reminders as notifications.** The low-stock warning is in-app only.
