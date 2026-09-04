"use client";

import {
  useApiClient,
  useCreateInventoryItem,
  useInventoryCategories,
  useInventoryItem,
  useInventoryItems,
  useInventorySummary,
  useIssueAsset,
  useOutstandingAssets,
  useRemoveInventoryItem,
  useReturnAsset,
  type StudentWithUser,
} from "@skolara/api-client";
import {
  assetConditionSchema,
  type AssetCondition,
  type SchoolClass,
} from "@skolara/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatCard,
} from "@skolara/ui";
import { useTranslation, type Locale } from "@skolara/i18n";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { intlLocale } from "@/lib/intl";

const CONDITION_TONE: Record<AssetCondition, "success" | "neutral" | "warning" | "danger"> = {
  NEW: "success",
  GOOD: "success",
  FAIR: "neutral",
  POOR: "warning",
  DAMAGED: "danger",
  WRITTEN_OFF: "danger",
};

/**
 * Rupees, formatted for whoever is reading. The currency is fixed and the
 * locale isn't: an Urdu reader should see Urdu digits and grouping, not
 * English ones on a Pakistani currency.
 */
function formatPkr(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function holderName(assignment: {
  assignedToUser: { firstName: string; lastName: string } | null;
  class: { name: string; section: string } | null;
}): string {
  if (assignment.assignedToUser) {
    return `${assignment.assignedToUser.firstName} ${assignment.assignedToUser.lastName}`;
  }
  return assignment.class ? `${assignment.class.name} ${assignment.class.section}` : "—";
}

export default function InventoryPage() {
  const { t, locale } = useTranslation();
  const api = useApiClient();
  const { data: summary } = useInventorySummary();
  const { data: categories } = useInventoryCategories();
  const { data: outstanding } = useOutstandingAssets();

  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const { data: items, isLoading } = useInventoryItems({
    category: category || undefined,
    search: search || undefined,
  });

  const [openItemId, setOpenItemId] = useState<string>();
  const { data: item } = useInventoryItem(openItemId);

  const createItem = useCreateInventoryItem();
  const removeItem = useRemoveInventoryItem();
  const issue = useIssueAsset();
  const returnAsset = useReturnAsset();

  const [name, setName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState("");
  const [itemError, setItemError] = useState("");

  const [holderKind, setHolderKind] = useState<"STAFF" | "CLASS">("STAFF");
  const [holderId, setHolderId] = useState("");
  const [issueUnits, setIssueUnits] = useState(1);
  const [dueBackOn, setDueBackOn] = useState("");
  const [issueError, setIssueError] = useState("");

  const { data: staff } = useQuery<StudentWithUser["user"][]>({
    queryKey: ["users", "staff-directory"],
    queryFn: () => api.users.staffDirectory(),
    enabled: Boolean(openItemId) && holderKind === "STAFF",
  });
  const { data: classes } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
    enabled: Boolean(openItemId) && holderKind === "CLASS",
  });

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    setItemError("");
    try {
      await createItem.mutateAsync({
        name,
        category: newCategory,
        assetTag: assetTag || null,
        location: location || null,
        quantity,
        purchaseCostPkr: cost === "" ? null : Number(cost),
      });
      setName("");
      setAssetTag("");
      setCost("");
    } catch (err) {
      setItemError(err instanceof Error ? err.message : t("inventory.couldNotAdd"));
    }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setIssueError("");
    if (!openItemId) return;
    try {
      await issue.mutateAsync({
        itemId: openItemId,
        input: {
          // Exactly one holder — the API and a database CHECK both refuse the
          // other three combinations.
          assignedToUserId: holderKind === "STAFF" ? holderId : undefined,
          classId: holderKind === "CLASS" ? holderId : undefined,
          units: issueUnits,
          dueBackOn: dueBackOn ? new Date(dueBackOn) : undefined,
        },
      });
      setHolderId("");
      setDueBackOn("");
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : t("inventory.couldNotIssue"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.description")}
      />

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label={t("inventory.items")} value={summary.items} icon="📦" />
          <StatCard label={t("inventory.units")} value={summary.units} icon="🔢" />
          <StatCard label={t("inventory.out")} value={summary.unitsOut} icon="📤" />
          <StatCard label={t("inventory.overdue")} value={summary.overdue} icon="⏰" />
          <StatCard
            label={t("inventory.bookValue")}
            value={formatPkr(summary.totalValuePkr, locale)}
            icon="💰"
          />
        </div>
      )}

      {(summary?.needsAttention ?? 0) > 0 && (
        <Card>
          <p className="text-sm">
            <Badge tone="danger">
              {t("inventory.needsAttention", { count: summary?.needsAttention ?? 0 })}
            </Badge>{" "}
            <span className="text-slate-500">{t("inventory.needsAttentionBody")}</span>
          </p>
        </Card>
      )}

      {(outstanding?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("inventory.outNow")}</CardTitle>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {outstanding?.map((assignment) => {
              const overdue =
                assignment.dueBackOn !== null && new Date(assignment.dueBackOn) < new Date();
              return (
                <li
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {assignment.item.name}
                        {assignment.units > 1 && (
                          <span className="ml-1 text-sm text-slate-400">
                            ×{assignment.units}
                          </span>
                        )}
                      </p>
                      {assignment.item.assetTag && (
                        <Badge tone="neutral">{assignment.item.assetTag}</Badge>
                      )}
                      {overdue && <Badge tone="danger">{t("inventory.overdue")}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("inventory.holderSince", {
                        holder: holderName(assignment),
                        date: new Date(assignment.assignedAt).toLocaleDateString(
                          intlLocale(locale),
                          { day: "numeric", month: "short" },
                        ),
                      })}
                      {assignment.dueBackOn
                        ? t("inventory.dueSuffix", {
                            date: new Date(assignment.dueBackOn).toLocaleDateString(
                              intlLocale(locale),
                              { day: "numeric", month: "short" },
                            ),
                          })
                        : ""}
                    </p>
                  </div>
                  <Select
                    defaultValue=""
                    className="max-w-[200px] shrink-0"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      returnAsset.mutate({
                        assignmentId: assignment.id,
                        input: {
                          returnedCondition: e.target.value as AssetCondition,
                        },
                      });
                    }}
                  >
                    {/* Condition is asked at the moment of return, because
                        that is the moment anyone would notice damage. */}
                    <option value="">{t("inventory.returnAs")}</option>
                    {assetConditionSchema.options.map((condition) => (
                      <option key={condition} value={condition}>
                        {t(`assetCondition.${condition}`)}
                      </option>
                    ))}
                  </Select>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.addItem")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreateItem} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t("fields.name")}
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-[220px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("inventory.category")}
            <Input
              required
              list="inventory-categories"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="max-w-[160px]"
            />
            <datalist id="inventory-categories">
              {categories?.map((existing) => (
                <option key={existing} value={existing} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("inventory.assetTag")}
            <Input
              placeholder="optional"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              className="max-w-[140px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("inventory.location")}
            <Input
              placeholder="optional"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="max-w-[160px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("inventory.units")}
            <Input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="max-w-[100px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("inventory.costEach")}
            <Input
              type="number"
              min={0}
              placeholder="optional"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="max-w-[140px]"
            />
          </label>
          <Button type="submit" disabled={createItem.isPending}>
            {createItem.isPending ? t("inventory.adding") : t("inventory.add")}
          </Button>
          {itemError && <p className="text-sm text-rose-600">{itemError}</p>}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.items")}</CardTitle>
        </CardHeader>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="max-w-[200px]"
          >
            <option value="">{t("inventory.allCategories")}</option>
            {categories?.map((existing) => (
              <option key={existing} value={existing}>
                {existing}
              </option>
            ))}
          </Select>
          <Input
            placeholder={t("inventory.searchHint")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[240px]"
          />
        </div>

        {isLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!isLoading && items?.length === 0 && (
          <EmptyState icon="📦" title={t("inventory.nothingHere")} />
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {items?.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{entry.name}</p>
                  <Badge tone="neutral">{entry.category}</Badge>
                  {entry.assetTag && <Badge tone="info">{entry.assetTag}</Badge>}
                  <Badge tone={CONDITION_TONE[entry.condition]}>
                    {t(`assetCondition.${entry.condition}`)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm tabular-nums text-slate-500">
                  {t("inventory.availableOfTotal", {
                    available: entry.available,
                    total: entry.quantity,
                  })}
                  {entry.unitsOut > 0 ? t("inventory.outSuffix", { count: entry.unitsOut }) : ""}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setOpenItemId((current) => (current === entry.id ? undefined : entry.id))
                  }
                >
                  {openItemId === entry.id ? t("common.close") : t("inventory.issue")}
                </Button>
                {entry.unitsOut === 0 && (
                  <Button variant="ghost" onClick={() => removeItem.mutate(entry.id)}>
                    {t("common.delete")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {openItemId && item && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("inventory.itemHeading", {
                name: item.name,
                available: item.available,
                total: item.quantity,
              })}
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleIssue} className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              {t("inventory.issueTo")}
              <Select
                value={holderKind}
                onChange={(e) => {
                  setHolderKind(e.target.value as "STAFF" | "CLASS");
                  setHolderId("");
                }}
                className="max-w-[140px]"
              >
                <option value="STAFF">{t("inventory.aStaffMember")}</option>
                <option value="CLASS">{t("inventory.aClass")}</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {holderKind === "STAFF" ? t("inventory.staffMember") : t("reportCards.class")}
              <Select
                required
                value={holderId}
                onChange={(e) => setHolderId(e.target.value)}
                className="max-w-xs"
              >
                <option value="">{t("inventory.selectPlaceholder")}</option>
                {holderKind === "STAFF"
                  ? staff?.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                      </option>
                    ))
                  : classes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.section}
                      </option>
                    ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("inventory.units")}
              <Input
                type="number"
                min={1}
                max={item.available}
                value={issueUnits}
                onChange={(e) => setIssueUnits(Number(e.target.value))}
                className="max-w-[100px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("inventory.dueBack")}
              <Input
                type="date"
                value={dueBackOn}
                onChange={(e) => setDueBackOn(e.target.value)}
                className="max-w-[170px]"
              />
            </label>
            <Button type="submit" disabled={issue.isPending || !item.issuable}>
              {issue.isPending ? t("inventory.issuing") : t("inventory.issue")}
            </Button>
            {!item.issuable && (
              <p className="text-sm text-slate-500">
                {item.available === 0
                  ? t("inventory.nothingAvailable")
                  : t("inventory.notIssuable", {
                      condition: t(`assetCondition.${item.condition}`),
                    })}
              </p>
            )}
            {issueError && <p className="text-sm text-rose-600">{issueError}</p>}
          </form>

          {item.history.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-slate-500">
                {t("inventory.returnedCount", { count: item.history.length })}
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-500">
                {item.history.map((assignment) => (
                  <li key={assignment.id}>
                    {t("inventory.historyLine", {
                      holder: holderName(assignment),
                      units: assignment.units,
                      date: assignment.returnedAt
                        ? new Date(assignment.returnedAt).toLocaleDateString(intlLocale(locale), {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "",
                    })}
                    {assignment.returnedCondition
                      ? t("inventory.conditionSuffix", {
                          condition: t(`assetCondition.${assignment.returnedCondition}`),
                        })
                      : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
