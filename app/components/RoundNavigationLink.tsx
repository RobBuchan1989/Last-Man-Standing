"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

type Props = {
  href: string
  label: string
  loadingLabel: string
  className: string
  trailing?: string
}

export default function RoundNavigationLink({
  href,
  label,
  loadingLabel,
  className,
  trailing,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function navigate() {
    if (isPending) return

    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <button
      type="button"
      onClick={navigate}
      disabled={isPending}
      aria-live="polite"
      aria-busy={isPending}
      className={`${className} ${isPending ? "cursor-wait opacity-80" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {isPending && (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 animate-spin"
            fill="none"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        <span>{isPending ? loadingLabel : label}</span>
      </span>
      {!isPending && trailing && <span aria-hidden="true" className="text-lg">{trailing}</span>}
      {isPending && <span className="text-xs font-bold uppercase tracking-wider">Loading…</span>}
    </button>
  )
}
