import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '6px',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-1px',
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
