"use client";

import { useTranslation } from "@skolara/i18n";
import { Button, Input } from "@skolara/ui";
import { useState } from "react";
import { Field, generatePassword } from "./ui-kit";

export interface AccountValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}
export type AccountErrors = Partial<Record<keyof AccountValues, string>>;

export const EMPTY_ACCOUNT: AccountValues = { firstName: "", lastName: "", email: "", phone: "", password: "" };

/** The checks every "create a login" form shares. Returns message keys by field. */
export function validateAccount(values: AccountValues, t: (key: "people.required" | "people.emailInvalid" | "people.passwordShort") => string): AccountErrors {
  const errors: AccountErrors = {};
  if (!values.firstName.trim()) errors.firstName = t("people.required");
  if (!values.lastName.trim()) errors.lastName = t("people.required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = t("people.emailInvalid");
  if (values.password.length < 8) errors.password = t("people.passwordShort");
  return errors;
}

/** Name, email, phone and a temporary password, for admitting a student or adding staff. */
export function AccountFields({
  values,
  errors,
  onChange,
}: {
  values: AccountValues;
  errors: AccountErrors;
  onChange: (patch: Partial<AccountValues>) => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [generated, setGenerated] = useState(false);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("fields.firstName")} error={errors.firstName}>
          {(props) => <Input {...props} autoComplete="off" maxLength={60} value={values.firstName} onChange={(e) => onChange({ firstName: e.target.value })} />}
        </Field>
        <Field label={t("fields.lastName")} error={errors.lastName}>
          {(props) => <Input {...props} autoComplete="off" maxLength={60} value={values.lastName} onChange={(e) => onChange({ lastName: e.target.value })} />}
        </Field>
      </div>
      <Field label={t("fields.email")} error={errors.email}>
        {(props) => <Input {...props} type="email" inputMode="email" autoComplete="off" maxLength={200} value={values.email} onChange={(e) => onChange({ email: e.target.value })} />}
      </Field>
      <Field label={t("people.parentPhone")} optional>
        {(props) => <Input {...props} type="tel" inputMode="tel" autoComplete="off" maxLength={20} value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} />}
      </Field>
      <Field
        label={t("fields.temporaryPassword")}
        error={errors.password}
        help={generated ? t("people.generatedNote") : t("people.passwordHelp")}
      >
        {(props) => (
          <div className="flex gap-2">
            <Input
              {...props}
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              maxLength={72}
              value={values.password}
              onChange={(e) => {
                setGenerated(false);
                onChange({ password: e.target.value });
              }}
              className="font-mono"
            />
            <Button type="button" variant="secondary" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
              {visible ? t("people.hide") : t("people.show")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onChange({ password: generatePassword() });
                setVisible(true);
                setGenerated(true);
              }}
            >
              {t("people.generate")}
            </Button>
          </div>
        )}
      </Field>
    </>
  );
}
