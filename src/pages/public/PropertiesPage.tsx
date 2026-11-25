import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Images, X } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { buttonClasses, Card, EmptyState } from "../../components/ui";
import { PropertyOffering } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

const GALLERY_FALLBACKS = [
  "/images/commercial-property.jpg",
  "/images/hero_commercial_skyline.jpg",
  "/images/property_gallery_lobby.jpg",
];

function getPropertyGallery(p: PropertyOffering): string[] {
  const lead = p.image || "/images/commercial-property.jpg";
  const all = [lead, ...GALLERY_FALLBACKS];
  return Array.from(new Set(all));
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryTarget, setGalleryTarget] = useState<PropertyOffering | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/properties", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { properties: [] }))
      .then((data: { properties?: PropertyOffering[] }) => {
        if (!active) return;
        setProperties(Array.isArray(data.properties) ? data.properties : []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const published = useMemo(
    () => properties.filter((p) => p.published !== false),
    [properties]
  );

  const activePhotos = useMemo(
    () => (galleryTarget ? getPropertyGallery(galleryTarget) : []),
    [galleryTarget]
  );

  return (
    <PublicLayout>
      {/* Header Band */}
      <section className="public-hero text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Property listings
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Commercial property listings
          </h1>
          <p className="text-base text-slate-200 max-w-3xl">
            Review current listings, available property details, and supporting documents. Listings and availability may change.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
          <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <h2 className="text-sm font-heading font-bold text-[#102030]">
                Before you consider a property
              </h2>
              <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                Review the location, valuation, occupancy, entry requirements, income assumptions, and
                supporting documents. Property values and rental income can fall as well as rise, and
                property investments may be difficult to sell.
              </p>
            </div>
            <Link
              to="/investments-catalog?category=estate"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              View property plans
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-72 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] animate-pulse"
                />
              ))}
            </div>
          ) : published.length === 0 ? (
            <Card padding="lg">
              <EmptyState
                title="No property listings available"
                description="There are no published properties at the moment. Check the investment plan catalog for other available options."
                action={
                  <Link
                    to="/investments-catalog"
                    className={buttonClasses({ variant: "primary", size: "md" })}
                  >
              View property plans
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {published.map((p) => {
                const gallery = getPropertyGallery(p);
                return (
                  <Card
                    key={p.id}
                    className="overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                  >
                    <div>
                      <div className="relative h-48 w-full overflow-hidden border-b border-[#DCE4EC]">
                        <ResilientImage
                          src={gallery[0]}
                          alt={p.title}
                          fallbackLabel={p.assetType}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryTarget(p);
                            setGalleryIndex(0);
                          }}
                          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-[#1B4962]/90 hover:bg-[#1B4962] text-white text-[11px] font-heading font-bold px-2.5 py-1.5 rounded-none cursor-pointer"
                        >
                          <Images className="w-3.5 h-3.5" />
                          <span>Photos ({gallery.length})</span>
                        </button>
                      </div>

                      <div className="p-6 space-y-3">
                        <p className="text-xs text-[#5A6B7C]">
                          <span className="text-[#B92841] font-semibold">{p.assetType}</span> ·{" "}
                          {p.status}
                        </p>
                        <h2 className="text-xl font-heading font-bold text-[#102030]">{p.title}</h2>
                        <p className="text-xs text-[#5A6B7C]">{p.location}</p>
                        <p className="text-sm text-[#5A6B7C] leading-relaxed">{p.summary}</p>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#DCE4EC] text-xs">
                          <div>
                            <dt className="text-[#5A6B7C]">Minimum investment</dt>
                            <dd className="font-mono tabular-nums font-bold text-[#102030]">
                              {formatUsd(p.minEntry)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#5A6B7C]">Reported valuation</dt>
                            <dd className="font-mono tabular-nums font-bold text-[#102030]">
                              {formatUsd(p.valuation)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#5A6B7C]">Indicative yield</dt>
                            <dd className="font-mono tabular-nums font-semibold text-[#B92841]">
                              {p.targetYieldPct}%
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#5A6B7C]">Reported occupancy</dt>
                            <dd className="font-mono tabular-nums font-semibold text-[#15803D]">
                              {p.occupancyPct}%
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="px-6 pb-6 space-y-2.5">
                      {p.supportingDocUrl && (
                        <a
                          href={p.supportingDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                        >
                          View document ({p.supportingDocName || "Property details"})
                        </a>
                      )}
                      <Link
                        to={`/invest?kind=property&id=${encodeURIComponent(p.id)}`}
                        className={buttonClasses({ variant: "primary", size: "md", fullWidth: true })}
                      >
                        View in account
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Property Photo Gallery Modal */}
      {galleryTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-gallery-title"
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#DCE4EC] rounded-[5px] max-w-3xl w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-[#DCE4EC] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 id="property-gallery-title" className="text-base font-heading font-bold text-[#102030] truncate">
                  {galleryTarget.title}
                </h3>
                <p className="text-xs text-[#5A6B7C] truncate">{galleryTarget.location}</p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryTarget(null)}
                aria-label="Close property gallery"
                className="p-2 text-[#1B4962] hover:bg-[#F6F8FA] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="h-72 sm:h-96 w-full rounded-[5px] overflow-hidden border border-[#DCE4EC] bg-[#F6F8FA]">
                <ResilientImage
                  src={activePhotos[galleryIndex]}
                  alt={`${galleryTarget.title} view ${galleryIndex + 1}`}
                  fallbackLabel={galleryTarget.assetType}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {activePhotos.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setGalleryIndex(idx)}
                    className={`h-20 rounded-[5px] overflow-hidden border-2 cursor-pointer transition-opacity ${
                      galleryIndex === idx
                        ? "border-[#E94D65] opacity-100"
                        : "border-[#DCE4EC] opacity-75 hover:opacity-100"
                    }`}
                  >
                    <ResilientImage
                      src={src}
                      alt={`${galleryTarget.title} thumbnail ${idx + 1}`}
                      fallbackLabel={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
