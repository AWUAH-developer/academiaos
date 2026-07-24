const base = import.meta.env.BASE_URL;

export default function Slide10Roadmap() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden px-[5vw] py-[5vh]"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background image */}
      <img
        src={`${base}roadmap-bg.jpg`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.12 }}
        alt=""
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(13,27,42,0.7) 0%, rgba(13,27,42,0.4) 50%, rgba(13,27,42,0.85) 100%)' }}
      />

      {/* Header */}
      <div className="relative z-10">
        <div
          className="mb-[1.5vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Product Roadmap
        </div>
        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '4vw', lineHeight: '1.1', color: '#E8E4DC' }}
        >
          What's <span style={{ color: '#D4A228' }}>Coming Next</span>
        </h2>
      </div>

      {/* Timeline row */}
      <div className="relative z-10 mt-[4vh] flex items-stretch gap-[1.8vw]">

        {/* Milestone 1 */}
        <div
          className="flex-1 rounded-2xl px-[1.8vw] py-[2.2vh] flex flex-col gap-[1.2vh]"
          style={{ background: 'rgba(212,162,40,0.08)', border: '1px solid rgba(212,162,40,0.25)' }}
        >
          <div
            className="font-display font-bold"
            style={{ fontSize: '1.5vw', color: '#D4A228', letterSpacing: '0.06em' }}
          >
            PHASE 1
          </div>
          <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC', lineHeight: '1.2' }}>
            Public Website
          </div>
          <p className="font-body" style={{ fontSize: '1.45vw', color: '#7A96AC', lineHeight: '1.45' }}>
            Marketing site with package comparison &amp; demo request flow
          </p>
        </div>

        {/* Connector */}
        <div className="flex items-center flex-shrink-0">
          <div className="h-[2px] w-[2vw]" style={{ background: 'linear-gradient(90deg, rgba(212,162,40,0.4), rgba(23,184,144,0.4))' }} />
        </div>

        {/* Milestone 2 */}
        <div
          className="flex-1 rounded-2xl px-[1.8vw] py-[2.2vh] flex flex-col gap-[1.2vh]"
          style={{ background: 'rgba(23,184,144,0.07)', border: '1px solid rgba(23,184,144,0.22)' }}
        >
          <div
            className="font-display font-bold"
            style={{ fontSize: '1.5vw', color: '#17B890', letterSpacing: '0.06em' }}
          >
            PHASE 2
          </div>
          <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC', lineHeight: '1.2' }}>
            Super Admin Centre
          </div>
          <p className="font-body" style={{ fontSize: '1.45vw', color: '#7A96AC', lineHeight: '1.45' }}>
            Subscriptions, expiries, device &amp; demo management
          </p>
        </div>

        {/* Connector */}
        <div className="flex items-center flex-shrink-0">
          <div className="h-[2px] w-[2vw]" style={{ background: 'linear-gradient(90deg, rgba(23,184,144,0.4), rgba(74,144,217,0.4))' }} />
        </div>

        {/* Milestone 3 */}
        <div
          className="flex-1 rounded-2xl px-[1.8vw] py-[2.2vh] flex flex-col gap-[1.2vh]"
          style={{ background: 'rgba(74,144,217,0.07)', border: '1px solid rgba(74,144,217,0.2)' }}
        >
          <div
            className="font-display font-bold"
            style={{ fontSize: '1.5vw', color: '#4A90D9', letterSpacing: '0.06em' }}
          >
            PHASE 3
          </div>
          <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC', lineHeight: '1.2' }}>
            Desktop App
          </div>
          <p className="font-body" style={{ fontSize: '1.45vw', color: '#7A96AC', lineHeight: '1.45' }}>
            Offline Windows / macOS / Linux with sync-on-reconnect
          </p>
        </div>

        {/* Connector */}
        <div className="flex items-center flex-shrink-0">
          <div className="h-[2px] w-[2vw]" style={{ background: 'linear-gradient(90deg, rgba(74,144,217,0.4), rgba(155,89,182,0.4))' }} />
        </div>

        {/* Milestone 4 */}
        <div
          className="flex-1 rounded-2xl px-[1.8vw] py-[2.2vh] flex flex-col gap-[1.2vh]"
          style={{ background: 'rgba(155,89,182,0.07)', border: '1px solid rgba(155,89,182,0.2)' }}
        >
          <div
            className="font-display font-bold"
            style={{ fontSize: '1.5vw', color: '#9B59B6', letterSpacing: '0.06em' }}
          >
            PHASE 4
          </div>
          <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC', lineHeight: '1.2' }}>
            Mobile Apps
          </div>
          <p className="font-body" style={{ fontSize: '1.45vw', color: '#7A96AC', lineHeight: '1.45' }}>
            Android &amp; iOS on Google Play &amp; App Store
          </p>
        </div>
      </div>

      {/* Bottom note */}
      <div className="relative z-10 mt-[3vh] text-center">
        <p className="font-body" style={{ fontSize: '1.5vw', color: '#4A6070' }}>
          Each phase released, verified, and checkpoint-approved before the next begins
        </p>
      </div>

      {/* Bottom gradient accent */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '0.5vh', background: 'linear-gradient(90deg, #D4A228, #17B890, #4A90D9, #9B59B6)' }}
      />
    </div>
  );
}
