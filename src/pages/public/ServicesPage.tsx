import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";
import { buttonClasses } from "../../components/ui";

const ADVISORY_SERVICES = [
  {
    index: "01",
    title: "Plan information",
    description:
      "Review the published plans, asset categories, timeframes, and entry requirements. Terms vary by plan."
  },
  {
    index: "02",
    title: "Portfolio information",
    description:
      "Compare information about digital assets, equities, and real estate, including the risks and costs associated with each option."
  },
  {
    index: "03",
    title: "Payments and transactions",
    description:
      "Learn how deposit and withdrawal requests are submitted, reviewed, and recorded in your account."
  },
  {
    index: "04",
    title: "Plan selection",
    description:
      "Compare the available options and review any applicable fees and restrictions before changing a plan."
  },
  {
    index: "05",
    title: "Account records",
    description:
      "Use the client portal to review account balances, transaction references, requests, and available statements."
  },
  {
    index: "06",
    title: "Market information",
    description:
      "Find company-published information about markets and asset categories to help you review available opportunities."
  },
];

const RESEARCH_TOPICS = [
  {
    title: "Market movements",
    body: "Review price changes and market activity over time.",
  },
  {
    title: "Asset information",
    body: "Compare the features, costs, and risks listed for each asset type.",
  },
  {
    title: "Economic updates",
    body: "Economic changes can affect borrowing costs, company results, and property values.",
  },
  {
    title: "Investment risks",
    body: "Consider potential losses, how long funds may be committed, and how easily an asset can be sold.",
  },
];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <section className="public-hero text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Services and platform information
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Investment information and account services
          </h1>
          <p className="text-base text-slate-200 max-w-3xl leading-relaxed">
            Explore published information about investment plans, asset categories, payment processes,
            property listings, and account tools. Review the terms and risks that apply to each option.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
          <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 text-sm text-[#5A6B7C] leading-relaxed">
            <strong className="text-[#102030]">About this platform:</strong> The website provides
            general investment information and account tools. It does not provide personalized
            financial advice. Consider your circumstances and the risks before investing.
          </div>

          <section className="space-y-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Available services
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Tools to review your account and options
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ADVISORY_SERVICES.map((srv) => (
                <div
                  key={srv.index}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-7 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <h3 className="text-lg font-heading font-bold text-[#102030]">{srv.title}</h3>
                  <p className="text-sm text-[#5A6B7C] leading-relaxed">{srv.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 sm:p-8 space-y-6">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Market information and plan details
              </p>
              <h2 className="text-2xl font-heading font-bold text-[#102030]">
                Review information before you decide
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Market information can help you compare options, but it cannot predict results or remove risk. Values and income may fall as well as rise.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {RESEARCH_TOPICS.map((topic) => (
                <div key={topic.title} className="bg-white border border-[#DCE4EC] rounded-[5px] p-5 space-y-2">
                  <h3 className="text-sm font-heading font-bold text-[#102030]">{topic.title}</h3>
                  <p className="text-xs text-[#5A6B7C] leading-relaxed">{topic.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/investments-catalog"
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              Explore Opportunities
            </Link>
            <Link
              to="/register"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
