import { ImageResponse } from "next/og";
 
// Route segment config
export const runtime = "edge";
 
// Image metadata
export const alt = "Pantaleone.net - Forward deployed AI and Automation at Scale";
export const size = {
  width: 1200,
  height: 630,
};
 
export const contentType = "image/png";
 
export default async function Image() {
  // 1. Fetch a font (Inter SemiBold) for a premium look
  const interSemiBold = await fetch(
    new URL("https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2", import.meta.url)
  ).then((res) => res.arrayBuffer());
 
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: "linear-gradient(to bottom right, #020617, #0f172a)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          {/* Simple AI Icon/Logo shape */}
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
 
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            color: "white",
            marginBottom: 20,
            letterSpacing: "-0.05em",
          }}
        >
          Pantaleone AI
        </div>
 
        <div
          style={{
            fontSize: 32,
            color: "#94a3b8", // Slate-400
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          Senior AI Strategis and Architect
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: interSemiBold,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}