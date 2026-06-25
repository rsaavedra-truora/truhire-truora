import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Host Grotesk', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Host Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        // Truora Design System — Atelier tokens
        truora: {
          // Azul violeta scale (brand primary)
          primary:         '#3C1AEA',
          'primary-hover': '#3415CC',
          'primary-active':'#2B11A8',
          'primary-soft':  '#ECE9FD',
          'primary-100':   '#D8D1FB',
          // Neutral / midnight scale
          ink:             '#01022E',
          'ink-muted':     '#6B6E8C',
          'ink-subtle':    '#9598B3',
          // Surfaces
          line:            '#D8DAE9',
          bg:              '#FFFFFF',
          'bg-soft':       '#F4F5FB',
          'bg-canvas':     '#FAFBFF',
          // CTA (naranja — botones, llamadas a la acción)
          cta:             '#EE792F',
          'cta-hover':     '#D96518',
          'cta-active':    '#B05011',
          'cta-soft':      '#FDEFE4',
          // Semantic
          success:         '#15A66A',
          'success-soft':  '#E6F8EF',
          warning:         '#EE792F',
          'warning-soft':  '#FDEFE4',
          danger:          '#E5484D',
          'danger-soft':   '#FDEAEA',
          info:            '#2E84C0',
          'info-soft':     '#EBF6FD',
          // Azul claro (secondary accent)
          lightblue:       '#9BD2F3',
          'lightblue-soft':'#EBF6FD',
          // WhatsApp
          whatsapp:        '#25D366',
          'whatsapp-soft': '#E7FBEF',
        },
        // shadcn compat (uses CSS vars)
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(1, 2, 46, 0.06)',
        sm: '0 2px 6px rgba(1, 2, 46, 0.07)',
        md: '0 6px 18px rgba(1, 2, 46, 0.08)',
        lg: '0 16px 40px rgba(1, 2, 46, 0.10)',
        xl: '0 28px 70px rgba(1, 2, 46, 0.14)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
