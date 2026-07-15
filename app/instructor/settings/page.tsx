import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function InstructorSettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">Manage your account security.</p>
      <div className="mt-6 max-w-lg">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
