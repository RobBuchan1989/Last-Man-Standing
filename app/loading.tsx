export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0b1018] text-white">

      <header className="border-b border-white/10 bg-[#111722] px-6 py-7">
        <div className="mx-auto max-w-7xl">

          <div className="flex items-center gap-3">

            <div className="h-10 w-10 animate-pulse rounded-xl bg-[#202733]" />

            <div>
              <div className="h-3 w-32 animate-pulse rounded bg-green-400/30" />

              <div className="mt-2 h-7 w-64 animate-pulse rounded bg-white/10" />
            </div>

          </div>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">

          <section>
            <div className="rounded-2xl border border-white/10 bg-[#151b25] p-7">

              <div className="h-4 w-36 animate-pulse rounded bg-green-400/20" />

              <div className="mt-4 h-10 w-72 animate-pulse rounded bg-white/10" />

              <div className="mt-4 h-5 w-full max-w-lg animate-pulse rounded bg-white/5" />

              <div className="mt-8 space-y-4">

                <div className="h-20 animate-pulse rounded-xl bg-[#202733]" />
                <div className="h-20 animate-pulse rounded-xl bg-[#202733]" />
                <div className="h-20 animate-pulse rounded-xl bg-[#202733]" />

              </div>

            </div>
          </section>

          <aside>

            <div className="rounded-2xl border border-white/10 bg-[#151b25] p-6">

              <div className="h-7 w-40 animate-pulse rounded bg-white/10" />

              <div className="mt-5 space-y-3">

                <div className="h-16 animate-pulse rounded-xl bg-[#202733]" />
                <div className="h-16 animate-pulse rounded-xl bg-[#202733]" />
                <div className="h-16 animate-pulse rounded-xl bg-[#202733]" />

              </div>

            </div>

          </aside>

        </div>

      </div>

    </main>
  )
}
