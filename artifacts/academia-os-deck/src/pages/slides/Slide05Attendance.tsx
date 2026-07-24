export default function Slide05Attendance() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background accent */}
      <div
        className="absolute top-0 right-0"
        style={{
          width: '50%',
          height: '100%',
          background: 'linear-gradient(225deg, rgba(74,144,217,0.04) 0%, transparent 55%)',
        }}
      />

      {/* Left: Content */}
      <div
        className="relative z-10 flex flex-col justify-center px-[5.5vw] py-[5vh]"
        style={{ width: '50%' }}
      >
        <div
          className="mb-[1.8vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Attendance
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '3.8vw', lineHeight: '1.1', color: '#E8E4DC', textWrap: 'balance' }}
        >
          Real-Time &amp;
          <br />
          <span style={{ color: '#4A90D9' }}>Role-Gated</span>
        </h2>

        <div className="mt-[3vh] flex flex-col gap-[1.6vh]">
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#4A90D9' }} />
            <span className="font-body" style={{ fontSize: '1.8vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              QR-code scanner for fast learner check-in
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#4A90D9' }} />
            <span className="font-body" style={{ fontSize: '1.8vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Manual mark for individual learners or whole classes
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#4A90D9' }} />
            <span className="font-body" style={{ fontSize: '1.8vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Staff attendance tracked separately
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#D4A228' }} />
            <span className="font-body" style={{ fontSize: '1.8vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Absent/present data feeds directly into the daily fee engine
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#4A90D9' }} />
            <span className="font-body" style={{ fontSize: '1.8vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Attendance reports exportable per class, per term
            </span>
          </div>
        </div>
      </div>

      {/* Right: Attendance card mockup */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '50%', paddingRight: '4.5vw' }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            width: '36vw',
            background: '#122030',
            border: '1px solid rgba(74,144,217,0.2)',
            boxShadow: '0 2vh 4vw rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="px-[2vw] py-[1.6vh] flex items-center justify-between"
            style={{ background: 'rgba(74,144,217,0.1)', borderBottom: '1px solid rgba(74,144,217,0.18)' }}
          >
            <span className="font-display font-semibold" style={{ fontSize: '1.7vw', color: '#4A90D9' }}>
              Class 5A — Today
            </span>
            <span className="font-body" style={{ fontSize: '1.35vw', color: '#7A96AC' }}>28 learners</span>
          </div>

          {/* Learner rows */}
          <div className="px-[2vw] py-[1.5vh] flex flex-col gap-[1vh]">
            <div className="flex items-center justify-between py-[0.7vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#B8C8D4' }}>Ama Owusu</span>
              <span className="font-display font-semibold px-[1.2vw] py-[0.3vh] rounded-full"
                    style={{ fontSize: '1.35vw', background: 'rgba(23,184,144,0.15)', color: '#17B890' }}>Present</span>
            </div>
            <div className="flex items-center justify-between py-[0.7vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#B8C8D4' }}>Kofi Mensah</span>
              <span className="font-display font-semibold px-[1.2vw] py-[0.3vh] rounded-full"
                    style={{ fontSize: '1.35vw', background: 'rgba(243,156,18,0.15)', color: '#F39C12' }}>Absent</span>
            </div>
            <div className="flex items-center justify-between py-[0.7vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#B8C8D4' }}>Abena Asante</span>
              <span className="font-display font-semibold px-[1.2vw] py-[0.3vh] rounded-full"
                    style={{ fontSize: '1.35vw', background: 'rgba(23,184,144,0.15)', color: '#17B890' }}>Present</span>
            </div>
            <div className="flex items-center justify-between py-[0.7vh]"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#B8C8D4' }}>Kwame Boateng</span>
              <span className="font-display font-semibold px-[1.2vw] py-[0.3vh] rounded-full"
                    style={{ fontSize: '1.35vw', background: 'rgba(23,184,144,0.15)', color: '#17B890' }}>Present</span>
            </div>
            <div className="flex items-center justify-between py-[0.7vh]">
              <span className="font-body" style={{ fontSize: '1.6vw', color: '#B8C8D4' }}>Efua Darko</span>
              <span className="font-display font-semibold px-[1.2vw] py-[0.3vh] rounded-full"
                    style={{ fontSize: '1.35vw', background: 'rgba(243,156,18,0.15)', color: '#F39C12' }}>Absent</span>
            </div>
          </div>

          {/* Footer summary */}
          <div
            className="px-[2vw] py-[1.4vh] flex justify-between"
            style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="font-body" style={{ fontSize: '1.5vw', color: '#17B890' }}>26 Present</span>
            <span className="font-body" style={{ fontSize: '1.5vw', color: '#F39C12' }}>2 Absent — carry fwd</span>
          </div>
        </div>
      </div>
    </div>
  );
}
