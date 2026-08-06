"use client";

import { useCreateUser, useSetUserActive, useUsers } from "@skolara/api-client";
import type { RoleType } from "@skolara/types";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Input, PageHeader, Select } from "@skolara/ui";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const VIEWABLE_ROLES: RoleType[] = ["PARENT", "TEACHER", "SCHOOL_ADMIN"];

export default function UsersPage() {
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState<RoleType>("PARENT");
  const { data: users, isLoading } = useUsers(roleFilter);
  const createUser = useCreateUser();
  const setActive = useSetUserActive();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.schoolId) return;
    await createUser.mutateAsync({
      schoolId: user.schoolId,
      role: "PARENT",
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
    });
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPhone("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Accounts" description="Invite parent accounts and manage staff access." />
      <Card>
        <CardHeader>
          <CardTitle>Invite a parent account</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-slate-500">
          Create a parent&apos;s login. Link them to a child from the student&apos;s admission
          form or profile.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <Input
            placeholder="First name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="Last name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="password"
            placeholder="Temporary password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? "Inviting..." : "Invite parent"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleType)}
          className="mb-4 max-w-xs"
        >
          {VIEWABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.replace("_", " ")}
            </option>
          ))}
        </Select>

        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {users?.length === 0 && <EmptyState title="No accounts in this role yet" />}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {users?.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-sm text-slate-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={u.isActive ? "success" : "neutral"}>
                  {u.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  disabled={setActive.isPending}
                  onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })}
                >
                  {u.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
