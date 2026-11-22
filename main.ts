// NIGHTGLASS — the entrypoint.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. It writes only to MAKEFUN_OUTPUT_DIR (the
// grader's /output): never into the repository, which the grader mounts
// read-only.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The dossier caps are the competition's own: 160 KiB of source text,
// at most 4 screenshots of at most 256 KiB each, game/ within 993
// entries and 48 MiB, paths within 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function copyTree(fromDir, toDir) {
  if (!existsSync(fromDir)) throw new Error(`main.ts: missing ${fromDir}`);
  cpSync(fromDir, toDir, { recursive: true });
}

function main() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(outDir, { recursive: true });

  // Start clean so a second run writes exactly the same bytes as the
  // first: stale files from an earlier run must never leak into the
  // output.
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    const target = join(outDir, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }

  copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  // Read the dossier back and rebuild it from the same files: the two
  // must agree byte for byte, or the hand-in is not deterministic.
  const written = readFileSync(join(outDir, 'dossier.json'));
  const rebuilt = buildDossier(outDir, DOSSIER_CAPS);
  if (!written.equals(rebuilt)) {
    throw new Error('main.ts: dossier.json does not match a fresh buildDossier');
  }
  // And the game must still be the game: index.html and every source
  // file the dossier lists must be present in the output.
  const gameFiles = ['index.html', 'src/config.js', 'src/levels.js', 'src/light.js', 'src/guards.js', 'src/player.js', 'src/audio.js', 'src/render.js', 'src/shots.js', 'src/main.js'];
  for (const file of gameFiles) {
    if (!existsSync(join(outDir, 'game', file))) {
      throw new Error(`main.ts: missing game/${file} in the output`);
    }
  }

  console.log(`NIGHTGLASS: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
}

main();
