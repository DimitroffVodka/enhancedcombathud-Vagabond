/**
 * Argon - Combat HUD (Vagabond)
 * System integration for the Vagabond RPG system.
 *
 * Vagabond character data structure (actor.system):
 *   - health / hp:  { value, max }        — Hit Points
 *   - mana:         { value, max }        — Mana (magic resource)
 *   - luck:         { value, max }        — Luck
 *   - armor:        { value }             — Armor value
 *   - initiative:   { value }             — Initiative bonus
 *   - speed:        { value }             — Movement speed
 *
 * Item types:
 *   - weapon      — melee/ranged attacks
 *   - ability     — class/ancestry active abilities
 *   - spell       — magical spells (may be named "magic" in system)
 *   - talent      — passive talents / perks (shown as utility)
 *   - equipment   — gear, consumables
 *
 * NOTE: Vagabond uses "hp" or "health" depending on version.
 *       The code below checks both and falls back gracefully.
 *       If your version of Vagabond uses different field names,
 *       search for "VAGABOND_FIELD" comments and update accordingly.
 */

Hooks.once("argon-combat-hud.ready", async (CoreHUD) => {
  const { ARGON } = game;

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Safely read a nested property from actor.system, trying multiple paths.
   * Useful because Vagabond's data model may vary across versions.
   */
  function getStat(actor, ...paths) {
    for (const path of paths) {
      const parts = path.split(".");
      let val = actor.system;
      for (const part of parts) {
        if (val == null) break;
        val = val[part];
      }
      if (val !== undefined && val !== null) return val;
    }
    return null;
  }

  /**
   * Get the HP object (value / max) from the actor.
   */
  function getHP(actor) {
    // Try common Vagabond paths
    return (
      getStat(actor, "hp") ||
      getStat(actor, "health") ||
      getStat(actor, "attributes.hp") ||
      { value: 0, max: 0 }
    );
  }

  /**
   * Get the Mana object (value / max) from the actor.
   */
  function getMana(actor) {
    return (
      getStat(actor, "mana") ||
      getStat(actor, "mp") ||
      getStat(actor, "attributes.mana") ||
      null
    );
  }

  /**
   * Get the Luck object (value / max) from the actor.
   */
  function getLuck(actor) {
    return (
      getStat(actor, "luck") ||
      getStat(actor, "attributes.luck") ||
      null
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Portrait Section  (left panel — portrait + core vitals)
  // ─────────────────────────────────────────────────────────────────────────

  class VagabondPortraitSection extends ARGON.PORTRAIT.PortraitSection {
    /**
     * The "primary" resource bar shown beneath the portrait.
     * For Vagabond this is HP.
     */
    get primaryBar() {
      const hp = getHP(this.actor);
      return {
        value: hp.value ?? 0,
        max: hp.max ?? 0,
        cssClass: "hp",
        label: game.i18n.localize("VAGABOND_ARGON.HP"),
        color: "#c91616",
        threshold: 0.25, // turn red below 25%
      };
    }

    /**
     * The "secondary" resource bar — Mana.
     * Returns null if the actor has no mana (e.g. non-magical NPC).
     */
    get secondaryBar() {
      const mana = getMana(this.actor);
      if (!mana) return null;
      return {
        value: mana.value ?? 0,
        max: mana.max ?? 0,
        cssClass: "mana",
        label: game.i18n.localize("VAGABOND_ARGON.Mana"),
        color: "#2d52c4",
      };
    }

    /**
     * Stats shown as small icons/numbers beneath the portrait.
     */
    get stats() {
      const luck = getLuck(this.actor);
      const armor = getStat(this.actor, "armor") ?? getStat(this.actor, "attributes.armor");
      const armorValue =
        typeof armor === "object" ? armor.value ?? armor.total ?? 0 : armor ?? 0;

      const entries = [];

      if (luck !== null) {
        entries.push({
          id: "luck",
          label: game.i18n.localize("VAGABOND_ARGON.Luck"),
          value: luck.value ?? luck ?? 0,
          icon: "fas fa-clover",
          cssClass: "luck",
        });
      }

      entries.push({
        id: "armor",
        label: game.i18n.localize("VAGABOND_ARGON.Armor"),
        value: armorValue,
        icon: "fas fa-shield-halved",
        cssClass: "armor",
      });

      return entries;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Button types — individual clickable item buttons
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * A button for a Vagabond weapon item.
   */
  class VagabondWeaponButton extends ARGON.MAIN.BUTTONS.ItemButton {
    get icon() {
      return this.item?.img ?? "icons/svg/sword.svg";
    }

    get label() {
      return this.item?.name ?? "";
    }

    /**
     * Tooltip shown on hover — damage, range, properties.
     */
    get tooltip() {
      const item = this.item;
      if (!item) return null;
      const sys = item.system ?? {};
      const lines = [];
      if (sys.damage?.formula || sys.damage)
        lines.push(`<p><strong>${game.i18n.localize("VAGABOND_ARGON.Damage")}:</strong> ${sys.damage?.formula ?? sys.damage}</p>`);
      if (sys.range?.value || sys.range)
        lines.push(`<p><strong>${game.i18n.localize("VAGABOND_ARGON.Range")}:</strong> ${sys.range?.value ?? sys.range}</p>`);
      if (sys.properties && typeof sys.properties === "object") {
        const props = Object.entries(sys.properties)
          .filter(([, v]) => v === true)
          .map(([k]) => k)
          .join(", ");
        if (props) lines.push(`<p><strong>${game.i18n.localize("VAGABOND_ARGON.Properties")}:</strong> ${props}</p>`);
      }
      return lines.length ? lines.join("") : null;
    }

    async onClick(event) {
      await this.item?.roll?.() ?? this.item?.use?.();
    }
  }

  /**
   * A button for ability/spell items.
   */
  class VagabondAbilityButton extends ARGON.MAIN.BUTTONS.ItemButton {
    get icon() {
      return this.item?.img ?? "icons/svg/aura.svg";
    }

    get label() {
      return this.item?.name ?? "";
    }

    get tooltip() {
      const sys = this.item?.system ?? {};
      const lines = [];
      if (sys.description?.value)
        lines.push(`<p>${sys.description.value}</p>`);
      if (sys.cost)
        lines.push(`<p><strong>${game.i18n.localize("VAGABOND_ARGON.Cost")}:</strong> ${sys.cost}</p>`);
      return lines.length ? lines.join("") : null;
    }

    async onClick(event) {
      await this.item?.roll?.() ?? this.item?.use?.();
    }
  }

  /**
   * A button for skill/attribute rolls — no item, just a macro-style click.
   */
  class VagabondSkillButton extends ARGON.MAIN.BUTTONS.ActionButton {
    constructor({ skillKey, label, icon, actor }) {
      super();
      this._skillKey = skillKey;
      this._label = label;
      this._icon = icon;
      this._actor = actor;
    }

    get label() { return this._label; }
    get icon()  { return this._icon; }

    async onClick(event) {
      // Vagabond exposes rollSkill / rollAttribute on the actor
      const actor = this._actor;
      if (actor.rollSkill) return actor.rollSkill(this._skillKey);
      if (actor.rollAttribute) return actor.rollAttribute(this._skillKey);
      // fallback — just open character sheet
      actor.sheet?.render(true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Weapon Sets Panel  (centre-bottom — primary weapon slots)
  // ─────────────────────────────────────────────────────────────────────────

  class VagabondWeaponSetsPanel extends ARGON.MAIN.WEAPON_SETS.WeaponSetsPanel {
    /**
     * Vagabond characters can equip up to two weapon sets.
     * We derive them from equipped weapons on the actor.
     */
    get weaponSets() {
      const weapons = this.actor.items
        .filter((i) => i.type === "weapon")
        .sort((a, b) => {
          // Prefer equipped items first
          const aEq = a.system?.equipped ?? a.system?.carried ?? false;
          const bEq = b.system?.equipped ?? b.system?.carried ?? false;
          return bEq - aEq;
        });

      // Pair weapons into sets of 2 (main + off-hand)
      const sets = [];
      for (let i = 0; i < Math.min(weapons.length, 4); i += 2) {
        sets.push([
          weapons[i] ? new VagabondWeaponButton({ item: weapons[i] }) : null,
          weapons[i + 1] ? new VagabondWeaponButton({ item: weapons[i + 1] }) : null,
        ]);
      }
      // Always have at least one set (even if empty)
      if (sets.length === 0) sets.push([null, null]);
      return sets;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Groups / Panels  (right side panels)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Standard combat actions (Move, Dodge, Help, etc.)
   * These use simple ActionButton instances with direct actor hooks.
   */
  class VagabondStandardActionsGroup extends ARGON.MAIN.ACTION_GROUPS.ActionGroup {
    get label() {
      return game.i18n.localize("VAGABOND_ARGON.StandardActions");
    }

    get icon() { return "fas fa-bolt"; }

    get buttons() {
      return [
        new ARGON.MAIN.BUTTONS.ActionButton({
          label: game.i18n.localize("VAGABOND_ARGON.Move"),
          icon: "fas fa-person-walking",
          cssClass: "action-move",
          onClick: async () => {
            // Toggle the movement overlay in Argon
            game.ARGON.CoreHUD?.toggleMovementOverlay?.();
          },
        }),
        new ARGON.MAIN.BUTTONS.ActionButton({
          label: game.i18n.localize("VAGABOND_ARGON.Dodge"),
          icon: "fas fa-person-running",
          cssClass: "action-dodge",
          onClick: async () => {
            // Apply a "dodge" effect if the system supports it
            const actor = this.actor;
            if (actor.rollDodge) return actor.rollDodge();
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: `<p>${actor.name} takes the Dodge action.</p>`,
            });
          },
        }),
        new ARGON.MAIN.BUTTONS.ActionButton({
          label: game.i18n.localize("VAGABOND_ARGON.Help"),
          icon: "fas fa-handshake",
          cssClass: "action-help",
          onClick: async () => {
            const actor = this.actor;
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: `<p>${actor.name} takes the Help action.</p>`,
            });
          },
        }),
        new ARGON.MAIN.BUTTONS.ActionButton({
          label: game.i18n.localize("VAGABOND_ARGON.Search"),
          icon: "fas fa-magnifying-glass",
          cssClass: "action-search",
          onClick: async () => {
            const actor = this.actor;
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: `<p>${actor.name} takes the Search action.</p>`,
            });
          },
        }),
      ];
    }
  }

  /**
   * Abilities panel — shows all active ability items.
   */
  class VagabondAbilitiesPanel extends ARGON.MAIN.ACTION_GROUPS.ActionGroup {
    get label() {
      return game.i18n.localize("VAGABOND_ARGON.Abilities");
    }

    get icon() { return "fas fa-fist-raised"; }

    get buttons() {
      const abilityTypes = ["ability", "feature", "class-feature", "ancestry-feature", "talent"];
      return this.actor.items
        .filter((i) => abilityTypes.includes(i.type) && !i.system?.passive)
        .map((item) => new VagabondAbilityButton({ item }));
    }
  }

  /**
   * Magic / Spells panel — shows all spell items.
   */
  class VagabondMagicPanel extends ARGON.MAIN.ACTION_GROUPS.ActionGroup {
    get label() {
      return game.i18n.localize("VAGABOND_ARGON.Magic");
    }

    get icon() { return "fas fa-hat-wizard"; }

    /**
     * Only show this group if the actor has mana (is a magic user).
     */
    get visible() {
      return getMana(this.actor) !== null || this._hasSpells();
    }

    _hasSpells() {
      return this.actor.items.some((i) => ["spell", "magic", "incantation"].includes(i.type));
    }

    get buttons() {
      return this.actor.items
        .filter((i) => ["spell", "magic", "incantation"].includes(i.type))
        .map((item) => new VagabondAbilityButton({ item }));
    }
  }

  /**
   * Skills panel — roll any skill from within the HUD.
   */
  class VagabondSkillsPanel extends ARGON.MAIN.ACTION_GROUPS.ActionGroup {
    get label() {
      return game.i18n.localize("VAGABOND_ARGON.Skills");
    }

    get icon() { return "fas fa-dice-d20"; }

    get buttons() {
      const sys = this.actor.system;
      const buttons = [];

      // Vagabond stores skills at actor.system.skills as an object
      const skills = sys?.skills ?? sys?.attributes?.skills ?? {};
      for (const [key, skill] of Object.entries(skills)) {
        const label = skill?.label ?? skill?.name ?? game.i18n.localize(`VAGABOND.skill.${key}`) ?? key;
        buttons.push(
          new VagabondSkillButton({
            skillKey: key,
            label,
            icon: "fas fa-dice-d6",
            actor: this.actor,
          })
        );
      }

      // Fallback: if no skills object, add generic attribute rolls
      if (buttons.length === 0) {
        const attributes = ["str", "dex", "con", "int", "wis", "cha"];
        for (const attr of attributes) {
          if (sys?.attributes?.[attr] !== undefined || sys?.[attr] !== undefined) {
            buttons.push(
              new VagabondSkillButton({
                skillKey: attr,
                label: game.i18n.localize(`VAGABOND_ARGON.Attr.${attr.toUpperCase()}`),
                icon: "fas fa-dice-d6",
                actor: this.actor,
              })
            );
          }
        }
      }

      return buttons;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status Bar  (bottom bar — conditions/effects)
  // ─────────────────────────────────────────────────────────────────────────

  class VagabondStatusSection extends ARGON.MAIN.STATUS.StatusSection {
    /**
     * Return condition buttons: active effects on the actor.
     */
    get effects() {
      return this.actor.temporaryEffects.map((effect) => ({
        id: effect.id,
        label: effect.label ?? effect.name,
        icon: effect.icon,
        active: !effect.disabled,
        onToggle: async () => {
          await effect.update({ disabled: !effect.disabled });
        },
        onDelete: async () => {
          await effect.delete();
        },
      }));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main HUD class
  // ─────────────────────────────────────────────────────────────────────────

  class VagabondHUD extends CoreHUD {
    /**
     * The system id that this integration handles.
     */
    get systemId() {
      return "vagabond";
    }

    // ── Portrait (left panel) ──────────────────────────────────────────────

    /**
     * Build the portrait section.
     */
    async getPortraitSection(actor) {
      return new VagabondPortraitSection({ actor });
    }

    // ── Action Layout (right panels) ──────────────────────────────────────

    /**
     * Return the array of action groups shown on the right.
     */
    async getActionLayoutSection(actor) {
      return [
        new VagabondWeaponSetsPanel({ actor }),
        new VagabondStandardActionsGroup({ actor }),
        new VagabondAbilitiesPanel({ actor }),
        new VagabondMagicPanel({ actor }),
        new VagabondSkillsPanel({ actor }),
      ];
    }

    // ── Status Bar (bottom) ───────────────────────────────────────────────

    async getStatusSection(actor) {
      return new VagabondStatusSection({ actor });
    }

    // ── Movement tracker ──────────────────────────────────────────────────

    /**
     * Vagabond uses simple tile-based movement.
     * Return the actor's base speed for the movement tracker.
     */
    get actorSpeed() {
      const actor = this.actor;
      if (!actor) return null;
      const speed =
        getStat(actor, "speed") ??
        getStat(actor, "movement.walk") ??
        getStat(actor, "attributes.speed");
      if (speed == null) return null;
      return typeof speed === "object" ? speed.value ?? null : speed;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Register the integration
  // ─────────────────────────────────────────────────────────────────────────

  new VagabondHUD();

  console.log("Argon Combat HUD | Vagabond integration loaded.");
});
