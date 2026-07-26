"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

/**
 * Profile and password.
 *
 * `PATCH /shop/v1/account/profile` does not exist, so submitting shows the
 * pending state and stops — it does not claim to have saved anything. Wiring
 * it up is a matter of replacing the two handlers.
 */
export function ProfileForm() {
  const t = useTranslations("account");

  const [details, setDetails] = useState({
    first_name: "Abdullah",
    last_name: "Al Mutairi",
    email: "abdullah@example.com",
    phone: "0551234567",
  });

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string>();

  function onPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(
      passwords.next !== passwords.confirm ? t("passwordMismatch") : undefined,
    );
  }

  return (
    <div className="max-w-xl space-y-12">
      <form
        onSubmit={(event) => event.preventDefault()}
        className="space-y-5"
      >
        <h2 className="font-display text-h3 text-ink-900">{t("profile")}</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t("firstName")}
            value={details.first_name}
            onChange={(event) =>
              setDetails({ ...details, first_name: event.currentTarget.value })
            }
            autoComplete="given-name"
          />
          <TextField
            label={t("lastName")}
            value={details.last_name}
            onChange={(event) =>
              setDetails({ ...details, last_name: event.currentTarget.value })
            }
            autoComplete="family-name"
          />
        </div>

        <TextField
          label={t("email")}
          type="email"
          value={details.email}
          onChange={(event) => setDetails({ ...details, email: event.currentTarget.value })}
          autoComplete="email"
          dir="ltr"
        />

        <TextField
          label={t("phone")}
          value={details.phone}
          onChange={(event) => setDetails({ ...details, phone: event.currentTarget.value })}
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
        />

        <Button type="submit">{t("saveChanges")}</Button>
      </form>

      <form onSubmit={onPasswordSubmit} className="space-y-5 border-t border-hairline pt-10">
        <h2 className="font-display text-h3 text-ink-900">{t("changePassword")}</h2>

        <TextField
          label={t("currentPassword")}
          type="password"
          value={passwords.current}
          onChange={(event) =>
            setPasswords({ ...passwords, current: event.currentTarget.value })
          }
          autoComplete="current-password"
        />
        <TextField
          label={t("newPassword")}
          type="password"
          value={passwords.next}
          onChange={(event) => setPasswords({ ...passwords, next: event.currentTarget.value })}
          autoComplete="new-password"
        />
        <TextField
          label={t("confirmPassword")}
          type="password"
          value={passwords.confirm}
          onChange={(event) =>
            setPasswords({ ...passwords, confirm: event.currentTarget.value })
          }
          error={passwordError}
          autoComplete="new-password"
        />

        <Button type="submit" variant="secondary">
          {t("changePassword")}
        </Button>
      </form>
    </div>
  );
}
