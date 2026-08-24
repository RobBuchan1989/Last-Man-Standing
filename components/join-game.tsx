"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createLeagueAction,
  joinGameAction,
} from "@/app/actions/game"
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
  competitionCode,
}: {
  gameName: string
  round: number
  defaultName: string
  competitionCode?: string
}) {
  const router = useRouter()

  const [name, setName] = useState(defaultName)
  const [leagueName, setLeagueName] = useState("")
  const [joinCode, setJoinCode] = useState(
    competitionCode || ""
  )

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [pending, startTransition] = useTransition()

  const handleJoin = () => {
    setError(null)
    setNotice(null)

    startTransition(async () => {
      const code =
        joinCode.trim().toUpperCase() || undefined

      const res = await joinGameAction(
        name,
        code
      )

      if (res?.error) {
        setError(res.error)
        return
      }

      router.push(
        code
          ? `/?league=${encodeURIComponent(code)}`
          : "/"
      )

      router.refresh()
    })
  }

  const handleCreateLeague = () => {
    setError(null)
    setNotice(null)

    startTransition(async () => {
      const res = await createLeagueAction(
        leagueName,
        name
      )

      if (res?.error) {
        setError(res.error)
        return
      }

      if (!res?.code) {
        setError(
          "The league was created but no join code was returned."
        )
        return
      }

      // Show the code briefly while redirecting.
      setNotice(
        `League created! Your join code is ${res.code}.`
      )

      router.push(
        `/?league=${encodeURIComponent(res.code)}`
      )

      router.refresh()
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-lg border border-border bg-card p-6">

        <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
          {gameName}
        </p>

        <h1 className="mt-1 font-display text-3xl font-700 uppercase leading-none tracking-tight text-balance">
          Join the survival pool
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Currently on Round {round}. Enter your manager name to take your seat.
        </p>

        <ol className="mt-6 flex flex-col gap-3">
          {RULES.map((rule, i) => (
            <li
              key={i}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-600 text-primary">
                {i + 1}
              </span>

              <span className="text-sm leading-relaxed text-foreground">
                {rule}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <Label htmlFor="displayName">
            Manager name
          </Label>

          <Input
            id="displayName"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            maxLength={40}
            placeholder="Your name in the standings"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="leagueCode">
            League join code
          </Label>

          <Input
            id="leagueCode"
            value={joinCode}
            onChange={(e) =>
              setJoinCode(
                e.target.value.toUpperCase()
              )
            }
            maxLength={20}
            placeholder="Leave blank for the main league"
          />
        </div>

        {error && (
          <p
            className="mt-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            className="mt-3 text-sm text-primary"
            role="status"
          >
            {notice}
          </p>
        )}

        <Button
          onClick={handleJoin}
          disabled={pending}
          className="mt-4 w-full font-display text-base uppercase tracking-wide"
        >
          {pending
            ? "Joining..."
            : "Take my seat"}
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />

          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Or
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <p className="font-display text-lg uppercase">
            Create a mini league
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Start your own private league and invite friends with a unique join code.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="leagueName">
              League name
            </Label>

            <Input
              id="leagueName"
              value={leagueName}
              onChange={(e) =>
                setLeagueName(e.target.value)
              }
              maxLength={60}
              placeholder="e.g. Saturday Football"
            />
          </div>

          <Button
            onClick={handleCreateLeague}
            disabled={
              pending ||
              !leagueName.trim() ||
              !name.trim()
            }
            variant="secondary"
            className="mt-3 w-full font-display text-base uppercase tracking-wide"
          >
            {pending
              ? "Creating..."
              : "Create league"}
          </Button>
        </div>

      </div>
    </main>
  )
}
