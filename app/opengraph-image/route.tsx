// Explicit route handler (not the `opengraph-image.tsx` file convention).
// The file convention breaks under OpenNext Cloudflare Workers with the
// pinned Next version (loadComponents interopDefault TypeError — the route
// component module never loads, so the font fetch inside it never runs).
// A route handler serves the identical URL with the identical image.
export const runtime = "edge";

export async function GET() {
  try {
    // Dynamic import: if next/og fails to initialize in this runtime,
    // a static import would kill the module before GET runs (uncatchable
    // generic 500). Importing here keeps any failure inside the try block.
    const { ImageResponse } = await import("next/og");
    // Font over HTTP from our own edge-cached static assets. A file-URL
    // fetch works on Vercel edge (deployment filesystem) but throws in
    // Cloudflare Workers (no fs — assets come via the ASSETS binding).
    const fontData = await fetch(
      `${process.env.APP_URL || "https://www.pantaleone.net"}/fonts/inter-bold.woff2`,
      { cache: "force-cache" },
    ).then((res) => {
      if (!res.ok) throw new Error(`font fetch ${res.status}`);
      return res.arrayBuffer();
    });

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#020617", // slate-950
            fontFamily: "Inter",
            position: "relative",
          }}
        >
          {/* Background Gradient */}
          <div
            style={{
              position: "absolute",
              width: "1000px",
              height: "1000px",
              background:
                "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(2,6,23,0) 70%)",
              top: "-200px",
            }}
          />
          {/* Logo Icon */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "40px",
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.3)",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {/* Title */}
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.04em",
              marginBottom: "20px",
              textAlign: "center",
              textShadow: "0 4px 8px rgba(0,0,0,0.5)",
            }}
          >
            Pantaleone AI
          </div>
          {/* Subtitle */}
          <div
            style={{
              fontSize: 32,
              color: "#94a3b8", // slate-400
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            Pantaleone AI - Forward Deployed AI Product Lead
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: fontData,
            style: "normal",
            weight: 700,
          },
        ],
      },
    );
  } catch (e) {
    console.error("opengraph-image error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
