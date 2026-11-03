---
name: CargoMesh V2 light product workspace
description: Existing CargoMesh product tokens and observed operations components.
colors:
  cm-color-canvas: "#f5f7f8"
  cm-color-surface: "#ffffff"
  cm-color-surface-subtle: "#eef3f4"
  cm-color-surface-tint: "#f1f7f7"
  cm-color-ink: "#163349"
  cm-color-muted: "#536b78"
  cm-color-line: "#dce5e8"
  cm-color-line-strong: "#a9bec5"
  cm-color-primary: "#00747c"
  cm-color-primary-hover: "#005f67"
  cm-color-focus: "#13aeb7"
  cm-color-selected: "#e6f3f3"
  cm-color-positive: "#216650"
  cm-color-positive-surface: "#e9f5ef"
  cm-color-warning-surface: "#fff4d9"
  cm-color-warning-ink: "#815b16"
  cm-color-danger: "#9b3325"
  cm-color-danger-surface: "#fff4f1"
typography:
  page-title:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.65rem,2vw,2rem)"
    fontWeight: 700
  page-description:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: ".875rem"
  operation-body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    lineHeight: 1.6
  compact-metric:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.025em"
rounded:
  cm-radius-sm: ".5rem"
  cm-radius-md: ".7rem"
  cm-radius-lg: ".9rem"
components:
  workspace-control:
    height: "2.75rem"
    backgroundColor: "{colors.cm-color-surface}"
    textColor: "{colors.cm-color-ink}"
  compact-metric:
    backgroundColor: "{colors.cm-color-surface}"
    textColor: "{colors.cm-color-ink}"
    typography: "{typography.compact-metric}"
    padding: "22px 24px"
---

# Design System: CargoMesh V2 light product workspace

## Overview

**Creative North Star: "CargoMesh V2 product workspace"**

This is a descriptive name for the incumbent implementation, not a new visual direction or a claim of prior approval. The light CargoMesh product workspace uses restrained teal actions, dark blue text, white operational surfaces and explicit data provenance. It presents quantities, scope, uncertainty and source versions as readable product information.

This scan records the shared CargoMesh V2 tokens and the reused components visible in Tetris. It is not a redesign of the landing shell, carrier portal, or truck laboratory. The operations extension remains governed by [its direction contract](docs/meta/design-tetris-operation.md); historical [product context](docs/PRODUCT.md) does not reassign team ownership.

**Key Characteristics:**

- Shared light product tokens and the declared Inter sans stack.
- Bordered tables and forms with tabular quantities and visible source information.
- Compact metrics, explicit pending states and responsive internal table scrolling.

Source of truth: `cargomesh/src/app/globals.css`; component observations: `cargomesh/src/features/meta-loading-dashboard/` and `cargomesh/src/features/carrier-juan/carrier-kpis.{tsx,module.css}`. Frontmatter values are extracted; CSS remains authoritative at runtime.

## Colors

The primary teal identifies actions and current context; white and pale neutral surfaces separate operational records from the canvas.

### Primary

- **CargoMesh teal** (`cm-color-primary`): brand mark, active Tetris navigation, primary operations and evidence links. `cm-color-primary-hover` is the incumbent shared hover token.
- **Focus teal** (`cm-color-focus`): shared product focus token; the observed Tetris focus outline uses the stronger primary color.

### Neutral

- **Workspace canvas** (`cm-color-canvas`): page ground.
- **Record surface** (`cm-color-surface`): controls, comparison and Passport containers.
- **Subtle surface / table tint** (`cm-color-surface-subtle`, `cm-color-surface-tint`): subordinate regions and table headings.
- **Operational ink / muted text** (`cm-color-ink`, `cm-color-muted`): hierarchy between values and their context.
- **Fine line / strong line** (`cm-color-line`, `cm-color-line-strong`): boundaries and control emphasis.
- **Selected surface** (`cm-color-selected`): action hover and selected context.

Positive, warning and danger tokens in the frontmatter are existing semantic product colors. Tetris also has local status colors; those are not replacement global tokens.

**The Shared Palette Rule.** New light product surfaces inherit the CargoMesh V2 tokens. Do not derive a new global palette from one local status or hover override.

## Typography

**Body and interface font:** the shared `cm-font-sans` stack, led by Inter. The source declares this family; this scan does not certify delivery of a font file or the browser's selected fallback.

### Hierarchy

- **Page title:** shared responsive title token in the frontmatter. Tetris has an observed local title (30px, 700, line-height 1.15, letter-spacing -.03em), reduced to 28px below its mobile breakpoint.
- **Section title:** operation sections use 18px; comparison and Passport subheadings use 16px and 14px according to depth.
- **Body:** operation prose and controls use the extracted operation-body role. Supporting form labels and table data commonly use 12px.
- **Compact metric:** the extracted metric role reduces to 28px in the compact component's narrow container; labels and units remain separate.

