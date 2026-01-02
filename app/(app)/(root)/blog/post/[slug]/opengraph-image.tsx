import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Pantaleone AI Article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Define the props interface to match your [slug] folder
interface Props {
  params: {
    slug: string;
  };
}

export default async function Image({ params }: Props) {
  // Convert slug "my-cool-post" -> "My Cool Post"
  const title = params.slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

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
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#020617",
          padding: "80px",
          fontFamily: "Inter",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "white", letterSpacing: "-1px" }}>
            Pantaleone.net
          </div>
        </div>

        {/* Dynamic Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "1000px" }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 36, color: "#94a3b8", fontWeight: 500 }}>
            Systems Architecture & AI Engineering
          </div>
        </div>

        {/* Footer Bar */}
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
            borderRadius: "4px",
          }}
        />
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