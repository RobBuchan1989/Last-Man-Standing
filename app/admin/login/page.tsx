import { adminLogin } from "./actions"

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = searchParams
    ? await searchParams
    : {}

  const error = params.error

  let errorMessage = ""

  if (error === "missing") {
    errorMessage =
      "Please enter your email and password."
  }

  if (error === "invalid") {
    errorMessage =
      "Incorrect email or password."
  }

  if (error === "denied") {
    errorMessage =
      "This account is not authorised for admin access."
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-xl">

        <div className="mb-8">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
            Last Man Standing
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-foreground">
            Admin Login
          </h1>

          <p className="mt-3 text-lg text-muted-foreground">
            Private administration area
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          <form
            action={adminLogin}
            className="space-y-6"
          >

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-4 text-foreground outline-none focus:border-primary"
                placeholder="Your admin email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-4 text-foreground outline-none focus:border-primary"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-6 py-5 text-lg font-bold uppercase tracking-tight text-black transition hover:opacity-90"
            >
              Sign In
            </button>

          </form>

          <div className="mt-6 border-t border-border pt-6 text-center">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Last Man Standing
            </a>
          </div>

        </div>

      </div>
    </main>
  )
}
