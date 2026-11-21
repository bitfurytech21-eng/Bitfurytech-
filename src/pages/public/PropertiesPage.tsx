import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";
import { buttonClasses, Card, EmptyState } from "../../components/ui";
import {
  PropertyOffering,
  subscribeProperties,
} from "../../services/firestoreService";
import { formatUsd } from "../../trading/tradingPage";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeProperties((items) => {
      setProperties(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
            Real Estate Holdings
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Commercial Property Catalog
          </h1>
          <p className="text-base text-slate-300">
            Live commercial real estate offerings published by BitfuryTech portfolio
            administrators.
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-xl bg-[#0b1129] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <Card tone="dark" padding="lg">
            <EmptyState
              tone="dark"
              title="No Active Property Offerings Published"
              description="Verified commercial real estate offerings appear here as soon as they are listed by a BitfuryTech administrator. You can still review Real Estate mandate tiers in our catalog."
              action={
                <Link
                  to="/investments-catalog"
                  className={buttonClasses({ variant: "gold", size: "md" })}
                >
                  View Real Estate Mandates
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <Card
                key={p.id}
                tone="dark"
                className="overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <img
                    src={p.image || "/images/asset_real_estate.jpg"}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-6 space-y-3">
                    <p className="text-xs text-slate-400">
                      <span className="text-yellow-400 font-semibold">{p.assetType}</span> ·{" "}
                      {p.status}
                    </p>
                    <h2 className="text-xl font-bold text-white">{p.title}</h2>
                    <p className="text-xs text-slate-400">{p.location}</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{p.summary}</p>
                    <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                      <div>
                        <dt className="text-slate-400">Min Entry</dt>
                        <dd className="font-mono tabular-nums font-bold text-white">
                          {formatUsd(p.minEntry)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Valuation</dt>
                        <dd className="font-mono tabular-nums font-bold text-white">
                          {formatUsd(p.valuation)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Target Yield</dt>
                        <dd className="font-mono tabular-nums text-yellow-400">
                          {p.targetYieldPct}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Occupancy</dt>
                        <dd className="font-mono tabular-nums text-emerald-400">
                          {p.occupancyPct}%
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <Link
                    to="/investments?plan=estate-commercial"
                    className={buttonClasses({ variant: "gold", size: "md", fullWidth: true })}
                  >
                    Participate in Portal
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
