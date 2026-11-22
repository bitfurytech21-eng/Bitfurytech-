import { Landmark } from "lucide-react";

const PAYMENT_METHODS = [
  { name: "Bitcoin (BTC)", image: "/images/payment-methods/card5.svg" },
  { name: "Ethereum (ETH)", image: "/images/payment-methods/card6.svg" },
  { name: "USDT (TRC20)", image: "/images/payment-methods/card15.svg" },
  { name: "Bank Wire", image: null },
];

export default function PaymentMethods() {
  return (
    <section aria-labelledby="payment-methods-heading" className="bg-[#1B2353] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="bg-[#18A957] px-5 py-4 sm:px-7 sm:py-5">
          <h2 id="payment-methods-heading" className="font-serif text-2xl text-white sm:text-3xl">
            Payment We Accept
          </h2>
        </div>
        <div className="bg-white px-5 py-6 sm:px-7 sm:py-8">
          <p className="max-w-3xl text-sm leading-relaxed text-[#35353A] sm:text-base">
            Choose from the settlement methods currently supported in the client account.
          </p>
          <h3 className="mt-6 border-t border-[#E7E4EB] pt-5 text-base font-bold text-[#17171B]">
            Available settlement methods
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method.name}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-[#E8E5ED] bg-[#FBFAFC] p-3 text-center"
              >
                {method.image ? (
                  <img src={method.image} alt="" className="h-10 w-10 object-contain" loading="lazy" />
                ) : (
                  <Landmark aria-hidden="true" className="h-10 w-10 text-[#513A76]" strokeWidth={1.6} />
                )}
                <span className="text-xs font-semibold text-[#303039] sm:text-sm">{method.name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-[#68666E]">
            Supported options and settlement requirements may vary by account and offering.
          </p>
        </div>
      </div>
    </section>
  );
}
