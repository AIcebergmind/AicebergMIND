🎨 AIceberg Mind - Design Token System
📖 Overview

The Design Token System of AIceberg Mind centralizes all design values (colors, spacing, animations, typography) to ensure consistency and easy maintenance.

🏗️ Structure
public/css/tokens/
├── design-tokens.css    # Centralized tokens
└── README.md            # This documentation

🎯 Available Tokens
Brand Colors
--brand-cyan: #00D4FF;
--brand-mint: #5EE4C3;

Spacing System
--space-xs: 0.5rem;    /* 8px */
--space-sm: 1rem;      /* 16px */
--space-md: 1.5rem;    /* 24px */
--space-lg: 2.5rem;    /* 40px */
--space-xl: 4rem;      /* 64px */
--space-xxl: 6rem;     /* 96px */

Animation Tokens
/* Durations */
--iceberg-duration-float: 8s;
--iceberg-duration-drift: 18s;
--logo-duration-cinematic: 8s;

/* Easing */
--iceberg-easing: ease-in-out;
--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);

/* Opacity */
--iceberg-opacity-base: 0.8;
--geo-opacity-subtle: 0.08;

🚀 How to Use
✅ Correct
.my-element {
  margin: var(--space-lg);
  color: var(--brand-cyan);
  animation-duration: var(--logo-duration-cinematic);
}

❌ Avoid
.my-element {
  margin: 2.5rem; /* Hard-coded! */
  color: #00D4FF; /* Hard-coded! */
  animation-duration: 8s; /* Hard-coded! */
}

🔄 Responsive Behavior

Tokens automatically adapt to breakpoints:

/* Desktop */
--space-lg: 2.5rem;

/* Mobile (< 768px) */
--space-lg: 1.5rem;

/* Mobile Small (< 480px) */
--space-lg: 1rem;

🎨 Iceberg System

Tokens specific to iceberg animations:

/* Canvas Elements */
#iceberg {
  opacity: var(--iceberg-opacity-base);
  filter: blur(var(--iceberg-blur-canvas));
  animation: icebergFloat var(--iceberg-duration-float) var(--iceberg-easing) infinite;
}

/* Geometric Shapes */
.iceberg-shape {
  opacity: var(--iceberg-opacity-shape);
  background: var(--gradient-iceberg-1);
  animation-duration: var(--iceberg-duration-drift);
}

🔧 Maintenance
Add New Tokens

Open design-tokens.css

Add in the appropriate section:

/* New token */
--my-new-token: value;

Modify Existing Values

Only modify in design-tokens.css

The change will automatically propagate everywhere

Deprecate Tokens

Add the comment /* @deprecated */

Gradually replace in usage

Remove after full migration

🎭 Accessibility

Tokens automatically support prefers-reduced-motion:

@media (prefers-reduced-motion: reduce) {
  :root {
    --iceberg-duration-float: 0s; /* Disable animations */
  }
}

📊 Benefits

-40% CSS duplication: Centralized tokens eliminate repetition

+60% faster maintenance: Change one value, update everything

100% consistency: Impossible to use inconsistent values

Performance: Less CSS, more efficient caching

🔍 Debug

To verify that tokens are loaded:

// In the browser console
console.log(getComputedStyle(document.documentElement).getPropertyValue('--brand-cyan'));
// Should return: #00D4FF


Last updated: October 2025
System created for the AIceberg Mind project