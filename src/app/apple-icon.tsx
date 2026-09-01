import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)',
          borderRadius: '38px',
          border: '2px solid rgba(245, 158, 11, 0.35)',
          padding: '24px',
        }}
      >
        <svg
          width="110"
          height="110"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Navigation / Supersonic Pilot Arrow */}
          <polygon points="3 11 22 2 13 21 11 13 3 11" fill="#f59e0b" fillOpacity="0.2" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
