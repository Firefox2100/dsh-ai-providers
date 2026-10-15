---
name: DSH AI Providers UI
description: Provider configuration surfaces that belong naturally inside DeepSeek Harness.
colors:
  canvas: "var(--dsw-alias-bg-base)"
  surface-primary: "var(--dsw-alias-bg-layer-1)"
  surface-secondary: "var(--dsw-alias-bg-layer-2)"
  text-primary: "var(--dsw-alias-label-primary)"
  text-secondary: "var(--dsw-alias-label-secondary)"
  text-tertiary: "var(--dsw-alias-label-tertiary)"
  border-subtle: "var(--dsw-alias-border-l3)"
  accent: "var(--dsw-alias-state-business-primary)"
  success: "var(--dsw-alias-state-success-primary)"
  error: "var(--dsw-alias-state-error-primary)"
typography:
  title:
    fontFamily: "var(--dsw-font-family)"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
  body:
    fontFamily: "var(--dsw-font-family)"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "var(--dsw-font-family)"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
  caption:
    fontFamily: "var(--dsw-font-family)"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  compact: "var(--dsw-radius-sm)"
  control: "var(--dsw-radius-md)"
  group: "var(--dsw-radius-lg)"
  card: "var(--dsw-radius-xl)"
  panel: "var(--dsw-radius-panel)"
spacing:
  micro: "4px"
  compact: "8px"
  control: "12px"
  content: "16px"
  section: "24px"
---

# Design System: DSH AI Providers UI

## Direction

This is an Operate-mode interface embedded in DeepSeek Harness. DSH is the visual authority: use its semantic tokens, shared primitives, density, radii, focus treatment, and settings patterns. The documentation site's square “Capability Backplane” identity does not apply inside the application.

The product's identity comes from its information architecture—capabilities, providers, reusable connections, routes, models, credentials, probes, and concurrency—not from a second palette or bespoke chrome.

## Rules

- Use `--dsw-alias-*` semantic colors so light and dark themes remain host-owned.
- Use the DSH role-based radius scale: R8 compact controls, R12 standard controls, R16 grouped content, R20 independent cards, and R28 floating panels.
- Use 0.5px hairlines on flat surfaces. Raised DSH surfaces use elevation without a second border.
- Use shared `Button`, `Input`, `SettingsForm`, `SettingsValueField`, and `SettingsSecretField` primitives when they fit.
- Keep pages compact and scannable. Titles are 16/24, section headings 14/22, labels 13/20, and help text 12/18.
- Long route, model, URL, credential, and localized text must wrap or shrink without forcing horizontal scrolling.
- Action groups wrap. Form grids collapse structurally at narrow widths; type does not scale fluidly.
- Primary actions commit; outline and ghost actions edit, discover, test, add, or remove according to the surrounding DSH pattern.
- Status never relies on color alone. Loading, failure, empty, unavailable, read-only, and saved states remain explicit in text.
- Provider editors rendered through slots use the same spacing and control vocabulary as their owning capability page.

## Do not

- Do not import the docs palette, squared marketing geometry, Ubuntu display treatment, or backplane decoration.
- Do not hard-code light/dark colors or add plugin-level theme selectors.
- Do not use native unstyled buttons where the DSH `Button` primitive fits.
- Do not use one radius for every surface, 1px neutral borders everywhere, or a border and elevation together.
- Do not flatten provider-specific controls merely to make different vendors visually identical.
