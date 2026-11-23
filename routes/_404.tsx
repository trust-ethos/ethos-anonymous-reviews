import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      {/* The same top bar and card as the home page (routes/index.tsx), without the sign-in button. */}
      <div class="min-h-screen flex flex-col">
        <header style="background: var(--ethos-bg-base); border-bottom: 1px solid var(--ethos-border-split)">
          <div class="max-w-5xl mx-auto px-4 py-2 flex items-center">
            <a
              href="/"
              aria-label="Ethos anonymous reviews"
              class="e-text flex items-center"
              style="height: var(--ethos-size-control-md)"
            >
              <span
                class="ei ei-ethos-mark"
                style="font-size: var(--ethos-font-size-h3)"
                aria-hidden="true"
              >
              </span>
            </a>
          </div>
        </header>

        <main class="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col justify-center">
          <section class="e-card sm:p-6 flex flex-col items-center text-center">
            <div class="e-text mono md muted mt-4">404</div>
            <h1 class="e-text h2 mt-2">Page not found</h1>
            <p class="e-text md body mt-2">
              The page you were looking for doesn't exist.
            </p>
            <a href="/" class="e-btn primary mt-6 mb-4">Go back home</a>
          </section>
        </main>
      </div>
    </>
  );
}
