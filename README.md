# Argon - Combat HUD (Vagabond)

A [Vagabond RPG](https://landoftheblind.myshopify.com/products/vagabond-pulp-fantasy-rpg-core-rulebook) system integration for the [Argon - Combat HUD (CORE)](https://foundryvtt.com/packages/enhancedcombathud/) module in Foundry VTT.

## Requirements

- Foundry VTT v12+
- [Argon - Combat HUD (CORE)](https://foundryvtt.com/packages/enhancedcombathud/) `v4.0.0+`
- [Vagabond](https://foundryvtt.com/packages/vagabond) system `v3.0.0+`

## Installation

Paste this URL into the Foundry **Install Module** manifest field:

```
https://github.com/YOURUSERNAME/enhancedcombathud-vagabond/releases/latest/download/module.json
```

## Features

| Feature | Description |
|---|---|
| **HP Bar** | Live HP bar with low-HP pulse animation |
| **Mana Bar** | Shows only when the character has mana |
| **Luck & Armor stats** | Displayed beneath the portrait |
| **Weapon Sets** | Equipped weapons grouped into sets (up to 2 sets of 2) |
| **Standard Actions** | Move, Dodge, Help, Search buttons |
| **Abilities Panel** | All active ability/feature items |
| **Magic Panel** | All spell/magic items (hidden when actor has no mana/spells) |
| **Skills Panel** | Roll any skill/attribute directly from the HUD |
| **Status Effects** | Active conditions shown and toggleable in the bottom bar |

## Customising Action Descriptions

If you want to customise the description of the built-in standard actions (Move, Dodge, Help, Search), create a **Talent** item in your world with a name matching the pattern `_argonUI_<actionId>` where `<actionId>` is one of: `move`, `dodge`, `help`, `search`.

## Adapting to Your Version of Vagabond

The Vagabond system is actively developed. If the HUD does not show HP, Mana, or Skills, it is likely because the field names in `actor.system` differ from what this module expects.

Open your browser console (F12) and run:

```js
console.log(canvas.tokens.controlled[0]?.actor?.system);
```

Then compare the output to the field-name lookups in `scripts/vagabond.js`. The relevant sections are marked with comments like:

```js
// VAGABOND_FIELD — update this path if needed
```

The `getStat()` helper accepts multiple fallback paths, so you can simply add the correct path to the array.

## Contributing

Pull requests welcome! Please open an issue first to discuss significant changes.

## License

MIT — see `LICENSE`

---

*"Vagabond for Foundry is an independent product published under the Land of the Blind Third-Party License and is not affiliated with Land of the Blind, LLC. Vagabond // Pulp Fantasy RPG © 2025 Land of the Blind, LLC."*
