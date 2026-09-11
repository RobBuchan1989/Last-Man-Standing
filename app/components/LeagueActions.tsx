"use client"

import { useState } from "react"

type Props = {
  leagueName: string
  leagueCode: string
  action: "share" | "copy"
}

export default function LeagueActions({
  leagueName,
  leagueCode,
  action,
}: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : ""

  const handleClick = async () => {
    const url =
      shareUrl ||
      `${window.location.origin}/?league=${encodeURIComponent(leagueCode)}`

    if (action === "share") {
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Last Man Standing",
            text: `Join my Last Man Standing league: ${leagueName}`,
            url,
          })
          return
        }

        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      } catch {
        // Sharing can be cancelled by the user.
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex min-h-[64px] w-full min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-[11px] font-black leading-tight transition sm:min-h-[72px] sm:text-sm ${
        action === "share"
          ? "bg-green-400 text-[#07110b] hover:bg-green-300"
          : "border border-white/10 bg-[#202733] text-white hover:border-green-400"
      }`}
    >
      {action === "share" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
        >
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}

      <span className="truncate">
        {action === "share"
          ? copied
            ? "COPIED"
            : "SHARE LEAGUE"
          : copied
            ? "COPIED"
            : "COPY LINK"}
      </span>
    </button>
  )
}
