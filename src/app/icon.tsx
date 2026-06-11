import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf9f7",
          borderRadius: 6,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24">
          <path d="M5 1.5 L17.5 7 L5 12.5 Z" fill="#c42139" />
          <path d="M5 10.5 L20.5 16.5 L5 22.5 Z" fill="#22304a" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
