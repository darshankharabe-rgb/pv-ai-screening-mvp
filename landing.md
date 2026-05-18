---
name: Clinical Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#2559bd'
  primary: '#00327d'
  on-primary: '#ffffff'
  primary-container: '#0047ab'
  on-primary-container: '#a5bdff'
  inverse-primary: '#b1c5ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#1a12af'
  on-tertiary: '#ffffff'
  tertiary-container: '#3636c5'
  on-tertiary-container: '#b7b8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#00419e'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-md:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is built for the rigorous environment of scientific and medical research. The brand personality is clinical, authoritative, and hyper-efficient, prioritizing the clarity of information over decorative elements. The visual style is **Corporate / Modern** with a strong influence from **Minimalism**, ensuring that the interface never competes with the data it presents.

The UI should evoke a sense of calm reliability and absolute accuracy. By utilizing high-quality whitespace and a restricted color palette, we guide the researcher's focus toward critical discoveries and longitudinal data. The dynamic nature of the system is reflected in its responsive density—tight where data is heavy, but expansive where focus and analysis are required.

## Colors

The color strategy for this design system is rooted in a "Clean Clinical" aesthetic. 

- **Primary (Clinical Blue):** A deep, authoritative blue used for primary navigation, headers, and focus states. It conveys trust and stability.
- **Secondary (Emerald Green):** Reserved exclusively for positive outcomes, successful validations, and "Add" actions. It provides a clear, non-distracting semantic signal.
- **Surface & Backgrounds:** We use a hierarchy of whites (`#FFFFFF`) and very light cool grays (`#F8FAFC`, `#F1F5F9`) to define content areas without the need for heavy borders.
- **Accents:** Tertiary indigo is used sparingly for data visualization or secondary interactive elements to provide depth to multi-layered charts.

## Typography

We employ **Inter** across all levels of the design system for its exceptional legibility in technical contexts and its comprehensive glyph support for scientific notation.

- **Headlines:** Use tight tracking and semi-bold weights to anchor page sections. 
- **Body:** Standardized at 14px for optimal data density. For long-form research papers or methodology descriptions, use `body-lg`.
- **Labels:** Small caps or uppercase labels are used for table headers and metadata to distinguish them from editable data.
- **Technical Data:** When displaying genomic sequences, formulas, or raw code, switch to a monospaced font like JetBrains Mono to ensure character alignment.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop dashboards to maintain a constant "lab-bench" environment where tools are always in the same place.

- **Grid System:** A 12-column grid with a 1440px max-width container. 
- **Margins:** Page margins are set to 40px (`xl`) on desktop to provide breathing room around dense data tables. 
- **Density:** This design system utilizes a variable density model. Navigation and top-level headers use `lg` spacing, while data-entry forms and results tables utilize `sm` and `xs` spacing to maximize the information visible above the fold.
- **Breakpoints:** Content reflows at 1024px (Tablet) and 480px (Mobile), shifting from multi-column sidebars to collapsible drawers.

## Elevation & Depth

To maintain a professional, clinical feel, this design system avoids heavy shadows. Instead, it uses **Tonal Layers** supplemented by **Low-contrast Outlines**.

- **Surface Levels:** The base background is light gray (`#F8FAFC`). Primary content containers (cards, data tables) are pure white (`#FFFFFF`) with a 1px border in `#E2E8F0`.
- **Shadows:** Use only one type of shadow—an ambient "Micro-depth" shadow (0px 1px 3px rgba(0,0,0,0.05))—to lift active elements like dropdowns or hovering cards.
- **Interaction:** Hover states should be indicated by subtle shifts in background color (e.g., White to #F1F5F9) rather than increasing shadow depth.

## Shapes

The shape language is **Soft (Level 1)**. We use a 4px (0.25rem) base radius for buttons, input fields, and small UI components. 

Large containers and cards may use `rounded-lg` (8px/0.5rem). This subtle rounding retains a sense of precision and "instrument-like" quality, avoiding the overly playful feel of highly rounded or pill-shaped designs. It maintains a structured, modular aesthetic suitable for scientific software.

## Components

- **Buttons:** Primary buttons use Clinical Blue with white text. Positive actions (e.g., "Confirm Test," "Save Result") use Emerald Green. Ghost buttons with 1px borders are preferred for secondary laboratory actions.
- **Data Tables:** These are the heart of the design system. Use a 32px row height for high density. Alternate row striping is not needed; use 1px horizontal dividers instead. Headers must be sticky.
- **Input Fields:** Use a subtle inset shadow or 1px border. Focus states must be a clear 2px Primary Blue ring. Labels should be positioned above the field, never inside as placeholders.
- **Chips/Status Tags:** Use a light tinted background with dark text (e.g., "Complete" status uses a light green background with dark emerald text).
- **Cards:** Used for grouping related metrics. Cards should have no shadow by default, relying on a `#E2E8F0` border to define their boundary.
- **Progress Bars:** Use a thin 4px height for non-intrusive loading of large datasets.