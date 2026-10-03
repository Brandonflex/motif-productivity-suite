import animate from 'tailwindcss-animate'

/** Maps a design token (defined in src/styles/tokens.css) to a Tailwind colour. */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`

/**
 * Motif design system.
 *
 * The colour names below are the contract shared with `@blinkdotnew/ui`: the
 * component library emits utilities such as `bg-background`, `text-muted-foreground`
 * or `ring-ring`, and the values come from the CSS variables in
 * `src/styles/tokens.css` (light + dark themes).
 *
 * `content` must include the published library bundle or those utilities are
 * purged from the build and every library component renders unstyled.
 */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@blinkdotnew/ui/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        // Status colours — used by badges, charts and the activity feed.
        success: {
          DEFAULT: token('success'),
          foreground: token('success-foreground'),
        },
        warning: {
          DEFAULT: token('warning'),
          foreground: token('warning-foreground'),
        },
        info: {
          DEFAULT: token('info'),
          foreground: token('info-foreground'),
        },
        // Editorial brand colour: decorative fills, icons, chart strokes.
        brand: {
          DEFAULT: token('brand'),
          foreground: token('brand-foreground'),
        },
        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
          accent: token('sidebar-accent'),
          'accent-foreground': token('sidebar-accent-foreground'),
          border: token('sidebar-border'),
          ring: token('sidebar-ring'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
      },
      boxShadow: {
        // Card elevation used by the component library.
        card: '0 1px 2px 0 hsl(var(--foreground) / 0.04), 0 1px 3px 0 hsl(var(--foreground) / 0.06)',
      },
    },
  },
  plugins: [animate],
}
