import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, ShieldCheck, User } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormField,
  NotificationBanner,
  SkeletonBlock,
  StatusText,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { validateUsername } from "../../lib/username";
import { apiRequest, formatIsoDate } from "../../services/dashboardApi";

interface BackendProfileDTO {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
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
  const { firebaseUser, idToken } = useAuth();
  const [profileData, setProfileData] = useState<BackendProfileDTO | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{ profile: BackendProfileDTO }>("/api/profile", token);
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
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
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
      const token = idToken || (await firebaseUser.getIdToken());
      await apiRequest("/api/profile", token, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          ...(trimmedUsername ? { username: trimmedUsername.toLowerCase() } : {}),
          phone: phone.trim(),
          country: country.trim(),
        }),
      });
      setSavedMsg("Profile details validated and saved to the server.");
      await loadProfile();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to update profile details."
      );
    } finally {
      setSaving(false);
    }
  };

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
              action={<User className="w-4 h-4 text-slate-400" />}
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
                  hint="Primary verified login identity (managed by Firebase Authentication)"
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
              action={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
            />
            <CardBody className="space-y-3 text-xs">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Username Handle</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {profileData.username ? `@${profileData.username}` : "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email Verification Status</dt>
                  <dd>
                    <StatusText
                      status={profileData.emailVerified ? "Completed" : "Pending"}
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Account Standing</dt>
                  <dd>
                    <StatusText status={profileData.accountStatus || "Active"} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Account Role</dt>
                  <dd className="font-semibold text-slate-900 capitalize">
                    {profileData.role}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Account Creation Date</dt>
                  <dd className="font-mono text-slate-800">
                    {formatIsoDate(profileData.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="font-mono text-slate-800">
                    {formatIsoDate(profileData.updatedAt)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Account UID</dt>
                  <dd className="font-mono text-slate-600 truncate max-w-[180px]">
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
