import { useCallback, useEffect, useState } from "react";
import { Building2, Edit3, Eye, EyeOff, FileUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  DataTable,
  FormField,
  Modal,
  NotificationBanner,
  SelectInput,
  StatusText,
  TableColumn,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { sessionApiRequest } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminPropertyRow {
  id: string;
  title: string;
  location: string;
  assetType: string;
  targetYieldPct: number;
  minEntry: number;
  valuation: number;
  occupancyPct: number;
  status: "Open" | "Fully Subscribed";
  published?: boolean;
  image: string;
  summary: string;
  supportingDocUrl?: string;
  supportingDocName?: string;
}

const DEFAULT_FORM: Omit<AdminPropertyRow, "id"> = {
  title: "",
  location: "",
  assetType: "Commercial Real Estate",
  targetYieldPct: 9.2,
  minEntry: 5000,
  valuation: 4200000,
  occupancyPct: 95,
  status: "Open",
  published: true,
  image: "/images/commercial-property.jpg",
  summary: "",
  supportingDocUrl: "",
  supportingDocName: "",
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read selected file."));
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export default function AdminProperties() {
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<AdminPropertyRow, "id">>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadProperties = useCallback(async () => {
        setLoading(true);
    setError(null);
    try {
            const res = await sessionApiRequest<{ properties: AdminPropertyRow[] }>(
        "/api/admin/properties");
      setProperties(res.properties);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load properties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: AdminPropertyRow) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      location: p.location,
      assetType: p.assetType,
      targetYieldPct: p.targetYieldPct,
      minEntry: p.minEntry,
      valuation: p.valuation,
      occupancyPct: p.occupancyPct,
      status: p.status,
      published: p.published !== false,
      image: p.image || "/images/commercial-property.jpg",
      summary: p.summary,
      supportingDocUrl: p.supportingDocUrl || "",
      supportingDocName: p.supportingDocName || "",
    });
    setModalOpen(true);
  };

  const handleUpload = async (file: File, kind: "properties" | "document") => {
        if (kind === "properties") setUploadingImage(true);
    else setUploadingDoc(true);
    setBanner(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);
            const res = await sessionApiRequest<{ url: string; fileName: string }>(
        "/api/admin/uploads",
        {
          method: "POST",
          body: JSON.stringify({
            kind,
            fileName: file.name,
            dataUrl,
          }),
        }
      );
      if (kind === "properties") {
        setForm((prev) => ({ ...prev, image: res.url }));
      } else {
        setForm((prev) => ({
          ...prev,
          supportingDocUrl: res.url,
          supportingDocName: file.name,
        }));
      }
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "File upload failed.",
      });
    } finally {
      if (kind === "properties") setUploadingImage(false);
      else setUploadingDoc(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
        setSaving(true);
    setBanner(null);

    try {
            if (editingId) {
        await sessionApiRequest(`/api/admin/properties/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setBanner({ tone: "success", text: `Updated property "${form.title}".` });
      } else {
        await sessionApiRequest("/api/admin/properties", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setBanner({ tone: "success", text: `Published property "${form.title}".` });
      }
      setModalOpen(false);
      await loadProperties();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to save property listing.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (p: AdminPropertyRow) => {
        const nextPublished = !(p.published !== false);
    try {
            await sessionApiRequest(`/api/admin/properties/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...p, published: nextPublished }),
      });
      setBanner({
        tone: "success",
        text: `${p.title} is now ${nextPublished ? "published" : "unpublished"}.`,
      });
      await loadProperties();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to toggle visibility.",
      });
    }
  };

  const handleDelete = async (p: AdminPropertyRow) => {
        try {
            await sessionApiRequest(`/api/admin/properties/${p.id}`, {
        method: "DELETE",
      });
      setBanner({ tone: "success", text: `Removed property "${p.title}".` });
      await loadProperties();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to delete property.",
      });
    }
  };

  const columns: TableColumn<AdminPropertyRow>[] = [
    {
      key: "property",
      header: "Property Asset",
      render: (p) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <img
            src={p.image || "/images/commercial-property.jpg"}
            alt={p.title}
            className="w-12 h-9 object-cover rounded border border-slate-200 shrink-0"
          />
          <div>
            <p className="font-semibold text-slate-900">{p.title}</p>
            <p className="text-[11px] text-slate-500">
              {p.location} · {p.assetType}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "valuation",
      header: "Valuation / Min Entry",
      align: "right",
      render: (p) => (
        <div className="font-mono tabular-nums text-xs">
          <p className="font-semibold text-slate-900">{formatUsd(p.valuation)}</p>
          <p className="text-slate-500">Min {formatUsd(p.minEntry)}</p>
        </div>
      ),
    },
    {
      key: "yield",
      header: "Yield / Occupancy",
      align: "right",
      render: (p) => (
        <span className="font-mono text-xs text-slate-700">
          {p.targetYieldPct}% · {p.occupancyPct}% occ.
        </span>
      ),
    },
    {
      key: "visibility",
      header: "Status / Visibility",
      align: "right",
      render: (p) => (
        <div className="space-y-0.5">
          <StatusText status={p.status} />
          <p className="text-[11px] text-slate-500">
            {p.published === false ? "Unpublished" : "Published"}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <div className="inline-flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleTogglePublished(p)}
            title={p.published === false ? "Publish listing" : "Unpublish listing"}
          >
            {p.published === false ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => void handleDelete(p)}
            title="Delete property"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Properties Management"
      subtitle="Create, edit, publish/unpublish, and upload asset imagery and supporting prospectuses for property listings."
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          <span>Add Property Offering</span>
        </Button>
      }
    >
      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      <Card>
        <CardHeader
          title={`Real Estate Catalog (${properties.length})`}
          action={<DashboardSymbol icon={Building2} tone="navy" size="md" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={properties}
            rowKey={(p) => p.id}
            loading={loading}
            error={error}
            onRetry={() => void loadProperties()}
            emptyTitle="No Property Offerings"
            emptyDescription="Add your first institutional real estate offering using the button above."
            emptyAction={
              <Button size="sm" onClick={openCreate}>
                Add Property Offering
              </Button>
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Property Offering" : "Create Property Offering"}
        description="Images and supporting documents are uploaded directly to the BitfuryTech server."
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="prop-title" label="Property Title">
              <TextInput
                id="prop-title"
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </FormField>
            <FormField id="prop-loc" label="Location">
              <TextInput
                id="prop-loc"
                required
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </FormField>
            <FormField id="prop-type" label="Asset Type">
              <TextInput
                id="prop-type"
                required
                value={form.assetType}
                onChange={(e) => setForm((p) => ({ ...p, assetType: e.target.value }))}
              />
            </FormField>
            <FormField id="prop-status" label="Subscription Status">
              <SelectInput
                id="prop-status"
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value === "Fully Subscribed" ? "Fully Subscribed" : "Open",
                  }))
                }
              >
                <option value="Open">Open</option>
                <option value="Fully Subscribed">Fully Subscribed</option>
              </SelectInput>
            </FormField>
            <FormField id="prop-val" label="Valuation (USD)">
              <TextInput
                id="prop-val"
                type="number"
                numeric
                min={1}
                required
                value={form.valuation}
                onChange={(e) => setForm((p) => ({ ...p, valuation: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="prop-min" label="Minimum Entry (USD)">
              <TextInput
                id="prop-min"
                type="number"
                numeric
                min={1}
                required
                value={form.minEntry}
                onChange={(e) => setForm((p) => ({ ...p, minEntry: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="prop-yield" label="Target Annual Yield (%)">
              <TextInput
                id="prop-yield"
                type="number"
                numeric
                step="0.1"
                min={0}
                required
                value={form.targetYieldPct}
                onChange={(e) =>
                  setForm((p) => ({ ...p, targetYieldPct: Number(e.target.value) }))
                }
              />
            </FormField>
            <FormField id="prop-occ" label="Occupancy (%)">
              <TextInput
                id="prop-occ"
                type="number"
                numeric
                min={0}
                max={100}
                required
                value={form.occupancyPct}
                onChange={(e) => setForm((p) => ({ ...p, occupancyPct: Number(e.target.value) }))}
              />
            </FormField>
          </div>

          <FormField id="prop-summary" label="Offering Summary">
            <TextAreaInput
              id="prop-summary"
              rows={3}
              required
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-md p-3.5 text-xs">
            <div className="space-y-2 min-w-0">
              <label
                htmlFor="prop-img-upload"
                className="font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Property Image Upload (JPG/PNG/WEBP)</span>
              </label>
              <input
                id="prop-img-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file, "properties");
                }}
                className="block w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:bg-white file:text-xs file:font-semibold"
              />
              <p className="text-[11px] font-mono text-slate-500 truncate">
                {uploadingImage ? "Uploading image..." : form.image}
              </p>
            </div>

            <div className="space-y-2 min-w-0">
              <label
                htmlFor="prop-doc-upload"
                className="font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Supporting Document (PDF/TXT/Image)</span>
              </label>
              <input
                id="prop-doc-upload"
                type="file"
                accept="application/pdf,text/plain,image/jpeg,image/png"
                disabled={uploadingDoc}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file, "document");
                }}
                className="block w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:bg-white file:text-xs file:font-semibold"
              />
              <p className="text-[11px] font-mono text-slate-500 truncate">
                {uploadingDoc
                  ? "Uploading document..."
                  : form.supportingDocName || form.supportingDocUrl || "Optional prospectus file"}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published !== false}
              onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <span>Published on public &amp; customer property catalogs</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving || uploadingImage || uploadingDoc}>
              {editingId ? "Save Changes" : "Create Property"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
