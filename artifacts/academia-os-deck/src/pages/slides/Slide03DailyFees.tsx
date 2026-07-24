export default function Slide03DailyFees() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: '#0D1B2A' }}
    >
      {/* Subtle warm glow bottom-left */}
      <div
        className="absolute bottom-0 left-0"
        style={{
          width: '40vw',
          height: '40vh',
          background: 'radial-gradient(ellipse at bottom left, rgba(212,162,40,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Left: Content */}
      <div
        className="relative z-10 flex flex-col justify-center px-[5.5vw] py-[5vh]"
        style={{ width: '55%' }}
      >
        <div
          className="mb-[1.8vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Fee Engine
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '3.8vw', lineHeight: '1.1', color: '#E8E4DC', textWrap: 'balance' }}
        >
          Daily Fees That
          <br />
          <span style={{ color: '#D4A228' }}>Follow Reality</span>
        </h2>

        <p
          className="mt-[1.8vh] font-body"
          style={{ fontSize: '1.8vw', color: '#7A96AC', lineHeight: '1.5' }}
        >
          Every learner is charged automatically on each scheduled day. Five configurable policies per school:
        </p>

        {/* Policy list */}
        <div className="mt-[2vh] flex flex-col gap-[0.9vh]">
          <div className="flex items-center gap-[1.2vw] px-[1.5vw] py-[0.9vh] rounded-lg"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="rounded-full flex-shrink-0" style={{ width: '0.55vw', height: '0.55vw', background: '#7A96AC' }} />
            <span className="font-body" style={{ fontSize: '1.7vw', color: '#B8C8D4' }}>Charge on attendance only</span>
          </div>

          <div className="flex items-center gap-[1.2vw] px-[1.5vw] py-[0.9vh] rounded-lg"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="rounded-full flex-shrink-0" style={{ width: '0.55vw', height: '0.55vw', background: '#7A96AC' }} />
            <span className="font-body" style={{ fontSize: '1.7vw', color: '#B8C8D4' }}>Charge every scheduled day</span>
          </div>

          {/* Highlighted */}
          <div className="flex items-center gap-[1.2vw] px-[1.5vw] py-[0.9vh] rounded-lg"
               style={{ background: 'rgba(212,162,40,0.12)', border: '1px solid rgba(212,162,40,0.35)' }}>
            <div className="rounded-full flex-shrink-0" style={{ width: '0.55vw', height: '0.55vw', background: '#D4A228' }} />
            <span className="font-display font-semibold" style={{ fontSize: '1.75vw', color: '#D4A228' }}>
              Carry forward when absent
            </span>
            <span className="ml-auto font-body rounded-full px-[0.8vw] py-[0.3vh]"
                  style={{ fontSize: '1.3vw', background: 'rgba(212,162,40,0.2)', color: '#D4A228' }}>
              Key Rule
            </span>
          </div>

          <div className="flex items-center gap-[1.2vw] px-[1.5vw] py-[0.9vh] rounded-lg"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="rounded-full flex-shrink-0" style={{ width: '0.55vw', height: '0.55vw', background: '#7A96AC' }} />
            <span className="font-body" style={{ fontSize: '1.7vw', color: '#B8C8D4' }}>Waive when absent</span>
          </div>

          <div className="flex items-center gap-[1.2vw] px-[1.5vw] py-[0.9vh] rounded-lg"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="rounded-full flex-shrink-0" style={{ width: '0.55vw', height: '0.55vw', background: '#7A96AC' }} />
            <span className="font-body" style={{ fontSize: '1.7vw', color: '#B8C8D4' }}>Manual review when absent</span>
          </div>
        </div>

        <p className="mt-[2vh] font-body" style={{ fontSize: '1.5vw', color: '#5A7080' }}>
          Weekends, public holidays &amp; school holidays excluded automatically. Waivers tracked with reason, user &amp; timestamp.
        </p>
      </div>

      {/* Right: Ledger card */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '45%', paddingRight: '4vw' }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            width: '34vw',
            background: '#122030',
            border: '1px solid rgba(212,162,40,0.22)',
            boxShadow: '0 2vh 5vw rgba(0,0,0,0.5)',
          }}
        >
          {/* Card header */}
          <div
            className="px-[2.2vw] py-[1.8vh] flex items-center justify-between"
            style={{ background: 'rgba(212,162,40,0.1)', borderBottom: '1px solid rgba(212,162,40,0.18)' }}
          >
            <span className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#D4A228' }}>
              Daily Fee Ledger
            </span>
            <span className="font-body rounded-full px-[1vw] py-[0.4vh]"
                  style={{ fontSize: '1.35vw', background: 'rgba(212,162,40,0.15)', color: '#D4A228' }}>
              Today
            </span>
          </div>

          {/* Card body */}
          <div className="px-[2.2vw] py-[2vh] flex flex-col gap-[1.4vh]">
            <div className="flex justify-between items-center py-[0.8vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC' }}>Scheduled fee</span>
              <span className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#E8E4DC' }}>GHS 5.00</span>
            </div>

            <div className="flex justify-between items-center py-[0.8vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC' }}>Learner absent</span>
              <span className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#F39C12' }}>Yes</span>
            </div>

            <div className="flex justify-between items-center py-[0.8vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC' }}>School policy</span>
              <span className="font-display font-semibold" style={{ fontSize: '1.7vw', color: '#D4A228' }}>Carry Forward</span>
            </div>

            <div className="flex justify-between items-center py-[0.8vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC' }}>Collected today</span>
              <span className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#E8E4DC' }}>GHS 0.00</span>
            </div>

            {/* Highlighted row */}
            <div
              className="flex justify-between items-center px-[1.2vw] py-[1.2vh] rounded-xl"
              style={{ background: 'rgba(212,162,40,0.12)', border: '1px solid rgba(212,162,40,0.3)' }}
            >
              <span className="font-body font-medium" style={{ fontSize: '1.6vw', color: '#D4A228' }}>Carried forward</span>
              <span className="font-display font-bold" style={{ fontSize: '2vw', color: '#D4A228' }}>+ GHS 5.00</span>
            </div>

            <p className="font-body text-center" style={{ fontSize: '1.35vw', color: '#4A6070', marginTop: '0.5vh' }}>
              Balance = previous + GHS 5.00 — idempotent, no duplicates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
