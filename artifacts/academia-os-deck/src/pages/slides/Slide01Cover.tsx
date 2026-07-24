const base = import.meta.env.BASE_URL;

export default function Slide01Cover() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050D16 0%, #0D1B2A 55%, #081320 100%)' }}
    >
      {/* Hero image */}
      <img
        src={`${base}cover-hero.jpg`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.22 }}
        alt=""
      />

      {/* Dot-grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(212,162,40,0.18) 1px, transparent 1px)',
          backgroundSize: '4.5vw 4.5vw',
        }}
      />

      {/* Soft centre glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(212,162,40,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-[10vw]">
        {/* Pill label */}
        <div
          className="mb-[3vh] inline-flex px-[2.4vw] py-[0.9vh] rounded-full font-body font-medium tracking-[0.22em] uppercase"
          style={{
            fontSize: '1.45vw',
            background: 'rgba(212,162,40,0.09)',
            border: '1px solid rgba(212,162,40,0.38)',
            color: '#D4A228',
          }}
        >
          School Command Centre
        </div>

        {/* Title */}
        <h1
          className="font-display font-extrabold tracking-tighter"
          style={{ fontSize: '9.5vw', lineHeight: '0.92', color: '#E8E4DC' }}
        >
          Academia
          <span style={{ color: '#D4A228' }}>OS</span>
        </h1>

        {/* Accent line */}
        <div
          className="my-[2.8vh] rounded-full"
          style={{
            width: '11vw',
            height: '0.3vh',
            background: 'linear-gradient(90deg, transparent, #D4A228, transparent)',
          }}
        />

        {/* Tagline */}
        <p
          className="font-body"
          style={{
            fontSize: '2.3vw',
            color: '#B4C4D0',
            lineHeight: '1.5',
            textWrap: 'balance',
            maxWidth: '55vw',
          }}
        >
          Run every aspect of your school — from one secure platform.
        </p>

        {/* Live indicator */}
        <div className="mt-[4.5vh] flex items-center gap-[1.2vw]">
          <div
            className="rounded-full"
            style={{ width: '0.55vw', height: '0.55vw', background: '#17B890' }}
          />
          <span className="font-body" style={{ fontSize: '1.5vw', color: '#4F6E80' }}>
            Live in Production · v1.3.0
          </span>
          <div
            className="rounded-full"
            style={{ width: '0.55vw', height: '0.55vw', background: '#17B890' }}
          />
        </div>
      </div>
    </div>
  );
}
