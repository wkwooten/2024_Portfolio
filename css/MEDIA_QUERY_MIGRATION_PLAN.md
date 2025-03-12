# Media Query Migration Plan

This document outlines the plan for consolidating our current media queries into a simplified 3-breakpoint system.

## New Breakpoint System

We are moving from 5 breakpoints to 3 breakpoints:

**Current System:**
- Mobile: `max-width: 480px`
- Small tablets: `max-width: 768px`
- Tablets/medium screens: `max-width: 900px`
- Larger screens: `max-width: 62.5rem` (1000px)
- Desktop: `min-width: 992px`

**New System:**
- **Mobile**: `max-width: 600px` (small devices and phones)
- **Tablet**: `max-width: 1000px` (tablets and small laptops)
- **Desktop**: `min-width: 1001px` (large screens and desktops)

## Migration Process

### 1. Feature Detection Queries (No Change)

Keep these at the top of the media.css file:
- `prefers-color-scheme: dark`
- `prefers-reduced-motion: reduce`

### 2. Mobile Styles (`max-width: 600px`)

Consolidate styles from:
- Current `max-width: 480px`
- Some styles from `max-width: 768px` that are specifically for very small screens

**Migration Steps:**
1. Create a new section: `/* Mobile Styles */`
2. Copy all styles from the current `max-width: 480px` section
3. Review styles in the `max-width: 768px` section and move any that are specifically for small screens
4. Test thoroughly on small devices (phones, small tablets)

### 3. Tablet Styles (`max-width: 1000px`)

Consolidate styles from:
- Remaining styles from `max-width: 768px`
- All styles from `max-width: 900px`
- All styles from `max-width: 62.5rem` (1000px)

**Migration Steps:**
1. Create a new section: `/* Tablet Styles */`
2. Start with styles from `max-width: 62.5rem` as the base
3. Add styles from `max-width: 900px` that aren't already covered
4. Add remaining styles from `max-width: 768px` that weren't moved to mobile
5. Resolve any conflicts by prioritizing the styles from smaller breakpoints
6. Test thoroughly on tablets and small laptops

### 4. Desktop Styles (`min-width: 1001px`)

Consolidate styles from:
- Current `min-width: 992px`
- Any desktop-specific overrides

**Migration Steps:**
1. Create a new section: `/* Desktop Styles */`
2. Copy all styles from the current `min-width: 992px` section
3. Adjust the breakpoint from 992px to 1001px
4. Test thoroughly on desktop screens

## Implementation Checklist

1. **Backup Current CSS Files**
   - Create backups of all CSS files before making changes

2. **Update media.css**
   - Reorganize according to the new breakpoint system
   - Ensure all media queries follow the new structure
   - Remove redundant styles

3. **Update Component Files**
   - Move any component-specific media queries to media.css unless they meet the exception criteria
   - Update any inline media queries in HTML files to use the new breakpoints

4. **Testing**
   - Test on multiple devices at various screen sizes
   - Pay special attention to the transition points between breakpoints
   - Verify that all components display correctly at all breakpoints

5. **Documentation**
   - Update the style guide to reflect the new breakpoint system
   - Document any components that have special responsive behavior

## Common Issues to Watch For

1. **Layout Shifts**
   - Watch for unexpected layout shifts at the new breakpoint boundaries
   - Pay special attention to the 600px-768px range, which is now part of the mobile breakpoint

2. **Specificity Conflicts**
   - When consolidating styles, be aware of specificity conflicts
   - Use the cascade to your advantage by ordering styles appropriately

3. **Redundant Styles**
   - Look for and remove redundant styles that may have been duplicated across breakpoints
   - Ensure that styles aren't unnecessarily overridden

4. **Component-Specific Breakpoints**
   - Identify any components that might need specific breakpoints outside the main system
   - Document these exceptions clearly

## Example Media Query Structure

```css
/* ==========================================================================
   Media Queries and Responsive Styles
   ========================================================================== */

/* Feature Detection Queries */
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}

@media screen and (prefers-reduced-motion: reduce) {
  /* Reduced motion styles */
}

/* Mobile Styles - max-width: 600px */
@media screen and (max-width: 600px) {
  /* Mobile styles */
}

/* Tablet Styles - max-width: 1000px */
@media screen and (max-width: 1000px) {
  /* Tablet styles */
}

/* Desktop Styles - min-width: 1001px */
@media screen and (min-width: 1001px) {
  /* Desktop styles */
}

/* Animation Keyframes */
@keyframes example {
  /* Animation keyframes */
}
```

## Timeline

1. **Phase 1: Planning and Analysis** (1-2 days)
   - Review all current media queries
   - Identify styles to be consolidated
   - Create detailed migration plan

2. **Phase 2: Implementation** (2-3 days)
   - Update media.css with new breakpoint structure
   - Consolidate styles according to plan
   - Initial testing

3. **Phase 3: Testing and Refinement** (1-2 days)
   - Comprehensive testing across devices
   - Fix any issues
   - Final adjustments

4. **Phase 4: Documentation and Finalization** (1 day)
   - Update documentation
   - Final review
   - Deploy changes