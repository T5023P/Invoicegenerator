---
name: Studio Protocol
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5d5e60'
  on-secondary: '#ffffff'
  secondary-container: '#dfdfe0'
  on-secondary-container: '#616364'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e2e2e3'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1d'
  on-secondary-fixed-variant: '#454748'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  invoice-title:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  invoice-body:
    fontFamily: Source Serif 4
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  headline-md-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for the high-performing independent professional. It embodies a **Professional Minimalist** aesthetic—prioritizing clarity, intentionality, and high-end utility. The interface acts as a "digital vellum," providing a quiet, focused environment that recedes to let the user's work and financial data take center stage. 

The emotional response should be one of "calm control." By utilizing expansive whitespace and a rigorous grid, the design system eliminates the visual noise typically associated with administrative portals, transforming operational tasks into a refined, editorial experience.

## Colors
The palette is built on a foundation of "Elevated Neutrals." The primary background is a stark, clean white, supported by slate grays for structural elements. 

- **Primary Canvas:** High-contrast black (#1A1A1A) on white for maximum legibility.
- **Functional Accents:** Vibrant, high-chroma colors are reserved strictly for status communication to ensure immediate cognitive recognition:
    - **In Review:** A sharp, urgent red.
    - **In Progress:** A warm, industrious amber.
    - **Completed:** A deep, stable forest green.
- **Surface Tones:** Soft zinc and slate grays are used for secondary surfaces and borders to maintain a sophisticated, non-distracting environment.

## Typography
The typographic hierarchy utilizes a dual-persona approach:
1.  **System UI:** Uses **Hanken Grotesk** for its sharp, contemporary geometry. It feels efficient and modern. **JetBrains Mono** is employed for small metadata and status labels to evoke the precision of a workspace.
2.  **Document Preview:** For invoices and contracts, the system switches to **Source Serif 4**. This transition provides a tactile, "printed" feel that communicates authority and professional tradition.

All headers use tighter letter-spacing for a "locked-in" look, while body text remains open for readability.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Content is contained within a centered 1280px container on desktop to prevent eye strain. 

- **The 8px Grid:** All margins, paddings, and height increments are multiples of 8px.
- **Structural Rhythm:** Use generous 40px margins on the outer canvas to create a "gallery" effect for the dashboard cards.
- **Responsive Behavior:** On mobile, margins compress to 16px and the 12-column grid collapses into a single vertical stack. Subtle 1px borders replace wide gutters to maintain structure in tight spaces.

## Elevation & Depth
Depth in this design system is communicated through **Tonal Layering** rather than heavy shadows.

- **Level 0 (Canvas):** The base background.
- **Level 1 (Cards):** Pure white surfaces with a 1px soft border (#E4E4E7). A very diffuse, 4% opacity shadow is applied only to indicate interactivity.
- **Level 2 (Modals):** Floating elements use a more pronounced ambient shadow (12% opacity) and a backdrop blur of 8px to isolate the focus area.
- **Active States:** Elements being "dragged" or actively engaged with increase in shadow spread and scale slightly (1.02x) to mimic a physical lift from the paper.

## Shapes
The shape language is **Soft and Structural**. 
- **Standard Radius:** Elements use a 0.25rem (4px) radius to maintain a crisp, professional edge without feeling "sharp" or aggressive.
- **Large Components:** Cards and main containers use a 0.5rem (8px) radius to distinguish them as primary content carriers.
- **Buttons:** Buttons follow the standard 4px radius; pill-shapes are avoided to maintain the "architectural" integrity of the workspace.

## Components
- **The 'Magic' Button:** The primary call-to-action. High-contrast (Black background, White text), 0.25rem radius, and a subtle "inner-glow" border for a premium feel.
- **Status Badges:** Use a "Light-on-Dark" or "Ghost" style. A faint tinted background of the status color with high-contrast text and a left-aligned 6px dot of the status color.
- **Interactive Cards:** White background, 1px border. On hover, the border darkens to #A1A1AA and the shadow increases by 2px.
- **Input Fields:** Minimalist design with only a bottom border in a neutral state, transitioning to a full 1px border on focus. No drop shadows.
- **Data Lists:** High-density, separated by 1px horizontal dividers. Text alternates between Hanken Grotesk (Primary data) and JetBrains Mono (Metadata).
- **Invoice Preview:** A special container that mimics an A4 sheet. It features a slight vertical gradient to simulate paper texture and uses the Source Serif 4 typeface exclusively.