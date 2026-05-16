export default function Head() {
  return (
    <>
      <title>TierStack.dev</title>
      <meta
        name="description"
        content="Welcome to TierStack.dev, the definitive tier list site."
      />

      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="TierStack.dev" />
      <meta
        property="og:description"
        content="Welcome to TierStack.dev, the definitive tier list site."
      />
      <meta property="og:image" content="https://example.com/preview.png" />
      <meta property="og:url" content="https://example.com" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="TierStack.dev" />
      <meta
        name="twitter:description"
        content="Welcome to TierStack.dev, the definitive tier list site."
      />
      <meta name="twitter:image" content="https://example.com/preview.png" />
    </>
  );
}
