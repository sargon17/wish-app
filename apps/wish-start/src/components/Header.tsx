import { Link } from '@tanstack/react-router'
import { HeaderAuth } from '@/providers/AppProviders'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 px-4 backdrop-blur-lg">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-accent/10 text-sm font-semibold text-accent-foreground dark:border-neutral-800">
            Wi
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">Wish</p>
            <p className="text-xs text-muted-foreground">TanStack Start migration</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 text-sm sm:flex">
            <Link
              to="/"
              className="text-muted-foreground no-underline transition-colors hover:text-foreground"
              activeProps={{ className: 'text-foreground' }}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="text-muted-foreground no-underline transition-colors hover:text-foreground"
              activeProps={{ className: 'text-foreground' }}
            >
              Dashboard
            </Link>
          </div>
          <HeaderAuth />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
