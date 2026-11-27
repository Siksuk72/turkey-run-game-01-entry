# GIBLET'S GREAT ESCAPE — 3 farms · 9 ovens · 24 knives · 1 farmer

A complete turkey escape game for the make.fun **turkey-run-game-01** bounty.
Giblet the turkey has one morning to outrun Thanksgiving: sprint 900 metres
from the Maple Farmyard, through the Old Barn, and out of the Farmhouse
Kitchen — chased the whole way by Farmer Bram, dodging 9 ovens and
24 carving knives, hiding in 12 haystacks, and grabbing 18 corn cobs on the way.

- **3 stages** — Maple Farmyard (0–300 m), The Old Barn (300–600 m),
  The Farmhouse Kitchen (600–900 m). Each stage is faster and denser.
- **1 farmer** — Farmer Bram chases from behind. Stumble and he closes in;
  sprint to pull away. If he catches you, dinner is served.
- **9 ovens, 24 carving knives** — jump the ovens, duck the flying knives,
  mind the knives falling from the sky.
- **12 haystacks** — press Down inside one to hide while Bram storms past.
- **18 corn cobs, 3 gravy boats** — corn scores and buys a little breathing
  room; a gravy boat is a shield that eats one hit.
- **3 lives, HUD** — score, distance, hearts, corn, stage, farmer-gap meter,
  stamina bar.
- **Title screen, caught screen, escaped screen, restart** — full game flow.
- **Sound** — all synthesized with WebAudio (gobbles, chimes, sizzle,
  fanfare). No audio files. `M` mutes.
- **Original art** — every sprite is drawn in code on a 2D canvas in a
  storybook-autumn palette. No copied assets, no network requests.

## Controls

| Key / mouse | Action |
|---|---|
| `Space` / `↑` / click | Jump (press twice in the air for a double jump) |
| `↓` (hold near a haystack) | Hide in the haystack |
| `Shift` / `→` (hold) | Sprint (drains stamina) |
| `←` (hold) | Ease off (recover stamina) |
| `P` | Pause · `M` mute · `R` restart on an end screen |

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No build step, no network request.

```
node serve.ts   # serves game/ at http://localhost:8080
```

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of this game's own code,
taken in desktop Chrome (`?shot=start|play|kitchen|end` renders a fixed
frame for each shot).

## License

MIT — see `LICENSE`.
