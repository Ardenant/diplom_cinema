import { PasswordForm } from "@/components/account/password-form";

export const metadata = { title: "Смена пароля" };

export default function PasswordPage() {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Смена пароля
      </h1>
      <PasswordForm />
    </div>
  );
}
