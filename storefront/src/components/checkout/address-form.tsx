"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { SelectField, TextField } from "@/components/ui/field";
import type { AddressInput, City, Region } from "@/types/shop";

/**
 * Kuwaiti delivery address: Governorate → Area → Block → Street → Building.
 *
 * That is the whole address a Kuwaiti courier needs, and it is how people here
 * actually give directions. The form used to ask for a Saudi National Address
 * short code, a postal code and an additional number — none of which exist in
 * Kuwaiti addressing — so three of the nine fields could never be filled in
 * meaningfully. They are gone.
 *
 * Governorate and area are both slugs from the same server vocabulary
 * (/regions and /cities). They used to come from different sources with
 * different id schemes, so no area ever matched the selected governorate and
 * the dropdown stayed empty.
 */

// Kuwaiti mobiles are 8 digits starting 5, 6 or 9. Accepted with or without
// the +965 country code, and with any spacing, because that is how people type
// a number they are reading off a phone.
const KUWAIT_MOBILE_PATTERN = /^(?:\+?965)?[569]\d{7}$/;

export interface AddressFormErrors {
  [key: string]: string | undefined;
}

export function validateAddress(
  value: Partial<AddressInput>,
  messages: { required: string; invalidPhone: string },
): AddressFormErrors {
  const errors: AddressFormErrors = {};

  if (!value.full_name?.trim()) errors.full_name = messages.required;

  if (!value.phone?.trim()) errors.phone = messages.required;
  else if (!KUWAIT_MOBILE_PATTERN.test(value.phone.replace(/[\s-]+/g, "")))
    errors.phone = messages.invalidPhone;

  if (!value.governorate_id) errors.governorate_id = messages.required;
  if (!value.area_id) errors.area_id = messages.required;
  if (!value.block?.trim()) errors.block = messages.required;
  if (!value.street?.trim()) errors.street = messages.required;
  if (!value.building?.trim()) errors.building = messages.required;

  return errors;
}

export function AddressForm({
  value,
  onChange,
  errors,
  regions,
  cities,
}: {
  value: Partial<AddressInput>;
  onChange: (next: Partial<AddressInput>) => void;
  errors: AddressFormErrors;
  regions: Region[];
  cities: City[];
}) {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");

  const areasInGovernorate = useMemo(
    () =>
      cities.filter(
        (city) => !value.governorate_id || city.region_id === value.governorate_id,
      ),
    [cities, value.governorate_id],
  );

  function set<K extends keyof AddressInput>(key: K, next: AddressInput[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("fullName")}
          value={value.full_name ?? ""}
          onChange={(event) => set("full_name", event.currentTarget.value)}
          error={errors.full_name}
          autoComplete="name"
        />
        <TextField
          label={t("phone")}
          hint={t("phoneHint")}
          value={value.phone ?? ""}
          onChange={(event) => set("phone", event.currentTarget.value)}
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label={t("governorate")}
          value={value.governorate_id ?? ""}
          error={errors.governorate_id}
          onChange={(event) => {
            // Changing governorate invalidates the area beneath it.
            onChange({
              ...value,
              governorate_id: event.currentTarget.value,
              area_id: "",
            });
          }}
        >
          <option value="">{t("selectGovernorate")}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t("area")}
          value={value.area_id ?? ""}
          error={errors.area_id}
          disabled={!value.governorate_id}
          onChange={(event) => set("area_id", event.currentTarget.value)}
        >
          <option value="">{t("selectArea")}</option>
          {areasInGovernorate.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          label={t("block")}
          value={value.block ?? ""}
          onChange={(event) => set("block", event.currentTarget.value)}
          error={errors.block}
          inputMode="numeric"
          dir="ltr"
        />
        <TextField
          label={t("street")}
          value={value.street ?? ""}
          onChange={(event) => set("street", event.currentTarget.value)}
          error={errors.street}
          autoComplete="address-line1"
        />
        <TextField
          label={t("building")}
          value={value.building ?? ""}
          onChange={(event) => set("building", event.currentTarget.value)}
          error={errors.building}
          dir="ltr"
        />
      </div>

      <TextField
        label={t("extraDirections")}
        hint={t("extraDirectionsHint")}
        optional={tCommon("optional")}
        value={value.extra_directions ?? ""}
        onChange={(event) => set("extra_directions", event.currentTarget.value)}
        autoComplete="address-line2"
      />
    </div>
  );
}
