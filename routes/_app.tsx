import { type PageProps } from "$fresh/server.ts";

export default function App({ Component, url }: PageProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ethos Anonymous Reviews</title>
        
        {/* Basic Meta Tags */}
        <meta name="description" content="Submit anonymous reviews for Ethos profiles. Reputable users can provide feedback without revealing their identity." />
        <meta name="keywords" content="Ethos, anonymous reviews, blockchain, reputation, Base, crypto" />
        <meta name="author" content="Ethos Network" />
        
        {/* OpenGraph Meta Tags */}
        <meta property="og:title" content="Ethos Anonymous Reviews" />
        <meta property="og:description" content="Submit anonymous reviews for Ethos profiles. Reputable users can provide feedback without revealing their identity." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url.href} />
        <meta property="og:image" content="/anonymous-figure.png" />
        <meta property="og:image:alt" content="Anonymous figure representing anonymous reviews" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Ethos Anonymous Reviews" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ethos Anonymous Reviews" />
        <meta name="twitter:description" content="Submit anonymous reviews for Ethos profiles. Reputable users can provide feedback without revealing their identity." />
        <meta name="twitter:image" content="/anonymous-figure.png" />
        <meta name="twitter:image:alt" content="Anonymous figure representing anonymous reviews" />
        
        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <link rel="canonical" href={url.href} />
        
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-neutral-950 text-white min-h-screen">
        <Component />
      </body>
    </html>
  );
}
