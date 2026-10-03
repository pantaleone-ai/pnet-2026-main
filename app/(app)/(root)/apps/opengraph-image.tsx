import { ImageResponse } from "next/og";

// Same edge-rendered, deploy-pinned pattern as app/opengraph-image.tsx.
export const runtime = "edge";
export const alt = "Apps | Pantaleone Portfolio Products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await fetch(
    `${process.env.APP_URL || "https://www.pantaleone.net"}/fonts/inter-bold.woff2`,
    { cache: "force-cache" },
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#020617",
        fontFamily: "Inter",
        position: "relative",
      }}
    >
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
      <div
        style={{
          fontSize: 84,
          fontWeight: 700,
          color: "white",
          letterSpacing: "-0.04em",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        Apps
      </div>
      <div
        style={{
          fontSize: 32,
          color: "#94a3b8",
          textAlign: "center",
          fontWeight: 500,
        }}
      >
        Live Pantaleone portfolio products
      </div>
    </div>,
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
    },
  );
}