Quantities use tabular numerals. Missing data is visibly named or shown as an em dash with a contextual description; it does not become zero. Narrow Tetris supporting text is raised to 12px in the observed responsive CSS. Do not promote a one-off small desktop annotation into a new type scale.

## Layout

Shared container limits are wide (100rem), standard (80rem) and form (68rem); the workspace inset is `clamp(16px,2vw,32px)`. These existing tokens describe the product's available container vocabulary, not a mandate to rewrite local layouts.

Tetris uses a centered body with a maximum width of 1488px and 24px horizontal inset. The comparison and evidence column use `minmax(0,1fr) 310px`, narrowing the latter to 270px below 1150px. At 800px they stack and the body inset becomes 18px. The operation's three-column form and group-unit mappings become a single column at that same breakpoint. The header has a further adjustment at 480px.

The reused compact metric component uses container queries (1100px and 460px) and retains a two-by-two grid at its narrowest four-metric layout. These are component container thresholds, not page media breakpoints.

Tables retain readable column widths and scroll inside labeled, keyboard-focusable regions. The mobile comparison has a visible scroll action; the Passport has a visible scroll instruction. Source reference values wrap. The observed layout repeats 20px form gaps and 24px surface insets; there is no global spacing scale to invent here.

**The Internal Scroll Rule.** Keep wide comparison data in its own scroll region so the document remains within the viewport.

## Elevation & Depth

The observed operations surface is predominantly flat: white containers, fine borders and pale selection fills provide hierarchy. Tetris comparison and Passport containers carry no card shadow. The incumbent global shadow vocabulary remains available without being imposed on these surfaces: card (`0 2px 6px rgb(22 51 73 / 3%)`) and panel (`0 1.4rem 4rem rgb(16 45 67 / 16%)`).

The default CarrierKpis variant has its own colored cards, artwork and hover lift. Tetris explicitly uses `variant="compact"`, which removes the artwork, colored fill, radius, shadow and transform. Preserve that distinction; it is an existing component API, not a new motion concept.

## Shapes

Global small, medium and large radii are recorded in the frontmatter. Tetris uses existing local control corners (6px), comparison/Passport corners (10px) and flat, square-edged compact metrics. These local component geometries coexist with the shared radius tokens; they do not redefine them. Fine borders structure records and form groups without decorative separators.

## Components

### Buttons

Tetris operation buttons are labeled native buttons with a minimum height of 44px, a fine border, local control corners and 9px by 13px padding. Secondary controls use the record surface, ink and selected-surface hover. Primary actions use the shared primary color and white text. Disabled controls retain native semantics and visibly lower opacity. The current local primary hover is an implementation variation, not a new shared token.

### Inputs / Fields

Native selects and textareas have associated visible labels, record surfaces, fine borders, 44px minimum height and 9px by 12px padding. Textareas allow vertical resizing and have a 90px minimum height. Validation constraints and busy/error feedback remain in the operation; documentation does not substitute for them.

### Navigation

The white header retains CargoMesh, the current Tetris destination, and the Camiones 3D link. Active navigation uses teal text and a bottom rule. Narrow layouts reduce spacing and omit the extra session caption. The separate footer keeps the 60-truck destination. These observations do not change the truck laboratory.

### Chips / status

Comparison statuses are compact text-bearing labels. The words carry meaning alongside the fill: pending, matched, proposed difference, insufficient evidence, outdated and incompatible scope. Keep uncertainty visible; a colored label alone is insufficient.

### Cards / Containers

Comparison and saved Passport use a white surface, fine outline and local container corners. Comparison clips its outer boundary while its inner region scrolls. Passport preserves version, date, reference, source and review limitations as document content.

### Compact metric

The reused CarrierKpis compact variant separates declared, planned, observed and pending readings. Values, units and source descriptions are distinct; absent plan remains explicit. It is a read-only summary, not a vehicle occupancy visualization.

Focus in Tetris uses a visible primary outline (3px, offset 3px). Its simple button background transition is disabled under reduced motion. The shared brand controls have a separate existing motion vocabulary; no entrance choreography was introduced for this extension.

## Do's and Don'ts

### Do:

- **Do** reuse the shared light CargoMesh palette and declared interface family.
- **Do** retain visible labels, focus treatment and 44px operation controls.
- **Do** keep source versions, units, uncertainty, synthetic origin and human review requirements visible where the operation exposes them.
- **Do** preserve internal table scrolling and the compact metric variant in Tetris.

### Don't:

- **Don't** promote a local status color, hover override or legacy shell palette into a replacement global system.
- **Don't** represent an unavailable quantity as zero, count progress as physical occupancy, or the Passport as delivery confirmation.
- **Don't** treat this scan as authority for a broad redesign or for changing unrelated carrier/truck surfaces.
