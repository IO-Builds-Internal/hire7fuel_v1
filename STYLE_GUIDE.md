# STYLE GUIDE: Hire7 Fuel Design System

This style guide documents the custom design tokens, typography scales, layout frameworks, and interactive rules used throughout the Hire7 Fuel website redesign.

---

## 1. Color Palette Tokens

All colors are declared in the root scope of the CSS stylesheet (`:root`) as custom properties. They must be referenced exclusively using the `var(--color-name)` syntax.

| Token Name | Hex Value | Purpose & Application |
| :--- | :--- | :--- |
| `--color-primary` | `#0D4F4F` | Core branding color. Used for header banners, hero backgrounds, and footer wrappers. |
| `--color-mid-teal` | `#1A6B6B` | Secondary branding color. Used for alternating section backgrounds and active states. |
| `--color-accent` | `#22C98A` | Vibrant mint green contrast accent. Used for ALL primary CTA buttons, link hovers, and active markers. |
| `--color-highlight` | `#F5A623` | High-visibility amber color. Used for alert banners, trust badges, warnings, and special accents. |
| `--color-seafoam` | `#3ABFA0` | Supporting decorative tone. Used for borders, divider lines, and card accents. |
| `--color-white` | `#FFFFFF` | Core text on dark backgrounds and card surface fills. |
| `--color-near-black` | `#0A1C1C` | Deep high-contrast background tone for extra dark footer widgets and sub-banners. |
| `--color-body-text` | `#333333` | Primary body text for high readability on white and light-teal backdrops. |
| `--color-light-teal` | `#F0F7F7` | Soft, high-contrast, off-white background block style. |

---

## 2. Typography Rules

The typography scale utilizes the modern **Inter** typeface loaded directly from Google Fonts. 

- **Font Family**: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Headings Font Weight**: `600` (SemiBold) or `700` (Bold)
- **Body Font Weight**: `400` (Regular)

### Typography Scale
- **H1 (Hero Main Title)**: `700 Bold`, `56px` (Desktop) / `38px` (Mobile), Line-height: `1.2`
- **H2 (Section Headings)**: `600 SemiBold`, `36px` (Desktop) / `28px` (Mobile), Line-height: `1.3`
- **H3 (Card & Sub Headings)**: `600 SemiBold`, `24px` (Desktop) / `20px` (Mobile), Line-height: `1.4`
- **Body Text**: `400 Regular`, `16px`, Line-height: `1.6`, Color: `#333333` on light bg, `#FFFFFF` on dark bg.
- **Button Call-To-Action**: `600 SemiBold`, `16px`, Line-height: `1`, Letter-spacing: `0.5px`, Color: `#FFFFFF`
- **Caption & Disclaimers**: `400 Regular`, `13px`, Line-height: `1.4`, Color: `#6B7280`

---

## 3. UI Component Standards

### Buttons
All call-to-actions must implement the primary interactive behaviors:
1. **Primary Solid CTA (`.btn-primary`)**:
   - Background: `var(--color-accent)` (Mint Green)
   - Text: `var(--color-white)`
   - Border: None
   - Hover Action: Shift background brightness, add subtle shadow lifting, and apply scale multiplier.
2. **Secondary Outline CTA (`.btn-outline`)**:
   - Background: Transparent
   - Text: `var(--color-white)`
   - Border: `2px solid var(--color-white)`
   - Hover Action: Fill with `var(--color-accent)` and transition border color.

### Interactive Cards
Cards used in the grids (Value Props, Features, and Testimonials):
- Background: `var(--color-white)`
- Border-radius: `12px` (Soft modern rounded corners)
- Padding: `2rem` (Generous inner spacing)
- Transition: `transform 0.2s ease, box-shadow 0.2s ease`
- Hover state: `.card:hover { transform: translateY(-6px); box-shadow: 0 10px 20px rgba(13,79,79,0.1); }`

---

## 4. Keyframe Animations

1. **Hero Mesh Grid Pulse**:
   A multi-colored linear-gradient background animation that flows and shifts.
   ```css
   @keyframes meshGradient {
     0% { background-position: 0% 50%; }
     50% { background-position: 100% 50%; }
     100% { background-position: 0% 50%; }
   }
   ```
2. **Smooth Expand Accordion**:
   FAQ accordions must use `max-height` transitions to glide open smoothly.
   ```css
   .accordion-content {
     max-height: 0;
     overflow: hidden;
     transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;
   }
   ```

---

## 5. Layout Grid & Breakpoints

Standard viewport container layouts:
- **Maximum Container Width**: `1200px` (centered horizontally with `margin: 0 auto; padding: 0 2rem;`)
- **Desktop Breakpoint**: `1200px` (Standard layout grids)
- **Tablet Breakpoint**: `768px` (Adapts grids to 2-columns, switches nav layout)
- **Mobile Breakpoint**: `375px` (Single column stacked grids, mobile slide-out menu)
