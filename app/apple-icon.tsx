import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #00b5cc 0%, #b2df28 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 90,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-4px',
          }}
        >
          RF
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
