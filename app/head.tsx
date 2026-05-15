export default function Head() {
  return (
    <>
      <title>TierStack.io</title>
      <meta
        name="description"
        content="Welcome to TierStack, the definitive tier list site."
      />

      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="TierStack" />
      <meta
        property="og:description"
        content="Welcome to TierStack, the definitive tier list site."
      />
      <meta property="og:image" content="https://example.com/preview.png" />
      <meta property="og:url" content="https://example.com" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="TierStack" />
      <meta
        name="twitter:description"
        content="Welcome to TierStack, the definitive tier list site."
      />
      <meta name="twitter:image" content="https://example.com/preview.png" />
    </>
  );
}
