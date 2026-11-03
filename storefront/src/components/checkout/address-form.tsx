"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { SelectField, TextField } from "@/components/ui/field";
import { DELIVERY_COUNTRIES, type AddressInput, type City, type Region } from "@/types/shop";

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
// Elsewhere in the Gulf, any international number: a plus or not, 8–15 digits.
const INTERNATIONAL_PHONE_PATTERN = /^\+?\d{8,15}$/;

export interface AddressFormErrors {
  [key: string]: string | undefined;
}

export function validateAddress(
  value: Partial<AddressInput>,
  messages: { required: string; invalidPhone: string },
): AddressFormErrors {
  const errors: AddressFormErrors = {};

  const isKuwait = (value.country_code ?? "KW") === "KW";
  if (!value.full_name?.trim()) errors.full_name = messages.required;

  const phonePattern = isKuwait ? KUWAIT_MOBILE_PATTERN : INTERNATIONAL_PHONE_PATTERN;
  if (!value.phone?.trim()) errors.phone = messages.required;
  else if (!phonePattern.test(value.phone.replace(/[\s()-]+/g, "")))
    errors.phone = messages.invalidPhone;

  if (isKuwait) {
    if (!value.governorate_id) errors.governorate_id = messages.required;
    if (!value.area_id) errors.area_id = messages.required;
    if (!value.block?.trim()) errors.block = messages.required;
  } else {
    if (!value.city?.trim()) errors.city = messages.required;
    if (!value.district?.trim()) errors.district = messages.required;
  }
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
  const locale = useLocale();
  const country = value.country_code ?? "KW";
  const isKuwait = country === "KW";

  // Country names in the shopper's own language, from the browser's data.
  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

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
      <SelectField
        label={t("country")}
        value={country}
        onChange={(event) => {
          // A different country means a different set of address fields, so
          // the parts that belong to the old one are cleared, not carried over.
          onChange({
            ...value,
            country_code: event.currentTarget.value as AddressInput["country_code"],
            governorate_id: "",
            area_id: "",
            city: "",
            district: "",
          });
        }}
      >
        {DELIVERY_COUNTRIES.map((code) => (
          <option key={code} value={code}>
            {countryNames.of(code) ?? code}
          </option>
        ))}
      </SelectField>

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
          hint={isKuwait ? t("phoneHint") : t("phoneHintIntl")}
          value={value.phone ?? ""}
          onChange={(event) => set("phone", event.currentTarget.value)}
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
        />
      </div>

      {isKuwait ? (
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
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t("city")}
            value={value.city ?? ""}
            onChange={(event) => set("city", event.currentTarget.value)}
            error={errors.city}
            autoComplete="address-level2"
          />
          <TextField
            label={t("district")}
            value={value.district ?? ""}
            onChange={(event) => set("district", event.currentTarget.value)}
            error={errors.district}
            autoComplete="address-level3"
          />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          label={isKuwait ? t("block") : t("blockOptional")}
          optional={isKuwait ? undefined : tCommon("optional")}
          value={value.block ?? ""}
          onChange={(event) => set("block", event.currentTarget.value)}
          error={errors.block}
          inputMode={isKuwait ? "numeric" : undefined}
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
