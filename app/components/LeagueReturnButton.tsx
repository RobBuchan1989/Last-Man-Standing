"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  href: string
}

export default function LeagueReturnButton({
  href,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    if (loading) return

    setLoading(true)

    router.push(href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl bg-green-400 px-7 py-4 text-center font-black text-[#07110b] transition hover:bg-green-300 disabled:cursor-wait disabled:opacity-80 md:w-auto"
    >
      {loading ? "LOADING LEAGUE..." : "RETURN TO LEAGUE"}
    </button>
  )
}
