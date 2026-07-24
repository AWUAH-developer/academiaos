export default function Slide04DuplicateProtection() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex items-center"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background geometric */}
      <div
        className="absolute top-0 right-0"
        style={{
          width: '45vw',
          height: '100vh',
          background: 'linear-gradient(225deg, rgba(212,162,40,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Left: Hero stat + content */}
      <div
        className="relative z-10 flex flex-col justify-center px-[5.5vw] py-[5vh]"
        style={{ width: '55%' }}
      >
        <div
          className="mb-[1.8vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Data Integrity
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '3.8vw', lineHeight: '1.1', color: '#E8E4DC', textWrap: 'balance' }}
        >
          Bullet-Proof
          <br />
          <span style={{ color: '#D4A228' }}>Duplicate Protection</span>
        </h2>

        <p
          className="mt-[2vh] mb-[2.5vh] font-body"
          style={{ fontSize: '1.85vw', color: '#7A96AC', lineHeight: '1.55' }}
        >
          Every daily charge is idempotent — one charge per learner per date, no matter what triggers it.
        </p>

        {/* Trigger scenarios */}
        <div className="flex flex-col gap-[0.9vh]">
          <div className="flex items-center gap-[1.5vw]">
            <div className="font-display font-bold flex-shrink-0 text-center"
                 style={{ fontSize: '1.6vw', color: '#17B890', width: '2.5vw' }}>
              01
            </div>
            <div className="h-[1px] flex-shrink-0" style={{ width: '1.5vw', background: 'rgba(23,184,144,0.4)' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4' }}>Browser refresh</span>
            <span className="ml-auto font-display font-semibold" style={{ fontSize: '1.55vw', color: '#17B890' }}>No duplicate</span>
          </div>

          <div className="flex items-center gap-[1.5vw]">
            <div className="font-display font-bold flex-shrink-0 text-center"
                 style={{ fontSize: '1.6vw', color: '#17B890', width: '2.5vw' }}>
              02
            </div>
            <div className="h-[1px] flex-shrink-0" style={{ width: '1.5vw', background: 'rgba(23,184,144,0.4)' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4' }}>Repeated button tap</span>
            <span className="ml-auto font-display font-semibold" style={{ fontSize: '1.55vw', color: '#17B890' }}>No duplicate</span>
          </div>

          <div className="flex items-center gap-[1.5vw]">
            <div className="font-display font-bold flex-shrink-0 text-center"
                 style={{ fontSize: '1.6vw', color: '#17B890', width: '2.5vw' }}>
              03
            </div>
            <div className="h-[1px] flex-shrink-0" style={{ width: '1.5vw', background: 'rgba(23,184,144,0.4)' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4' }}>Mobile reconnect</span>
            <span className="ml-auto font-display font-semibold" style={{ fontSize: '1.55vw', color: '#17B890' }}>No duplicate</span>
          </div>

          <div className="flex items-center gap-[1.5vw]">
            <div className="font-display font-bold flex-shrink-0 text-center"
                 style={{ fontSize: '1.6vw', color: '#17B890', width: '2.5vw' }}>
              04
            </div>
            <div className="h-[1px] flex-shrink-0" style={{ width: '1.5vw', background: 'rgba(23,184,144,0.4)' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4' }}>Desktop sync retry</span>
            <span className="ml-auto font-display font-semibold" style={{ fontSize: '1.55vw', color: '#17B890' }}>No duplicate</span>
          </div>

          <div className="flex items-center gap-[1.5vw]">
            <div className="font-display font-bold flex-shrink-0 text-center"
                 style={{ fontSize: '1.6vw', color: '#17B890', width: '2.5vw' }}>
              05
            </div>
            <div className="h-[1px] flex-shrink-0" style={{ width: '1.5vw', background: 'rgba(23,184,144,0.4)' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4' }}>Background-job retry</span>
            <span className="ml-auto font-display font-semibold" style={{ fontSize: '1.55vw', color: '#17B890' }}>No duplicate</span>
          </div>
        </div>

        <div
          className="mt-[2.5vh] px-[1.8vw] py-[1.2vh] rounded-xl font-body"
          style={{ fontSize: '1.5vw', color: '#7A96AC', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Uniqueness key: <span style={{ color: '#D4A228' }}>school + learner + charge type + date</span>
        </div>
      </div>

      {/* Right: SVG Shield */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '45%' }}
      >
        <div className="relative flex items-center justify-center" style={{ width: '32vw', height: '32vw' }}>
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(23,184,144,0.08) 0%, transparent 70%)' }}
          />
          {/* Shield SVG */}
          <svg
            viewBox="0 0 200 240"
            style={{ width: '22vw', height: '22vw' }}
            aria-hidden="true"
          >
            {/* Shield body */}
            <path
              d="M100 10 L180 45 L180 130 C180 175 145 205 100 225 C55 205 20 175 20 130 L20 45 Z"
              fill="rgba(23,184,144,0.1)"
              stroke="rgba(23,184,144,0.5)"
              strokeWidth="3"
            />
            {/* Inner shield */}
            <path
              d="M100 30 L162 58 L162 128 C162 165 133 190 100 207 C67 190 38 165 38 128 L38 58 Z"
              fill="rgba(23,184,144,0.07)"
              stroke="rgba(23,184,144,0.25)"
              strokeWidth="1.5"
            />
            {/* Checkmark */}
            <path
              d="M68 122 L88 142 L135 95"
              stroke="#17B890"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {/* Label below */}
          <div
            className="absolute font-display font-bold tracking-wide"
            style={{ bottom: '3vw', fontSize: '1.6vw', color: '#17B890', letterSpacing: '0.12em' }}
          >
            IDEMPOTENT
          </div>
        </div>
      </div>
    </div>
  );
}
