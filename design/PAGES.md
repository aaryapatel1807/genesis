# PAGES.md — Genesis Page Specification (Phase 2 · UI Design)

Reference mockups: `design/mockups/` (landing, explorer, timeline, simulation, entity).
Tokens: `--void #05070c · --surface #0b1018 · --ink #eef2f8 · --muted #8b98ab ·
--gold #f5b942 · --teal #2dd4bf · --red #ef4444`. Type: Inter + JetBrains Mono.
No emojis anywhere. Dark theme only.

## Landing (/)
Layout: centered hero, nothing else above the fold. Wordmark GENESIS (44px/700),
tagline "Ask anything. Watch a world emerge.", topic input pre-filled "Artificial
Intelligence", gold lg "Generate World" button. Faint glowing node drift in bg.
Components: HeroStack, TopicInput (disabled pre-fill + "v1: AI Ecosystem" note),
GenerateWorldButton, Footer (hackathon credit line). States: idle; button
hover glow; on submit → route /world with build-up animation.

## Login
Layout: centered glass card (400px max) on the void background with faint graph
motif; email + password fields, gold "Sign in" button, link to signup. Below:
"Continue with Google" secondary option.
Components: TextInput, PrimaryButton, SecondaryButton, FormError inline.
States: idle; invalid input (red field hint, no toast); submitting (button
spinner); auth failure ("Invalid credentials" inline, no redirect).

## Signup
Layout: mirror of Login — centered glass card, name + email + password fields,
gold "Create account" button, terms line in 11px muted, link to login.
Components: TextInput x3, PrimaryButton, PasswordStrength meter (muted hints).
States: idle; weak password (inline hint); email taken (inline error); success
→ toast + redirect to /.

## Dashboard
Layout: post-login home. Same cinematic void as Landing, but hero shrinks to a
compact command bar (topic input + Generate World). Below: "Your worlds" grid
of glass world cards (name, node count, updated), "Continue exploring" row.
Components: TopicInput (compact), WorldCard, EmptyState ("No worlds yet").
States: empty (first-run prompt); loading skeletons; worlds grid with hover
lift on cards.

## World Generator (build-up sequence)
Layout: full-viewport universe canvas with staged build-up, no panels yet.
Center seed node blooms first → category clusters bloom → full universe over
~2.5s. Thin progress line bottom ("Seeding entities…", "Connecting…").
Components: UniverseGraph (bloom mode), GenerationStatusLine, CancelButton
(ghost, top-right).
States: seeding → blooming → connected (auto → /world); failure → serve cached
world with toast "Live search unavailable — cached world loaded."

## Graph Explorer (/world)
Layout: universe fills viewport. Top-left LayerBar chips; bottom-center
TimeSlider (2020·2022·2024·2026 + era caption); top-right Surprise me + credit
pill ("31/250 searches"). NodePanel right sheet / EdgePanel bottom sheet.
Components: UniverseGraph, LayerBar, TimeSlider, NodePanel, EdgePanel,
SerendipityButton, CreditPill. States: node selected (white ring); layer off
(dims non-members to 15%); hover tooltip; budget exhausted (amber banner).

## Timeline (/world?snapshot=YYYY)
Layout: same canvas morphed to the snapshot year — node sets cross-fade 900ms;
era caption center-top ("2022 — the generative boom begins"); TimeSlider with
active year in gold; right side optional milestone list for the year.
Components: UniverseGraph (morph), TimeSlider, MilestonePanel.
States: morphing (crossfade); snapshot with no data (dimmed layer note);
shareable link copies current year.

## Simulation (simulator mode)
Layout: graph with affected nodes pulsing red/gold, others dimmed 15%. Left
SimulatorPanel (scenario textarea + cascade list + Reset). Undismissable red
banner top-center: "SIMULATION — AI-generated scenario, not factual prediction."
Components: UniverseGraph (pulsing), SimulatorPanel, SimulationBanner
(role="alert"), CascadeRow list.
States: editing scenario; running (cascade pulses); reset clears banner and
pulses; ESC resets.

## Entity Page (deep link /world?node=ID)
Layout: identical to Graph Explorer, but the NodePanel is open on load for the
deep-linked node and the camera flies to it on mount. Entity name in mono
breadcrumb above the graph.
Components: UniverseGraph (flyTo), NodePanel (open by default), Breadcrumb.
States: valid node (panel open); unknown ID (panel shows "Entity not found",
graph stays interactive).

