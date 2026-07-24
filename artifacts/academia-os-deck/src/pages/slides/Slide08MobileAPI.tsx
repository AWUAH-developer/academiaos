export default function Slide08MobileAPI() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background glow */}
      <div
        className="absolute bottom-0 right-0"
        style={{
          width: '50vw',
          height: '50vh',
          background: 'radial-gradient(ellipse at bottom right, rgba(212,162,40,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Left */}
      <div
        className="relative z-10 flex flex-col justify-center px-[5.5vw] py-[5vh]"
        style={{ width: '50%' }}
      >
        <div
          className="mb-[1.8vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          REST API
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '3.5vw', lineHeight: '1.1', color: '#E8E4DC', textWrap: 'balance' }}
        >
          Mobile API v1
          <br />
          <span style={{ color: '#D4A228' }}>15 Live Endpoints</span>
        </h2>

        <p
          className="mt-[2vh] font-body"
          style={{ fontSize: '1.75vw', color: '#7A96AC', lineHeight: '1.5' }}
        >
          JWT-based REST API powering the companion Android &amp; iOS app. Same entitlement rules enforced server-side.
        </p>

        {/* Endpoint groups */}
        <div className="mt-[2.5vh] flex flex-col gap-[1.4vh]">
          <div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '1.6vw', color: '#4A90D9' }}>
              Auth &amp; Identity
            </div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              login · refresh · logout · profile · change-password
            </div>
          </div>
          <div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '1.6vw', color: '#17B890' }}>
              Academic Data
            </div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              learners · attendance · results · reports
            </div>
          </div>
          <div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '1.6vw', color: '#D4A228' }}>
              Finance &amp; Comms
            </div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              fees · payments · announcements · notifications
            </div>
          </div>
          <div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '1.6vw', color: '#9B59B6' }}>
              Device Management
            </div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              devices · status (health check)
            </div>
          </div>
        </div>
      </div>

      {/* Right: API terminal card */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '50%', paddingRight: '4.5vw' }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            width: '36vw',
            background: '#0A1520',
            border: '1px solid rgba(212,162,40,0.2)',
            boxShadow: '0 2vh 5vw rgba(0,0,0,0.6)',
          }}
        >
          {/* Terminal header */}
          <div
            className="px-[1.8vw] py-[1.2vh] flex items-center gap-[0.8vw]"
            style={{ background: '#0D1B2A', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="rounded-full" style={{ width: '0.8vw', height: '0.8vw', background: '#FF5F57' }} />
            <div className="rounded-full" style={{ width: '0.8vw', height: '0.8vw', background: '#FEBC2E' }} />
            <div className="rounded-full" style={{ width: '0.8vw', height: '0.8vw', background: '#28C840' }} />
            <span className="ml-[1vw] font-body" style={{ fontSize: '1.35vw', color: '#4A6070' }}>
              GET /api/mobile/v1/status
            </span>
          </div>

          {/* Terminal body */}
          <div className="px-[2vw] py-[1.8vh] font-body" style={{ fontSize: '1.5vw', lineHeight: '1.8' }}>
            <div style={{ color: '#4A6070' }}>HTTP 200 OK</div>
            <div style={{ color: '#4A6070' }}>Content-Type: application/json</div>
            <div className="mt-[1vh]" style={{ color: '#E8E4DC' }}>{'{'}</div>
            <div className="ml-[1.5vw]">
              <span style={{ color: '#4A90D9' }}>"service"</span>
              <span style={{ color: '#7A96AC' }}>: </span>
              <span style={{ color: '#17B890' }}>"AcademiaOS Mobile API"</span>
              <span style={{ color: '#7A96AC' }}>,</span>
            </div>
            <div className="ml-[1.5vw]">
              <span style={{ color: '#4A90D9' }}>"version"</span>
              <span style={{ color: '#7A96AC' }}>: </span>
              <span style={{ color: '#17B890' }}>"v1"</span>
              <span style={{ color: '#7A96AC' }}>,</span>
            </div>
            <div className="ml-[1.5vw]">
              <span style={{ color: '#4A90D9' }}>"database"</span>
              <span style={{ color: '#7A96AC' }}>: </span>
              <span style={{ color: '#17B890' }}>"connected"</span>
              <span style={{ color: '#7A96AC' }}>,</span>
            </div>
            <div className="ml-[1.5vw]">
              <span style={{ color: '#4A90D9' }}>"endpoints"</span>
              <span style={{ color: '#7A96AC' }}>: </span>
              <span style={{ color: '#D4A228' }}>15</span>
            </div>
            <div style={{ color: '#E8E4DC' }}>{'}'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
