import { useSignal } from "@preact/signals";
import ReviewForm from "../islands/ReviewForm.tsx";
import AuthButton from "../islands/AuthButton.tsx";
import KairosAgentSidebar from "../islands/KairosAgentSidebar.tsx";

export default function Home() {
  return (
    // The islands are not on the design system yet and size their text from a 16px base,
    // so the shell keeps that base; the shell's own text sets its size with e-text.
    <div
      class="min-h-screen flex flex-col"
      style="font-size: var(--ethos-font-size-lg)"
    >
      {/* Top bar */}
      <header
        class="sticky top-0 z-10"
        style="background: var(--ethos-bg-base); border-bottom: 1px solid var(--ethos-border-split)"
      >
        <div class="max-w-5xl mx-auto px-4 py-2 flex justify-between items-center gap-4">
          <a
            href="/"
            aria-label="Ethos anonymous reviews"
            class="e-text flex items-center"
          >
            <span
              class="ei ei-ethos-mark"
              style="font-size: var(--ethos-font-size-h3)"
              aria-hidden="true"
            >
            </span>
          </a>
          <AuthButton />
        </div>
      </header>

      {/* Main content */}
      <main class="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
        {/* Review form card */}
        <section class="e-card sm:p-6">
          <div class="e-sunken p-0 h-40 overflow-hidden">
            <img
              src="/anonymous-figure.png"
              alt="Anonymous figure in shadows"
              class="w-full h-full object-cover object-center opacity-60 mix-blend-luminosity"
            />
          </div>

          <h1 class="e-text h2 mt-4">Submit an anonymous review</h1>
          <p class="e-text md body mt-2">
            Reputable or higher Ethos profiles can use this functionality to
            write reviews without revealing their identity. This app does not
            store any logs or information about who logs in or writes the
            reviews.
          </p>

          <div class="mt-6">
            <ReviewForm />
          </div>
        </section>

        {/* KairosAgent section, below the form */}
        <KairosAgentSidebar />
      </main>

      {/* Footer */}
      <footer class="px-4 pb-8 text-center">
        <p class="e-text sm faint">
          Powered by{" "}
          <a
            href="https://app.ethos.network"
            target="_blank"
            rel="noopener noreferrer"
            class="e-link"
          >
            Ethos
          </a>{" "}
          and{" "}
          <a
            href="https://app.ethos.network/profile/x/kairosagent"
            target="_blank"
            rel="noopener noreferrer"
            class="e-link"
          >
            KairosAgent
          </a>
        </p>
      </footer>
    </div>
  );
}
