import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ethos Anonymous Reviews</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-neutral-950 text-white min-h-screen">
        <Component />
      </body>
    </html>
  );
}
