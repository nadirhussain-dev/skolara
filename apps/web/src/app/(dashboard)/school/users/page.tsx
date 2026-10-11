"use client";

import { ApiError, useCreateUser, useSetUserActive, useUsers } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { RoleType } from "@skolara/types";
import { Badge, Button, Card, EmptyState, Input, cn } from "@skolara/ui";
import { useMemo, useState, type FormEvent } from "react";
import { AccountFields, EMPTY_ACCOUNT, validateAccount, type AccountErrors } from "@/components/account-fields";
import { Avatar, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth-context";

const VIEWABLE_ROLES: RoleType[] = ["PARENT", "TEACHER", "SCHOOL_ADMIN"];

function InviteParentForm({ onDone }: { onDone: (name: string) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const create = useCreateUser();
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [errors, setErrors] = useState<AccountErrors>({});
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateAccount(account, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || !user?.schoolId) return;
    const name = `${account.firstName.trim()} ${account.lastName.trim()}`;
    create.mutate(
      {
        schoolId: user.schoolId,
        role: "PARENT",
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        email: account.email.trim().toLowerCase(),
        password: account.password,
        phone: account.phone.trim() || undefined,
      },
      {
        onSuccess: () => onDone(name),
        onError: (error) => setFailure(error instanceof ApiError && error.status === 409 ? t("people.emailTaken") : t("common.somethingWentWrong")),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("accounts.inviteParentBody")}</p>
      <AccountFields values={account} errors={errors} onChange={(patch) => setAccount((a) => ({ ...a, ...patch }))} />
      {failure && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{failure}</p>}
      <Button type="submit" disabled={create.isPending}>{create.isPending ? t("accounts.inviting") : t("accounts.invite")}</Button>
    </form>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [role, setRole] = useState<RoleType>("PARENT");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const users = useUsers(role);
  const setActive = useSetUserActive();

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = users.data ?? [];
    if (!needle) return rows;
    return rows.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));
  }, [users.data, search]);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={t("accounts.title")}
        subtitle={t("accounts.description")}
        action={<Button onClick={() => { setAdding(true); setNotice(null); }}>{t("accounts.invite")}</Button>}
      />
      <p role="status" aria-live="polite" className={notice ? "text-sm font-bold text-emerald-700 dark:text-emerald-400" : "sr-only"}>{notice}</p>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div role="group" aria-label={t("accounts.title")} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {VIEWABLE_ROLES.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={role === key}
                onClick={() => setRole(key)}
                className={cn(
                  "min-h-[2.5rem] rounded-lg px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700",
                  role === key ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50" : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                )}
              >
                {t(`roles.${key}`)}
              </button>
            ))}
          </div>
          <Input type="search" aria-label={t("common.search")} placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[12rem] flex-1" />
        </div>

        {users.isError || !users.data ? (
          <ListState isError={users.isError} isLoading={!users.data} onRetry={() => void users.refetch()} errorText={t("people.loadError")} />
        ) : matches.length === 0 ? (
          <div className="p-5">
            {users.data.length === 0 ? <EmptyState title={t("accounts.noAccountsInRole")} /> : <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">{t("people.noMatches")}</p>}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {matches.map((u) => {
              const name = `${u.firstName} ${u.lastName}`;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-bold text-slate-900 dark:text-slate-50">{name}</p>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">{u.email}</p>
                  </div>
                  <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? t("accounts.active") : t("accounts.inactive")}</Badge>
                  {/* Nobody can lock themselves out by switching their own account off. */}
                  {u.id !== me?.id && (
                    <Button variant="ghost" disabled={setActive.isPending} onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })}>
                      {u.isActive ? t("accounts.deactivate") : t("accounts.reactivate")}
                      <span className="sr-only"> {name}</span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <SidePanel open={adding} title={t("accounts.inviteParent")} onClose={() => setAdding(false)}>
        <InviteParentForm
          onDone={(name) => {
            setAdding(false);
            setRole("PARENT");
            setNotice(t("people.saved", { name }));
          }}
        />
      </SidePanel>
    </div>
  );
}
