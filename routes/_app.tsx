import { type PageProps } from "$fresh/server.ts";
import { ethosDark } from "../static/ds/tokens/ethos.tokens.ts";

// The browser chrome matches the page background; a meta tag cannot read a CSS variable, so this is
// the same token (--ethos-bg-base, dark) from the design system's constants.
const THEME_COLOR = ethosDark.bg.base;

export default function App({ Component, url }: PageProps) {
  return (
    <html data-theme="dark">
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
        <meta name="theme-color" content={THEME_COLOR} />
        <meta name="msapplication-TileColor" content={THEME_COLOR} />
        <link rel="canonical" href={url.href} />
        
        {/* Ethos design system, copied into static/ds by scripts/sync-design-system.sh */}
        <link rel="stylesheet" href="/ds/tokens/ethos.css" />
        <link rel="stylesheet" href="/ds/tokens/ethos.icons.css" />
        <link rel="stylesheet" href="/ds/components.css" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="min-h-screen">
        <Component />
      </body>
    </html>
  );
}
