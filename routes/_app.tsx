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
      </head>
      <body>
        <PrivyProvider>
          <Component />
        </PrivyProvider>
      </body>
    </html>
  );
}
