export default function Slide09Security() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background accent */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(212,162,40,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Left: Content */}
      <div
        className="relative z-10 flex flex-col justify-center px-[5.5vw] py-[5vh]"
        style={{ width: '58%' }}
      >
        <div
          className="mb-[1.8vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Security Architecture
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '3.8vw', lineHeight: '1.1', color: '#E8E4DC', textWrap: 'balance' }}
        >
          Role-Based Security,
          <br />
          <span style={{ color: '#D4A228' }}>Top to Bottom</span>
        </h2>

        <div className="mt-[3vh] flex flex-col gap-[1.5vh]">
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#D4A228' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Username / password auth — no Replit Auth, no OAuth redirects
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#D4A228' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Session idle-timeout with automatic cookie cleanup
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#D4A228' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Package entitlements enforced on the server, never just hidden in the UI
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#17B890' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Additive-only database migrations — no destructive changes
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#17B890' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Every sensitive action audit-logged
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#17B890' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Demo credentials never exposed publicly
            </span>
          </div>
        </div>
      </div>

      {/* Right: Security visual */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '42%' }}
      >
        <div className="relative flex flex-col items-center gap-[2.5vh]">
          {/* Shield */}
          <svg viewBox="0 0 200 240" style={{ width: '20vw', height: '20vw' }} aria-hidden="true">
            <path d="M100 10 L180 45 L180 130 C180 175 145 205 100 225 C55 205 20 175 20 130 L20 45 Z"
                  fill="rgba(212,162,40,0.08)" stroke="rgba(212,162,40,0.5)" strokeWidth="2.5" />
            <path d="M100 28 L163 57 L163 128 C163 166 134 191 100 208 C66 191 37 166 37 128 L37 57 Z"
                  fill="rgba(212,162,40,0.05)" stroke="rgba(212,162,40,0.22)" strokeWidth="1.5" />
            <text x="100" y="138" textAnchor="middle" fill="#D4A228" fontSize="44" fontFamily="Sora, sans-serif" fontWeight="700">
              A
            </text>
          </svg>

          {/* Tags below shield */}
          <div className="flex flex-col gap-[1.2vh] items-center">
            <div
              className="font-body px-[2vw] py-[0.7vh] rounded-full"
              style={{ fontSize: '1.5vw', background: 'rgba(212,162,40,0.1)', border: '1px solid rgba(212,162,40,0.25)', color: '#D4A228' }}
            >
              Server-enforced permissions
            </div>
            <div
              className="font-body px-[2vw] py-[0.7vh] rounded-full"
              style={{ fontSize: '1.5vw', background: 'rgba(23,184,144,0.08)', border: '1px solid rgba(23,184,144,0.22)', color: '#17B890' }}
            >
              Audit trail on every action
            </div>
            <div
              className="font-body px-[2vw] py-[0.7vh] rounded-full"
              style={{ fontSize: '1.5vw', background: 'rgba(74,144,217,0.08)', border: '1px solid rgba(74,144,217,0.22)', color: '#4A90D9' }}
            >
              Session &amp; device management
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
