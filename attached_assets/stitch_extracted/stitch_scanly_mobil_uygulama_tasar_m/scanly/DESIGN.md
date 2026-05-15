---
name: Scanly
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#555c6a'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e7583'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#dce2f3'
  tertiary-fixed-dim: '#c0c7d6'
  on-tertiary-fixed: '#151c27'
  on-tertiary-fixed-variant: '#404754'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
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
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  button-text:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 4px
  grid-margin: 20px
  grid-gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  section-padding: 32px
---

## Brand & Style
The design system is engineered for a premium document scanning experience that balances professional utility with high-end aesthetic refinement. The brand personality is **trustworthy, efficient, and precise**, catering to business professionals and students who require a tool that feels like a piece of high-quality stationery rather than a toy.

The visual style is **Modern Minimalism**. It relies on expansive whitespace to reduce cognitive load during document management. The interface utilizes high-quality typography and a sophisticated emerald accent to signal growth and reliability. Every interaction should feel instantaneous and intentional, reflecting a "pro-grade" productivity tool.

## Colors
The palette is rooted in a "Clean & Professional" philosophy. 

- **Primary (#059669):** A deep, professional emerald green used for primary actions, success states, and brand highlights. It conveys stability and digital precision.
- **Secondary (#111827):** A dark slate for primary text and high-contrast UI elements, providing better readability and a more premium feel than pure black.
- **Tertiary (#6B7280):** A medium gray reserved for secondary information, metadata, and placeholder text.
- **Neutral (#F8F9FA):** A soft off-white used for background layering to prevent eye strain and distinguish the "paper" of the scanned documents from the application UI.

## Typography
The design system uses **Inter** for its exceptional legibility and neutral, modern character. The hierarchy is strictly enforced to guide the user's eye through complex document lists and scanning workflows. 

**Turkish Language Considerations:**
- Ensure line heights accommodate Turkish descenders and diacritics (ç, ğ, ı, ö, ş, ü).
- All caps should be avoided for long strings to ensure the dot on the 'İ' remains legible.
- Headings use a tighter letter-spacing for a more editorial, premium appearance.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model optimized for mobile viewport constraints.

- **Margin:** A 20px outer margin ensures content does not feel cramped against the device edges.
- **Gutter:** 16px spacing between cards and functional elements.
- **Rhythm:** All vertical spacing follows a 4px baseline, with 16px and 24px being the most frequent increments to create a sense of "Airy Professionalism."
- **Safe Areas:** On mobile, critical actions (like the 'Scan' button) are anchored to the bottom-center with a 32px safe-area offset.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Ambient Shadows**. 

1. **Base:** Background color (#F8F9FA).
2. **Surface:** Cards and sheets use pure White (#FFFFFF).
3. **Shadows:** Use extremely soft, diffused shadows with a 10% opacity of the Secondary color. This "Low-Contrast Shadow" approach makes elements feel like they are resting lightly on the surface rather than floating high above it.
4. **Outlines:** A thin 1px border (#E5E7EB) is used on input fields and secondary cards to provide structure without the heaviness of shadows.

## Shapes
The shape language is **Rounded**, leaning towards a high-end, modern look.

- **Standard Elements:** 16px (1rem) for buttons and small cards.
- **Large Containers:** 24px (1.5rem) for document preview cards and bottom sheets.
- **Interactive States:** Subtle scale-downs (98%) on press to simulate physical feedback.

## Components

- **Buttons:** Primary buttons use the Emerald fill with white text. Secondary buttons use a transparent background with a thin slate border. Both use 16px corner radius.
- **Document Cards:** White background, 24px radius, soft shadow. Displays a thumbnail, Turkish document title ("Belge Adı"), and date.
- **Scanning HUD:** A minimal dark overlay with a semi-transparent viewfinder. Instructions appear in high-contrast white text at the top.
- **Input Fields:** 12px rounded corners, #F8F9FA background, and a 1px border that turns Emerald on focus. Labels use Turkish terminology (e.g., "Dosya Adı", "Kategori").
- **Chips:** For document tags (e.g., "Fatura", "Sözleşme"). Small 8px radius, light gray background with medium gray text.
- **Action Menu (Bottom Sheet):** High-radius top corners (32px), containing list items with icons for sharing, renaming ("Yeniden Adlandır"), and deleting ("Sil").