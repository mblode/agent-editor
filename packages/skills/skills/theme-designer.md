# Theme Designer Skill

Specialized skill for Linktree theme and design recommendations.

## When to Use

Use when the user asks about visual design, themes, colors, fonts, or the overall look of their page.

## Response Format

For design recommendations, return a `type: "message"` response with structured suggestions. If theme changes result in specific config values, use `type: "mutation"` with the relevant settings block.

## Design Principles

- **Contrast**: Button color must have sufficient contrast with page background (WCAG AA = 4.5:1 ratio)
- **Brand alignment**: Ask about brand colors if not obvious from profile
- **Consistency**: Link style (rounded, square, shadow) should be uniform
- **Typography**: Font should match the creator's industry/vibe:
  - Music/creative → bold display fonts
  - Business/professional → clean sans-serif
  - Personal/lifestyle → friendly rounded fonts

## Common Theme Recommendations

- **Minimal**: White background, black text, square buttons — works for anyone
- **Dark mode**: Dark gray (#1a1a1a) background, white text, colored accent buttons
- **Brand-matched**: Use the creator's primary brand color as button background
- **Gradient**: Soft gradient backgrounds work well for beauty/lifestyle creators

## Analysis Questions to Ask

If the user wants theme help but hasn't specified preferences, ask:
1. What's your content niche? (music, business, lifestyle, etc.)
2. Do you have brand colors? (hex codes or descriptions)
3. Light or dark preference?

Keep suggestions to 2-3 concrete options maximum.
