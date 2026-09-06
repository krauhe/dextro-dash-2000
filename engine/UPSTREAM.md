# Upstream physiology engine

The physiology engine in DEXTRO DASH 2000 is synchronized from the public [T1D Simulator repository](https://github.com/krauhe/t1d-simulator).

## File mapping

| T1D Simulator source | DEXTRO DASH 2000 copy |
| --- | --- |
| `js/hovorka.js` | `engine/hovorka.js` |
| `js/physiology-engine.js` | `engine/physiology-engine.js` |

These are direct copies. Game-specific configuration and mechanics remain in `game.js` and `dex-activity.js`; the synchronized files must not contain DEXTRO DASH-specific changes. The activity adapter uses the imported cardio presets and retains physiological recovery; its compatibility tests run during synchronization.

## Automated update process

The workflow in `.github/workflows/sync-physiology-engine.yml` runs weekly and supports manual dispatch. It checks out both repositories, copies the two files, validates them and opens a pull request only when the resulting files differ.

Updates are reviewed before merging because the upstream engine API can evolve independently of this game.
