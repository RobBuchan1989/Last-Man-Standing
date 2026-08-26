"use client"

import { useState } from "react"

type ShareLeagueProps = {
  leagueCode: string
  leagueName: string
}

export default function ShareLeague({
  leagueCode,
  leagueName,
}: ShareLeagueProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?league=${encodeURIComponent(
          leagueCode
        )}`
      : `/?league=${encodeURIComponent(
          leagueCode
        )}`

  const shareText = `Join my Last Man Standing league "${leagueName}"!`

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(
        leagueCode
      )

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      window.prompt(
        "Copy your league code:",
        leagueCode
      )
    }
  }

  async function shareLeague() {
    if (
      typeof navigator !== "undefined" &&
      navigator.share
    ) {
      try {
        await navigator.share({
          title: "Last Man Standing",
          text: shareText,
          url: shareUrl,
        })

        return
      } catch {
        return
      }
    }

    await copyLink()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        shareUrl
      )

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      window.prompt(
        "Copy this league invite link:",
        shareUrl
      )
    }
  }

  const whatsappUrl =
    `https://wa.me/?text=${encodeURIComponent(
      `${shareText}\n\n${shareUrl}`
    )}`

  return (
    <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
      <div className="text-sm font-bold tracking-[0.25em] text-green-400">
        INVITE PLAYERS
      </div>

      <div className="mt-2 text-xl font-black">
        Share your league
      </div>

      <p className="mt-2 text-slate-400">
        Send this league to your friends so they can join.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={copyCode}
          className="flex-1 rounded-xl border border-white/10 bg-[#202733] px-4 py-3 font-black text-white hover:border-green-400"
        >
          {copied ? "✓ COPIED" : "COPY CODE"}
        </button>

        <button
          type="button"
          onClick={shareLeague}
          className="flex-1 rounded-xl bg-green-400 px-4 py-3 font-black text-[#07110b] hover:bg-green-300"
        >
          SHARE LEAGUE
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 font-black text-white hover:opacity-90"
        >
          WHATSAPP
        </a>
      </div>

      <div className="mt-4 rounded-xl bg-[#0e141d] p-4">
        <div className="text-xs font-bold tracking-[0.2em] text-slate-500">
          LEAGUE CODE
        </div>

        <div className="mt-1 text-2xl font-black tracking-wider text-white">
          {leagueCode}
        </div>
      </div>
    </div>
  )
}
