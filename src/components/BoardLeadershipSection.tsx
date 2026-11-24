import { LEADERSHIP_TEAM } from "../data/leadershipTeam";

export default function BoardLeadershipSection() {
  return (
    <section
      aria-labelledby="board-leadership-heading"
      className="bg-[#F6F8FA] border-b border-[#DCE4EC]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
            Executive Board
          </p>
          <h2
            id="board-leadership-heading"
            className="text-3xl font-heading font-bold tracking-tight text-[#102030]"
          >
            Meet the Board Members
          </h2>
          <p className="text-sm text-[#5A6B7C] leading-relaxed">
            Leadership overseeing portfolio governance, algorithmic strategy, corporate finance, and
            client settlement operations at Bitfury Tech Investment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {LEADERSHIP_TEAM.map((member) => (
            <article
              key={member.name}
              className="overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#EDF3F7]">
                <img
                  src={member.image}
                  alt={`${member.name}, ${member.role}`}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="p-5 space-y-1">
                <h3 className="text-base font-heading font-bold text-[#102030]">{member.name}</h3>
                <p className="text-xs font-medium text-[#5A6B7C]">{member.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
