"use client"

import { useState } from "react"

type ShareLeagueButtonProps = {
  leagueName: string
  leagueCode: string
}

export default function ShareLeagueButton({
  leagueName,
  leagueCode,
}: ShareLeagueButtonProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    `https://www.lastmanstandingpl.com/?league=${encodeURIComponent(
      leagueCode
    )}`

  async function handleShare() {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.share
      ) {
        await navigator.share({
          title: `Join ${leagueName}`,
          text: `Join my Last Man Standing league: ${leagueName}`,
          url: shareUrl,
        })

        return
      }

      await navigator.clipboard.writeText(
        shareUrl
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch {
      // User cancelled the native share dialog.
      // Do nothing.
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        shareUrl
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center justify-center gap-2 rounded-xl bg-green-400 px-5 py-3 font-black text-[#07110b] transition hover:bg-green-300"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>

        SHARE LEAGUE
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#202733] px-5 py-3 font-black text-white transition hover:border-green-400"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <rect
            width="14"
            height="14"
            x="8"
            y="8"
            rx="2"
            ry="2"
          />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>

        {copied ? "LINK COPIED!" : "COPY LINK"}
      </button>
    </div>
  )
}
