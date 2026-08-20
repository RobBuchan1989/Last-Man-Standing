"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { joinGameAction } from "@/app/actions/game"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const RULES = [
  "Each round, pick one Premier League team.",
  "That team must WIN. A draw or a loss knocks you out.",
  "You can never pick the same team twice.",
  "Survive every round the crowd thins out.",
  "The last manager standing wins it all.",
]

export function JoinGame({
  gameName,
  round,
  defaultName,
}: {
  gameName: string
  round: number
  defaultName: string
}) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleJoin = () => {
    setError(null)
    startTransition(async () => {
      const res = await joinGameAction(name)
      if (res?.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">{gameName}</p>
        <h1 className="mt-1 font-display text-3xl font-700 uppercase leading-none tracking-tight text-balance">
          Join the survival pool
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Currently on Round {round}. Enter your manager name to take your seat.
        </p>

        <ol className="mt-6 flex flex-col gap-3">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-600 text-primary">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-foreground">{rule}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <Label htmlFor="displayName">Manager name</Label>
          <Input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Your name in the standings"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={handleJoin}
          disabled={pending}
          className="mt-4 w-full font-display text-base uppercase tracking-wide"
        >
          {pending ? "Joining..." : "Take my seat"}
        </Button>
      </div>
    </main>
  )
}
