"use client"

import { useState } from "react"

export default function PlayerRecoverySection() {
  const [open, setOpen] = useState(false)

  return (
    <section className="mt-10 border-t border-white/10 pt-5 pb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-3 text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 text-slate-500" aria-hidden="true">♧</span>
          <span>
            <span className="block text-sm font-semibold text-slate-300">
              Already playing? Recover access
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Help getting back into an existing player entry.
            </span>
          </span>
        </span>
        <span className="shrink-0 text-slate-500" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/10 bg-[#101720] p-4 sm:p-5">
          <div className="text-sm font-semibold text-slate-200">
            Recover your player entry
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Recovery is being added so you can reconnect to your existing entry on a new device without losing your picks or history. Your name alone will never be enough to access another player's entry.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            If you need access restored right now, contact your league administrator. Please don't create a second entry using a different name.
          </p>
        </div>
      )}
    </section>
  )
}
