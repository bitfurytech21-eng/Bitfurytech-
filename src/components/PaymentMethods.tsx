import { Landmark } from "lucide-react";

const PAYMENT_METHODS = [
  { name: "Bitcoin (BTC)", image: "/images/payment-methods/card5.svg" },
  { name: "Ethereum (ETH)", image: "/images/payment-methods/card6.svg" },
  { name: "USDT (TRC20)", image: "/images/payment-methods/card15.svg" },
  { name: "Bank Wire", image: null },
];

export default function PaymentMethods() {
  return (
    <section aria-labelledby="payment-methods-heading" className="bg-[#14374B] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_60px_rgba(16,32,48,0.22)]">
        <div className="bg-[#1B4962] px-5 py-5 sm:px-8 sm:py-7">
          <h2 id="payment-methods-heading" className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Payment We Accept
          </h2>
        </div>
        <div className="bg-[#F6F8FA] px-5 py-6 sm:px-8 sm:py-9">
          <p className="max-w-3xl text-sm leading-relaxed text-[#4A5B6C] sm:text-base">
            Choose from the settlement methods currently supported in the client account.
          </p>
          <h3 className="mt-6 border-t border-[#DCE4EC] pt-5 text-base font-bold text-[#102030]">
            Available settlement methods
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {PAYMENT_METHODS.map((method, index) => (
              <li
                key={method.name}
                className="bf-reveal flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-[#DCE4EC] bg-white p-4 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#E94D65]/60 hover:shadow-lg" style={{ animationDelay: `${index * 110}ms` }}
              >
                {method.image ? (
                  <img src={method.image} alt="" className="h-10 w-10 object-contain" loading="lazy" />
                ) : (
                  <Landmark aria-hidden="true" className="h-10 w-10 text-[#1B4962]" strokeWidth={1.6} />
                )}
                <span className="text-xs font-semibold text-[#102030] sm:text-sm">{method.name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-[#5A6B7C]">
            Supported options and settlement requirements may vary by account and offering.
          </p>
        </div>
      </div>
    </section>
  );
}
