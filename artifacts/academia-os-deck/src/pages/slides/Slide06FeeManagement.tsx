export default function Slide06FeeManagement() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden px-[5.5vw] py-[5vh]"
      style={{ background: '#0D1B2A' }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(23,184,144,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10">
        <div
          className="mb-[1.5vh] font-body font-medium tracking-[0.22em] uppercase"
          style={{ fontSize: '1.4vw', color: '#D4A228' }}
        >
          Financial Management
        </div>
        <h2
          className="font-display font-bold tracking-tight"
          style={{ fontSize: '4vw', lineHeight: '1.1', color: '#E8E4DC' }}
        >
          Fee Management &amp; <span style={{ color: '#17B890' }}>Payments</span>
        </h2>
      </div>

      {/* Two-column grid */}
      <div className="relative z-10 mt-[3.5vh] grid grid-cols-2 gap-x-[4vw] gap-y-[2vh]" style={{ gridTemplateRows: 'repeat(3, auto)' }}>
        {/* Item 1 */}
        <div className="flex items-start gap-[1.5vw]">
          <div
            className="flex-shrink-0 mt-[0.5vh] font-display font-bold text-center"
            style={{ fontSize: '1.4vw', color: '#D4A228', width: '2.5vw' }}
          >
            01
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.95vw', color: '#E8E4DC' }}>
              Multiple Fee Types
            </div>
            <div className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC', lineHeight: '1.45' }}>
              Tuition, transport, meals, Smart ID &amp; extras
            </div>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-start gap-[1.5vw]">
          <div
            className="flex-shrink-0 mt-[0.5vh] font-display font-bold text-center"
            style={{ fontSize: '1.4vw', color: '#D4A228', width: '2.5vw' }}
          >
            02
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.95vw', color: '#E8E4DC' }}>
              Term Billing
            </div>
            <div className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC', lineHeight: '1.45' }}>
              Grace periods &amp; auto-suspension on overdue accounts
            </div>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-start gap-[1.5vw]">
          <div
            className="flex-shrink-0 mt-[0.5vh] font-display font-bold text-center"
            style={{ fontSize: '1.4vw', color: '#D4A228', width: '2.5vw' }}
          >
            03
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.95vw', color: '#E8E4DC' }}>
              Payment Recording
            </div>
            <div className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC', lineHeight: '1.45' }}>
              Reference, method, amount, date &amp; receipt
            </div>
          </div>
        </div>

        {/* Item 4 */}
        <div className="flex items-start gap-[1.5vw]">
          <div
            className="flex-shrink-0 mt-[0.5vh] font-display font-bold text-center"
            style={{ fontSize: '1.4vw', color: '#D4A228', width: '2.5vw' }}
          >
            04
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.95vw', color: '#E8E4DC' }}>
              Outstanding Balances
            </div>
            <div className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC', lineHeight: '1.45' }}>
              Carried forward automatically each term
            </div>
          </div>
        </div>

        {/* Item 5 */}
        <div className="flex items-start gap-[1.5vw]">
          <div
            className="flex-shrink-0 mt-[0.5vh] font-display font-bold text-center"
            style={{ fontSize: '1.4vw', color: '#17B890', width: '2.5vw' }}
          >
            05
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.95vw', color: '#E8E4DC' }}>
              Instant Receipts
            </div>
            <div className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC', lineHeight: '1.45' }}>
              Generated on the spot for every payment
            </div>
          </div>
        </div>

        {/* Item 6 */}
        <div className="flex items-start gap-[1.5vw]">
          <div
            className="flex-shrink-0 mt-[0.5vh] font-display font-bold text-center"
            style={{ fontSize: '1.4vw', color: '#17B890', width: '2.5vw' }}
          >
            06
          </div>
          <div>
            <div className="font-display font-semibold" style={{ fontSize: '1.95vw', color: '#E8E4DC' }}>
              Arrears Alerts
            </div>
            <div className="font-body" style={{ fontSize: '1.6vw', color: '#7A96AC', lineHeight: '1.45' }}>
              Sent to parents via the notification centre
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '0.5vh', background: 'linear-gradient(90deg, transparent 0%, #D4A228 30%, #17B890 70%, transparent 100%)' }}
      />
    </div>
  );
}
