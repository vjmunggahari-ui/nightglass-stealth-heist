# NIGHTGLASS — steal the Hollow Moon

[![Bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/Indramunggahari10/nightglass-stealth-heist/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/Indramunggahari10/nightglass-stealth-heist/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

**5 heists · 19 guards · 36 treasures · light is your enemy.**

A museum at night. Lantern pools and guard vision cones reveal you; carpet
and shadow hide you. Lift the treasures, crack the locked cases, steal each
heist's target gem — and reach the exit unseen.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server — the game loads nothing over the network). No build step,
no assets to download.

- **WASD / arrows** — move
- **SHIFT** — sneak (slow, quiet, hard to spot)
- **SPACE** — run (fast, loud, easy to spot)
- **E** — lockpick a case (tap E in the green zone, three times)
- **P** — pause · **M** — mute

## The heists

1. **I — The Glass Atrium.** Two guards, four treasures. First night on the job.
2. **II — The Marble Gallery.** Marble carries every footstep. Walk the carpets.
3. **III — The Vault of Echoes.** Stone floors, four guards, seven treasures.
4. **IV — The Lantern Wing.** Lanterns everywhere. Cross only through shadow.
5. **V — The Hollow Moon.** Six guards. Eleven treasures. The Hollow Moon itself.

## Systems

- **Light and shadow.** A lantern pool lights you up and a guard's cone
  fills fast; carpet and shadow alcoves hide you. Your ground ring is amber
  when you are lit, blue when you are hidden.
- **Vision cones.** Guards patrol waypoints with a sweeping cone. Being
  half-seen makes a guard come and look; being fully seen makes it chase.
  Break line of sight and the trail goes cold — a near miss raises the
  alarm without ending the heist.
- **Hearing.** Footsteps carry by floor and gait: carpet hushes, stone
  echoes, running is loud. Guards investigate noises they hear.
- **Lockpicking.** Locked cases hold the richest treasures. A timing bar
  with a moving needle: three taps in the green zone cracks it. A slip
  rattles the case and the noise carries.
- **Ghost bonus.** Finish a heist never seen at all for +1500.
- **Sound.** Every footstep, chime, sting and the night drone is
  synthesized live with WebAudio — the game ships no audio files.

## Layout

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to
  `MAKEFUN_OUTPUT_DIR` and writes `dossier.json` with `buildDossier`.
- `game/index.html` — the page; `game/src/` holds the game, one file per
  job: `config.js` (tuning), `levels.js` (the five heists),
  `light.js` (line of sight, lantern light), `guards.js` (patrol AI),
  `player.js` (movement, noise, lockpick), `audio.js` (synth sound),
  `render.js` (canvas drawing), `shots.js` (screenshot poses),
  `main.js` (loop and state machine).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — four real renders of the game's own code: the cover,
  a guard closing in, a lockpick in progress, and a ghost heist complete.

## Entry

Built for the make.fun competition
[best-stealth-game-20261121-1759](https://make.fun/c/best-stealth-game-20261121-1759)
— "Build the best stealth game", $50. Run the entrypoint with
`MAKEFUN_OUTPUT_DIR=out node main.ts`; it writes `out/dossier.json`
and the game deterministically, twice byte-identical.

## License

MIT — see [LICENSE](LICENSE).
