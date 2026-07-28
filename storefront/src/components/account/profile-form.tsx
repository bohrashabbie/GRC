"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { saveProfile, updatePassword } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import type { Customer, LocaleCode } from "@/types/shop";

/**
 * Profile details and password, both against the real endpoints.
 *
 * Seeded from the signed-in customer rather than placeholder text — this used
 * to show a hardcoded "Abdullah Al Mutairi" to everyone, which looks like data
 * right up until you try to save it.
 *
 * Saving refreshes the router because the account layout renders the name and
 * email server-side; without it the heading would keep showing the old name
 * until a full reload.
 */
export function ProfileForm({ customer }: { customer: Customer }) {
  const t = useTranslations("account");
  const locale = useLocale() as LocaleCode;
  const router = useRouter();

  const [details, setDetails] = useState({
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
  });
  const [detailsError, setDetailsError] = useState<string>();
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [savingDetails, startSavingDetails] = useTransition();

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string>();
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, startSavingPassword] = useTransition();

  function onDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDetailsError(undefined);
    setDetailsSaved(false);

    startSavingDetails(async () => {
      const result = await saveProfile(
        {
          first_name: details.first_name.trim(),
          last_name: details.last_name.trim(),
          email: details.email.trim(),
          phone: details.phone.trim() || null,
        },
        locale,
      );
      if (result.ok) {
        setDetailsSaved(true);
        router.refresh();
      } else {
        setDetailsError(
          result.code === "email_already_registered" ? t("emailTaken") : result.message,
        );
      }
    });
  }

  function onPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(undefined);
    setPasswordSaved(false);

    if (passwords.next !== passwords.confirm) {
      setPasswordError(t("passwordMismatch"));
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }

    startSavingPassword(async () => {
      const result = await updatePassword(passwords.current, passwords.next, locale);
      if (result.ok) {
        setPasswordSaved(true);
        setPasswords({ current: "", next: "", confirm: "" });
      } else {
        setPasswordError(
          result.code === "authentication_failed"
            ? t("currentPasswordWrong")
            : result.message,
        );
      }
    });
  }

  return (
    <div className="max-w-xl space-y-12">
      <form onSubmit={onDetailsSubmit} className="space-y-5">
        <h2 className="font-display text-h3 text-ink-900">{t("profile")}</h2>

        {detailsError && (
          <div role="alert" className="border-s-2 border-brick-600 bg-sand-100 px-4 py-3">
            <p className="text-sm text-brick-600">{detailsError}</p>
          </div>
        )}
        {detailsSaved && (
          <div role="status" className="border-s-2 border-palm-600 bg-sand-100 px-4 py-3">
            <p className="text-sm text-palm-600">{t("saved")}</p>
          </div>
        )}

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

        <Button type="submit" disabled={savingDetails}>
          {savingDetails ? t("submitting") : t("saveChanges")}
        </Button>
      </form>

      <form onSubmit={onPasswordSubmit} className="space-y-5 border-t border-hairline pt-10">
        <h2 className="font-display text-h3 text-ink-900">{t("changePassword")}</h2>

        {passwordSaved && (
          <div role="status" className="border-s-2 border-palm-600 bg-sand-100 px-4 py-3">
            <p className="text-sm text-palm-600">{t("passwordChanged")}</p>
          </div>
        )}

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

        <Button type="submit" variant="secondary" disabled={savingPassword}>
          {savingPassword ? t("submitting") : t("changePassword")}
        </Button>
      </form>
    </div>
  );
}
