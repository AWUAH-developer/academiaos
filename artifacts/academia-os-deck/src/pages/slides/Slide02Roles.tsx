export default function Slide02Roles() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background accent */}
      <div
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: '55%',
          background: 'linear-gradient(90deg, transparent, rgba(23,184,144,0.03))',
        }}
      />

      {/* Left: Headline */}
      <div className="relative z-10 flex flex-col justify-center px-[6vw] py-[6vh]" style={{ width: '44%' }}>
        <div
          className="mb-[2vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Who It Serves
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '4.8vw', lineHeight: '1.08', color: '#E8E4DC', textWrap: 'balance' }}
        >
          One Platform.
          <br />
          <span style={{ color: '#D4A228' }}>Every Role.</span>
        </h2>

        <p
          className="mt-[2.5vh] font-body"
          style={{ fontSize: '1.9vw', color: '#7A96AC', lineHeight: '1.6', textWrap: 'balance' }}
        >
          Six portals, one shared database — each user sees exactly what their role permits.
        </p>

        <div className="mt-[4vh] flex items-center gap-[1.2vw]">
          <div className="h-[0.3vh] rounded-full" style={{ width: '4vw', background: '#D4A228' }} />
          <div className="h-[0.3vh] rounded-full" style={{ width: '2vw', background: 'rgba(212,162,40,0.35)' }} />
          <div className="h-[0.3vh] rounded-full" style={{ width: '1vw', background: 'rgba(212,162,40,0.15)' }} />
        </div>
      </div>

      {/* Divider */}
      <div
        className="relative z-10 self-stretch my-[6vh]"
        style={{ width: '1px', background: 'rgba(212,162,40,0.12)' }}
      />

      {/* Right: Role list */}
      <div
        className="relative z-10 flex flex-col justify-center gap-[1.2vh] px-[3.5vw] py-[5vh]"
        style={{ width: '56%' }}
      >
        {/* Super Admin */}
        <div
          className="flex items-center gap-[2vw] px-[2.2vw] py-[1.6vh] rounded-xl"
          style={{ background: 'rgba(212,162,40,0.08)', border: '1px solid rgba(212,162,40,0.18)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: '3.2vw', height: '3.2vw', background: 'rgba(212,162,40,0.18)', color: '#D4A228', fontSize: '1.5vw', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
          >
            SA
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC' }}>Super Admin</div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>Full system oversight across all schools</div>
          </div>
        </div>

        {/* Proprietor */}
        <div
          className="flex items-center gap-[2vw] px-[2.2vw] py-[1.6vh] rounded-xl"
          style={{ background: 'rgba(23,184,144,0.07)', border: '1px solid rgba(23,184,144,0.15)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: '3.2vw', height: '3.2vw', background: 'rgba(23,184,144,0.18)', color: '#17B890', fontSize: '1.5vw', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
          >
            PR
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC' }}>Proprietor</div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>School-wide management & approvals</div>
          </div>
        </div>

        {/* Teacher */}
        <div
          className="flex items-center gap-[2vw] px-[2.2vw] py-[1.6vh] rounded-xl"
          style={{ background: 'rgba(74,144,217,0.07)', border: '1px solid rgba(74,144,217,0.15)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: '3.2vw', height: '3.2vw', background: 'rgba(74,144,217,0.18)', color: '#4A90D9', fontSize: '1.5vw', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
          >
            TC
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC' }}>Teacher</div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>Attendance, marks, homework & communication</div>
          </div>
        </div>

        {/* Accounts */}
        <div
          className="flex items-center gap-[2vw] px-[2.2vw] py-[1.6vh] rounded-xl"
          style={{ background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.15)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: '3.2vw', height: '3.2vw', background: 'rgba(46,204,113,0.18)', color: '#2ECC71', fontSize: '1.5vw', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
          >
            AC
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC' }}>Accounts</div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>Fees, payments & financial reports</div>
          </div>
        </div>

        {/* Parent */}
        <div
          className="flex items-center gap-[2vw] px-[2.2vw] py-[1.6vh] rounded-xl"
          style={{ background: 'rgba(155,89,182,0.07)', border: '1px solid rgba(155,89,182,0.15)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: '3.2vw', height: '3.2vw', background: 'rgba(155,89,182,0.18)', color: '#9B59B6', fontSize: '1.5vw', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
          >
            PG
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC' }}>Parent / Guardian</div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>Child progress & fee balances</div>
          </div>
        </div>

        {/* Learner */}
        <div
          className="flex items-center gap-[2vw] px-[2.2vw] py-[1.6vh] rounded-xl"
          style={{ background: 'rgba(243,156,18,0.07)', border: '1px solid rgba(243,156,18,0.15)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: '3.2vw', height: '3.2vw', background: 'rgba(243,156,18,0.18)', color: '#F39C12', fontSize: '1.5vw', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
          >
            LN
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.85vw', color: '#E8E4DC' }}>Learner</div>
            <div className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>Results, timetable & announcements</div>
          </div>
        </div>
      </div>
    </div>
  );
}
