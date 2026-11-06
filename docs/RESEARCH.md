# Research notes — QR menu themes (all seven)

Brief survey of similar restaurant QR / menu-app experiences, used to shape Frost & Flame’s seven guest themes. Reviewed Nov 2026.

## Shared industry learnings (all themes)

| Source | Takeaway |
|---|---|
| Menulisa, PixPlat, momenu | Mobile-first list, featured row, no forced sign-up, portion cues, photos |
| Cazzip, Biipz, nice2mu | Wait-time games inside the same QR; delay until food is cooking; max a few options |
| iCHEF 點餐 3.0 | Party size / mood drives recommendations and ticket size |

---

## 1. Just me — man (`solo_m`)

**Top five**
1. Fast “quick order” / reorder path beats browsing the whole menu (CAVA, RIE S mobile ordering).
2. Clear portion size (regular / enough-for-one / double) reduces hesitation (CAVA double-portion ask).
3. Featured / most-rated items get checked first by ~3/5 app users.
4. Large photos + minimal text; too much copy feels slow.
5. Optional add-on suggestions after the main pick lift ticket size without cluttering the first screen.

**Chosen:** **Quick picks for one** — a one-tap strip of solo favourites at the top.  
**Why:** Solo men optimise for speed; a three-item quick strip + existing “Perfect for one” badges cuts decision time without removing the full menu.

**Added:** `#ffQuickPicks` strip (pulav, chaat, stone) with one-tap +1; comic flames motif; cheeky lines; theme scratch line.

---

## 2. Just me — woman (`solo_f`)

**Top five**
1. Photos + short descriptions + calorie / lightness cues drive informed choices (904 Tacos UX).
2. Portion transparency matters to ~78% of diners (US Foods survey).
3. Soft, welcoming visuals and handwritten-style type reduce solo-dining emptiness (OSU handwritten menus; SVA Table for One).
4. Pleasure / treat framing beats “challenge yourself” framing for solo women.
5. Optional reflective / calm prompts make the table feel less empty.

**Chosen:** **Treat-yourself set** — drink + small bite + main suggested as one calm set.  
**Why:** Matches “one drink, one small bite, one main” solo-dining research and keeps the stylish tone; photos and “Just for you” badge already cover visuals / portion.

**Added:** Treat-yourself set card with “Add this set”; Pacifico + blush palette; nail-safe scratch line; colouring game preference.

---

## 3. Two friends (`friends`)

**Top five**
1. Shared cart / “same as me” copy cuts “what are you getting?” friction (KKSJ, Rebel Foods).
2. Fair bill-split tools are the #1 post-meal pain (SlashTab, DineNex, Gastronomic).
3. Dietary filters keep the table inclusive.
4. Voting / spinning when undecided is fun and social (DineNex wheel).
5. Shareable dishes labelled clearly beat guessing portion math.

**Chosen:** **Who’s paying? picker + equal-split hint** on the bill area / friends card.  
**Why:** Friends already get sharing-first menu order; the missing social beat is deciding who pays — light, funny, on-brand with the scratch line.

**Added:** “Who’s paying?” tap-to-pick (Friend A / Friend B / Split equal); sharing badges; confetti surprise.

---

## 4. Couple (`couple`)

**Top five**
1. Each person keeps one priority dish, then add complementary (not duplicate) items (SeEat couples guide).
2. Explicit “for two / shareable” labels and dessert-to-share section (Table for Two case study).
3. Drink + dessert pairing suggestions feel date-night special.
4. Shared shortlist / “add the pair” reduces back-and-forth.
5. Romantic tone and share cues without forcing interaction.

**Chosen:** **Date-night pair** — one complementary set (share dessert + 2 drinks or pulav + stone + chai×2) with “Add the pair”.  
**Why:** Implements complementary ordering in one tap while keeping full couple-reordered menu and “Couple dish ❤” badges.

**Added:** Date-night pair card; suggestion lines under couple dishes; hearts surprise; love quiz game.

---

## 5. Three — Gang’s Night Out (`gang`)

**Top five**
1. Named participants / roles on a shared order stop “who ordered what?” (PAR Group Ordering, Bunbun).
2. Live table summary of picks builds trust before locking the order.
3. Shared platters need clear ownership or split rules (TableTab).
4. Host / passer of the phone is a real pattern for 3-person tables on one QR.
5. Communal “what’s ordered gets shared” norms reduce awkwardness.

**Chosen:** **Who’s who roles that actually add a suggested dish + table picks summary.**  
**Why:** Roles were drafted; making them mutate qty + show a live summary is the highest-value group UX from research.

**Added:** Role buttons add suggested item; “Table picks” summary; neon night theme; pass-round scratch line.

---

## 6. Four+ — Big Family Feast (`family`)

**Top five**
1. Headcount-first quantity recommendations (“serves X”) prevent under/over-ordering (PAR serving headcount).
2. Platters with per-person price / “feeds N” labels (catering UX).
3. “Got enough?” confirmation before bill.
4. Shared-cart / one uncle orders for everyone is culturally familiar.
5. Dietary filters for mixed-age tables.

**Chosen:** **Build your feast** headcount helper with suggested quantities + one-tap apply.  
**Why:** Directly solves the large-table math problem; matches the drafted “Be that uncle” tone.

**Added:** Headcount input → suggested pulav/chaat/stone/chai qty + “Fill the table” button; marigold feast theme.

---

## 7. Family with kids (`family_kids`) — NEW

**Top five**
1. Dedicated kids’ meal / kids’ picks section is #1 for parents of 3–9s (C3 Food + Fun study).
2. Fun / activity (colouring, simple games) is #2 — keeps kids occupied so adults can order.
3. Clear allergen + mild/spicy labels build parent trust (food-truck UX allergy tags).
4. Big photos, simple words, large tap targets for child-assisted browsing (upqr.menu).
5. Quiet, optional entertainment — not forced AR or loud games (In-N-Out Kids: colour / build / imagine).

**Chosen:** **Kids’ picks strip + mild/spice + allergen cues, with colouring game first.**  
**Why:** Combines Food (#1) and Fun (#2) without removing adult dishes; colouring matches proven kids-restaurant play research.

**Added:** New theme `family_kids` (sky blue, grass green, sunny yellow, soft coral — distinct from all six); Kids’ picks strip; Mild / Contains dairy|nuts style chips; colour game + kids quiz; “Little hands, big flavours” lines.

---

## Micro-layout (phone)

- Max-width 460px; qty buttons ≥44px hit area; who-grid 2 columns; theme chip sticky under hero.
- Greeting → who picker → themed menu; Change who’s here always available.
- Games after 5–10 min (`?fast=1` → ~8s); max two options; `prefers-reduced-motion` respected.
- Test deep links: `?group=solo_m|solo_f|friends|couple|gang|family|family_kids` (and `?fast=1`).


## Family-with-kids dual zones
Kids' colouring area and adults' quick facts are separate cards on the family_kids theme.
