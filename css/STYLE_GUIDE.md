# CSS Style Guide

A concise guide to maintaining consistent, accessible, and maintainable CSS.

## Core Principles

- **Use variables** for colors, spacing, typography, and other design tokens
- **Keep selectors simple** - avoid deep nesting and excessive specificity
- **Place media queries in media.css** unless there's a specific reason not to
- **Prioritize accessibility** in all styling decisions
- **Comment meaningfully** - keep comments minimal and focus on the overall class rather than every single line.

## CSS Organization

CSS is organized in this order of imports:

1. `variables.css` → 2. `base.css` → 3. `components.css` → 4. `pull-tabs.css` → 5. `pages.css` → 6. `experiments.css` → 7. `media.css`

*There should be no selectors in the main.css file. This page is purely for collecting css into one file.

## Variables First

```css
/* DO THIS */
.button {
  background-color: var(--button-primary);
  padding: var(--space-s);
  font-size: var(--fs-0);
}

/* NOT THIS */
.button {
  background-color: #1a73e8;
  padding: 1.125rem;
  font-size: 1rem;
}
```

## Selector Best Practices

- Target classes rather than elements when possible
- Avoid IDs for styling and `!important` unless absolutely necessary
- Keep specificity low (no more than 3 levels deep)
- Be as specific as needed, but no more

```css
/* GOOD */
.nav_item.active {
  font-weight: bold;
}

/* AVOID */
#navigation ul li.nav_item.active {
  font-weight: bold !important;
}
```

## Media Queries

- **Centralize in media.css** - All responsive styles belong here
- **Use our 3-breakpoint system**:
  - **Mobile**: `max-width: 600px` (small devices and phones)
  - **Tablet**: `max-width: 1000px` (tablets and small laptops)
  - **Desktop**: `min-width: 1001px` (large screens and desktops)
- **Feature detection queries** should be placed before breakpoints:
  - `prefers-color-scheme: dark`
  - `prefers-reduced-motion: reduce`
- **Group related styles** within the same media query block
- **Comment media queries** with descriptive headers

```css
/* Mobile Styles */
@media screen and (max-width: 600px) {
  /* Your mobile styles here */
}

/* Tablet Styles */
@media screen and (max-width: 1000px) {
  /* Your tablet styles here */
}

/* Desktop Styles */
@media screen and (min-width: 1001px) {
  /* Your desktop styles here */
}
```

Exceptions: Component-specific media queries may be included in component files only when the component is self-contained, dynamically loaded, or developed as a standalone module.

## Accessibility Essentials

- Ensure sufficient **color contrast** (WCAG AA minimum)
- Provide visible **focus states** for all interactive elements
- Respect **prefers-reduced-motion** preferences
- Maintain readable **text sizes** and appropriate **line heights**

## Performance Tips

- Animate only `transform` and `opacity` properties when possible
- Use `will-change` sparingly
- Avoid universal selectors (`*`) in complex selectors

## Effective Comments

```css
/* GOOD */
/* Increased specificity needed to override third-party styles */
.custom_form .input {
  border: none;
}

/* AVOID */
/* This sets the border to none */
.custom_form .input {
  border: none;
}
```

Use section comments to organize code:

```css
/* ==========================================================================
   Component Name
   ========================================================================== */
```