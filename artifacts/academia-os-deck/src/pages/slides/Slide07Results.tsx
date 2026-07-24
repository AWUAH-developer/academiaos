export default function Slide07Results() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background */}
      <div
        className="absolute top-0 right-0"
        style={{
          width: '50%',
          height: '100%',
          background: 'linear-gradient(225deg, rgba(155,89,182,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Left: Content */}
      <div
        className="relative z-10 flex flex-col justify-center px-[5.5vw] py-[5vh]"
        style={{ width: '52%' }}
      >
        <div
          className="mb-[1.8vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Academic & Communication
        </div>

        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '3.6vw', lineHeight: '1.1', color: '#E8E4DC', textWrap: 'balance' }}
        >
          Results, Reports
          <br />
          &amp; <span style={{ color: '#9B59B6' }}>Communication</span>
        </h2>

        <div className="mt-[3vh] flex flex-col gap-[1.5vh]">
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#9B59B6' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Marks entry by subject &amp; term with teacher comments
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#9B59B6' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Report cards generated per learner
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#D4A228' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Proprietor approval workflow before release to parents
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#9B59B6' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Announcements &amp; homework pushed to parent/learner portals
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#9B59B6' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              Helpdesk tickets between staff and parents
            </span>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="flex-shrink-0 mt-[0.4vh] rounded-full" style={{ width: '0.6vw', height: '0.6vw', background: '#17B890' }} />
            <span className="font-body" style={{ fontSize: '1.75vw', color: '#B8C8D4', lineHeight: '1.4' }}>
              WhatsApp / SMS / push notification support
            </span>
          </div>
        </div>
      </div>

      {/* Right: Notification stack */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: '48%', paddingRight: '4vw' }}
      >
        <div className="flex flex-col gap-[1.6vh]" style={{ width: '34vw' }}>
          {/* Report card notification */}
          <div
            className="rounded-xl px-[2vw] py-[1.6vh]"
            style={{ background: '#122030', border: '1px solid rgba(155,89,182,0.25)' }}
          >
            <div className="flex items-center justify-between mb-[0.8vh]">
              <span className="font-display font-semibold" style={{ fontSize: '1.65vw', color: '#9B59B6' }}>
                Report Card Ready
              </span>
              <span className="font-body" style={{ fontSize: '1.3vw', color: '#4A6070' }}>Just now</span>
            </div>
            <p className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              Term 2 reports for Class 6B approved by Proprietor — viewable by parents
            </p>
          </div>

          {/* WhatsApp notification */}
          <div
            className="rounded-xl px-[2vw] py-[1.6vh]"
            style={{ background: '#122030', border: '1px solid rgba(23,184,144,0.2)' }}
          >
            <div className="flex items-center justify-between mb-[0.8vh]">
              <span className="font-display font-semibold" style={{ fontSize: '1.65vw', color: '#17B890' }}>
                WhatsApp Sent
              </span>
              <span className="font-body" style={{ fontSize: '1.3vw', color: '#4A6070' }}>2m ago</span>
            </div>
            <p className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              Fee reminder delivered to 43 parent contacts
            </p>
          </div>

          {/* Homework notification */}
          <div
            className="rounded-xl px-[2vw] py-[1.6vh]"
            style={{ background: '#122030', border: '1px solid rgba(74,144,217,0.2)' }}
          >
            <div className="flex items-center justify-between mb-[0.8vh]">
              <span className="font-display font-semibold" style={{ fontSize: '1.65vw', color: '#4A90D9' }}>
                New Assignment
              </span>
              <span className="font-body" style={{ fontSize: '1.3vw', color: '#4A6070' }}>5m ago</span>
            </div>
            <p className="font-body" style={{ fontSize: '1.5vw', color: '#7A96AC' }}>
              Maths homework — Chapter 7 exercises — due Friday
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
