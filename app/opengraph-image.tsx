import { ImageResponse } from "next/og";

// Force Edge Runtime for performance
export const runtime = "edge";

export const alt = "Pantaleone AI - Forward Deployed AI Product Lead";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Fetch Font (Inter Bold)
  const fontData = await fetch(
    new URL("https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2", import.meta.url)
  ).then((res) => res.arrayBuffer());

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
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(2,6,23,0) 70%)",
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
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
      ...size,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}