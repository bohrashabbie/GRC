"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { SelectField, TextField } from "@/components/ui/field";
import type { AddressInput, City, Region } from "@/types/shop";

/**
 * Saudi National Address form.
 *
 * `short_address` is the 8-character building code (4 letters + 4 digits, e.g.
 * RRRD2929). It is the field most Saudi customers actually know, so it leads —
 * and once it validates, the detailed fields collapse to optional. The real
 * backend will resolve the rest from the code via the National Address API;
 * until then they stay visible and editable.
 */

const SHORT_ADDRESS_PATTERN = /^[A-Za-z]{4}\d{4}$/;
const SAUDI_MOBILE_PATTERN = /^05\d{8}$/;

export interface AddressFormErrors {
  [key: string]: string | undefined;
}

export function validateAddress(
  value: Partial<AddressInput>,
  messages: { required: string; invalidPhone: string; invalidShortAddress: string },
): AddressFormErrors {
  const errors: AddressFormErrors = {};

  if (!value.full_name?.trim()) errors.full_name = messages.required;

  if (!value.phone?.trim()) errors.phone = messages.required;
  else if (!SAUDI_MOBILE_PATTERN.test(value.phone.replace(/\s+/g, "")))
    errors.phone = messages.invalidPhone;

  if (value.short_address && !SHORT_ADDRESS_PATTERN.test(value.short_address.trim()))
    errors.short_address = messages.invalidShortAddress;

  if (!value.street?.trim()) errors.street = messages.required;
  if (!value.district?.trim()) errors.district = messages.required;
  if (!value.region_id) errors.region_id = messages.required;
  if (!value.city_id) errors.city_id = messages.required;

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
  const [shortAddressTouched, setShortAddressTouched] = useState(false);

  const citiesInRegion = useMemo(
    () => cities.filter((city) => !value.region_id || city.region_id === value.region_id),
    [cities, value.region_id],
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

      <TextField
        label={t("shortAddress")}
        hint={t("shortAddressHint")}
        optional={tCommon("optional")}
        value={value.short_address ?? ""}
        onChange={(event) => set("short_address", event.currentTarget.value.toUpperCase())}
        onBlur={() => setShortAddressTouched(true)}
        error={shortAddressTouched ? errors.short_address : undefined}
        maxLength={8}
        // Always LTR: the code is Latin letters plus digits, and it reorders
        // badly if it inherits the Arabic paragraph direction.
        dir="ltr"
        className="uppercase tracking-widest"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("buildingNumber")}
          optional={tCommon("optional")}
          value={value.building_number ?? ""}
          onChange={(event) => set("building_number", event.currentTarget.value)}
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
      </div>

      <TextField
        label={t("district")}
        value={value.district ?? ""}
        onChange={(event) => set("district", event.currentTarget.value)}
        error={errors.district}
        autoComplete="address-level3"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label={t("region")}
          value={value.region_id ?? ""}
          error={errors.region_id}
          onChange={(event) => {
            // Changing region invalidates the city beneath it.
            onChange({ ...value, region_id: event.currentTarget.value, city_id: "" });
          }}
        >
          <option value="">{t("selectRegion")}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t("city")}
          value={value.city_id ?? ""}
          error={errors.city_id}
          disabled={!value.region_id}
          onChange={(event) => set("city_id", event.currentTarget.value)}
        >
          <option value="">{t("selectCity")}</option>
          {citiesInRegion.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("postalCode")}
          optional={tCommon("optional")}
          value={value.postal_code ?? ""}
          onChange={(event) => set("postal_code", event.currentTarget.value)}
          inputMode="numeric"
          dir="ltr"
        />
        <TextField
          label={t("additionalNumber")}
          optional={tCommon("optional")}
          value={value.additional_number ?? ""}
          onChange={(event) => set("additional_number", event.currentTarget.value)}
          inputMode="numeric"
          dir="ltr"
        />
      </div>
    </div>
  );
}