## Research Mode
Layout: world view with a right-side research rail replacing NodePanel: query
field, paper list (title, authors, year, citations), filter chips
(Papers / Patents / Preprints). Graph dims to show only paper + researcher
nodes.
Components: UniverseGraph (layer-filtered), ResearchRail, PaperCard,
CitationSparkline.
States: searching (skeleton rows); no results ("No papers found in this
snapshot"); paper selected → mini detail with "Why relevant" evidence line.

## Search
Layout: centered command-style search over a dimmed universe: large input,
live result dropdown grouped by type (Companies / People / Papers), keyboard
navigable. Selecting a result flies the camera to it in /world.
Components: SearchInput, SearchResults (grouped), KeyboardHint.
States: idle; typing (debounced dropdown); no matches ("No entities match —
try expanding the world"); result hover highlights node.

## Settings
Layout: left sidebar nav (Profile / Search budget / Appearance / Data), right
content pane. 260px sidebar, surface fill, muted caps section labels, active
item gold left-border. Budget slider with credit pill; toggles for motion and
tooltips.
Components: SettingsSidebar, Toggle, Slider, CreditPill, DangerZone (reset).
States: saved (inline "Saved" confirmation, no toast); budget low (<20% amber
warning in pill).

## Profile
Layout: centered glass card: avatar, name, email, member-since; stats row
(worlds generated, nodes explored, simulations run) as mono stat cards; "Your
worlds" quick list; sign-out button.
Components: Avatar, StatCard, WorldRow (compact), SecondaryButton.
States: loading skeletons; empty stats ("Explore your first world").

## Saved Worlds
Layout: grid of world cards (thumbnail spark of the graph, name, topic,
node/edge counts, updated time, snapshot year). Search/filter input top.
Actions per card: Open, Rename, Delete (confirm modal).
Components: WorldCard (with GraphThumbnail), SearchInput, ConfirmModal.
States: empty ("No saved worlds yet — generate one"); deleting (confirm modal);
renaming (inline edit).

## Analytics
Layout: read-only insight page over a dimmed universe: stat cards (nodes,
edges, sources, searches used), snapshot bars (node count per year), top
entity types donut (14 type colors), recent activity feed.
Components: StatCard, SnapshotBars, TypeDonut, ActivityFeed.
States: loading skeletons; insufficient data ("Generate a world to see
analytics"); all numbers in JetBrains Mono.

## 404
Layout: centered on void: large mono "404", line "This corner of the universe
doesn't exist.", gold "Back to Genesis" button. A few dim drifting nodes.
Components: PrimaryButton only.
States: static. No auto-redirect — the user chooses.

## Loading
Layout: full-viewport void with centered pulsing seed node (gold), mono status
line cycling ("Contacting live search…", "Seeding entities…", "Connecting
evidence…"), thin gold progress shimmer. Never a blank screen.
Components: SeedPulse, StatusLine.
States: determinate when possible (step labels); indeterminate shimmer when
waiting on network.

## Empty
Layout: contextual empty panel centered in the relevant view — dashed 1px
--line border, muted icon glyph, honest copy. Example: expansion empty —
"No further entities found in live search."
Components: EmptyState (icon, title, body, optional action).
States: per-context copy; always offers the next honest action (e.g. "Try a
different node") rather than a dead end.

## Error
Layout: centered glass card: red-tinted icon glyph, title ("Something broke in
the universe"), one-line explanation, gold "Retry" + ghost "Go home" buttons.
Technical detail collapsed in mono (expandable).
Components: ErrorCard, PrimaryButton, GhostButton, DetailsDisclosure.
States: retryable (Retry re-runs the failed action); fatal (only Go home);
auto-serves cached world where possible with toast.

## Admin
Layout: sidebar app shell (Overview / Worlds / Users / Flags / Logs). Overview:
stat cards (active worlds, searches/min, error rate) + live event log stream
in mono. Flags: toggles for experimental features.
Components: AdminSidebar, StatCard, EventLog (mono stream), Toggle.
States: loading; stream paused ("Reconnect" ghost button); flag change
requires confirm modal (destructive ones only).
