import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Web document shell. Loads the two type families with every weight the
// theme uses, so headings and labels render real weights instead of
// synthesized bold, and paints the paper colour before the app mounts.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: documentStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const documentStyle = `
body { background-color: #FFF8EE; }
@media (prefers-color-scheme: dark) { body { background-color: #191512; } }
input, textarea { font-family: "Instrument Sans", system-ui, -apple-system, sans-serif; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
`;
