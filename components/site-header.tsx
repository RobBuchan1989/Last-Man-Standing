import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="group"
          aria-label="Go to Last Man Standing homepage"
        >
          <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
            Premier League
          </p>

          <h1 className="font-display text-xl font-700 uppercase tracking-tight transition-opacity group-hover:opacity-80">
            Last Man Standing
          </h1>
        </Link>

        <div className="text-right text-xs text-muted-foreground">
          Pick. Win. Survive.
        </div>
      </div>
    </header>
  )
}
