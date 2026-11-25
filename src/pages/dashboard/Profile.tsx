import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, KeyRound, ShieldCheck, Trash2, User } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  ErrorState,
  FormField,
  NotificationBanner,
  SkeletonBlock,
  StatusText,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { validateUsername } from "../../lib/username";
import {
  formatIsoDate,
  isSafeProfilePhotoUrl,
  removeInvestorProfilePhoto,
  sessionApiRequest,
  uploadInvestorProfilePhoto,
} from "../../services/dashboardApi";

interface BackendProfileDTO {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  country: string;
  phone: string;
  preferredRail: string;
  emailAlerts: boolean;
  twoFactorEnabled: boolean;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function Profile() {
  const { user, refreshUserSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<BackendProfileDTO | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApiRequest<{ profile: BackendProfileDTO }>("/api/profile");
      setProfileData(res.profile);
      setDisplayName(res.profile.displayName || "");
      setUsername(res.profile.username || "");
      setPhone(res.profile.phone || "");
      setCountry(res.profile.country || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveError(null);
    setSavedMsg(null);

    if (!displayName.trim()) {
      setSaveError("Full name cannot be empty.");
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername) {
      const usernameCheck = validateUsername(trimmedUsername);
      if (!usernameCheck.valid) {
        setSaveError(usernameCheck.error || "Invalid username format.");
        return;
      }
    }

    setSaving(true);
    try {
      await sessionApiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          ...(trimmedUsername ? { username: trimmedUsername.toLowerCase() } : {}),
          phone: phone.trim(),
          country: country.trim(),
        }),
      });
      setSavedMsg("Profile details validated and saved to the server.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bitfury:profile-updated", {
            detail: { displayName: displayName.trim() },
          })
        );
      }
      await loadProfile();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to update profile details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSaveError(null);
    setSavedMsg(null);
    setPhotoBusy(true);
    try {
      const nextUrl = await uploadInvestorProfilePhoto(file);
      setProfileData((prev) => (prev ? { ...prev, photoUrl: nextUrl } : prev));
      setSavedMsg("Profile photo uploaded and saved to your investor account.");
      await refreshUserSession().catch(() => undefined);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to upload profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    setSaveError(null);
    setSavedMsg(null);
    setPhotoBusy(true);
    try {
      await removeInvestorProfilePhoto();
      setProfileData((prev) => (prev ? { ...prev, photoUrl: null } : prev));
      setSavedMsg("Profile photo removed.");
      await refreshUserSession().catch(() => undefined);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to remove profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const currentPhoto = isSafeProfilePhotoUrl(profileData?.photoUrl)
    ? profileData.photoUrl
    : null;
  const avatarInitial = (profileData?.displayName || profileData?.email || "I")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <DashboardLayout
      title="Profile"
      subtitle="Review your verified identity standing, update your display name, username, phone number, and country or jurisdiction."
    >
      {loading ? (
        <Card padding="lg" className="max-w-3xl">
          <SkeletonBlock className="h-64 w-full" />
        </Card>
      ) : error || !profileData ? (
        <ErrorState
          title="Profile Unavailable"
          message={error || "Unable to load profile."}
          onRetry={() => void loadProfile()}
        />
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7">
            <CardHeader
              title="Investor Identity & Contact Details"
              subtitle="All profile changes are validated through authenticated backend endpoints"
              action={<DashboardSymbol icon={User} tone="navy" size="md" />}
            />
            <CardBody className="space-y-5">
              {saveError && (
                <NotificationBanner
                  tone="error"
                  message={saveError}
                  onDismiss={() => setSaveError(null)}
                />
              )}
              {savedMsg && (
                <NotificationBanner
                  tone="success"
                  message={savedMsg}
                  onDismiss={() => setSavedMsg(null)}
                />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DCE4EC]">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg overflow-hidden border border-[#DCE4EC] bg-[#1F3649] text-white flex items-center justify-center shrink-0">
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={profileData.displayName || "Investor profile photo"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold font-heading">{avatarInitial}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#102030]">Investor Profile Photo</p>
                    <p className="text-xs text-[#5A6B7C] mt-0.5">
                      Displayed on your personal dashboard and account menu. JPEG, PNG, or WebP up to 2 MB.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-label="Choose profile photo file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={photoBusy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{currentPhoto ? "Change Photo" : "Upload Photo"}</span>
                  </Button>
                  {currentPhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={photoBusy}
                      onClick={() => void handlePhotoRemove()}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-rose-700">Remove</span>
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField id="p-fullname" label="Full Name">
                  <TextInput
                    id="p-fullname"
                    required
                    maxLength={120}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </FormField>

                <FormField
                  id="p-username"
                  label="Username"
                  hint="Unique lowercase investor handle (3–30 characters: a-z, 0-9, _)"
                >
                  <TextInput
                    id="p-username"
                    maxLength={30}
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    placeholder="investor_handle"
                    className="font-mono"
                  />
                </FormField>

                <FormField
                  id="p-email"
                  label="Email Address"
                  hint="Primary verified login identity (managed by Better Auth)"
                >
                  <TextInput id="p-email" value={profileData.email} disabled readOnly />
                </FormField>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField id="p-phone" label="Phone Number">
                    <TextInput
                      id="p-phone"
                      maxLength={40}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 20 7946 0000"
                    />
                  </FormField>

                  <FormField id="p-country" label="Country / Jurisdiction">
                    <TextInput
                      id="p-country"
                      maxLength={80}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United Kingdom"
                    />
                  </FormField>
                </div>

                <Button type="submit" loading={saving}>
                  Save Profile Updates
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title="Verification & Account Record"
              action={<DashboardSymbol icon={ShieldCheck} tone="green" size="md" />}
            />
            <CardBody className="space-y-4 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="h-12 w-12 rounded-lg overflow-hidden border border-[#DCE4EC] bg-[#1F3649] text-white flex items-center justify-center shrink-0">
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt={profileData.displayName || "Investor"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold font-heading">{avatarInitial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {profileData.displayName || "Investor"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{profileData.email}</p>
                </div>
              </div>
              <dl className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Username Handle</dt>
                  <dd className="font-mono font-semibold text-slate-900 break-all">
                    {profileData.username ? `@${profileData.username}` : "Not set"}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Email Verification Status</dt>
                  <dd>
                    <StatusText
                      status={profileData.emailVerified ? "Completed" : "Pending"}
                    />
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Account Standing</dt>
                  <dd>
                    <StatusText status={profileData.accountStatus || "Active"} />
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Account Role</dt>
                  <dd className="font-semibold text-slate-900 capitalize">
                    {profileData.role}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Account Creation Date</dt>
                  <dd className="font-mono text-slate-800">
                    {formatIsoDate(profileData.createdAt)}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="font-mono text-slate-800">
                    {formatIsoDate(profileData.updatedAt)}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">Account UID</dt>
                  <dd className="font-mono text-slate-600 truncate max-w-full sm:max-w-[180px]">
                    {profileData.uid}
                  </dd>
                </div>
              </dl>
              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/settings"
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Manage Password &amp; Security</span>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
