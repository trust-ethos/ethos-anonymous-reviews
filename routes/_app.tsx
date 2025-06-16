import { type PageProps } from "$fresh/server.ts";
import PrivyProvider from "../islands/PrivyProvider.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ethos Anonymous Reviews</title>
        <link rel="stylesheet" href="/styles.css" />
        {/* Load Privy from CDN - this is the recommended approach */}
        <script src="https://cdn.jsdelivr.net/npm/@privy-io/react-auth@1.88.4/dist/index.umd.js"></script>
      </head>
      <body class="bg-neutral-950 text-white min-h-screen">
        <PrivyProvider>
          <Component />
        </PrivyProvider>
      </body>
    </html>
  );
}
