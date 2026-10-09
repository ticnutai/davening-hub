import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), scope: vi.fn(), session: vi.fn() }));
vi.mock("./community", () => ({ communityId: mocks.scope }));
vi.mock("@community/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, auth: { getSession: mocks.session } },
}));
import { createUser, listUsers, updateUserRole } from "./user-admin.functions";

describe("community user administration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.scope.mockReturnValue("community-a");
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.session.mockResolvedValue({ data: { session: { user: { id: "self" } } } });
  });
  it("lists only the selected community and identifies the current user", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "self", role: "admin" }], error: null });
    expect(await listUsers()).toEqual([{ id: "self", role: "admin", isCurrentUser: true }]);
    expect(mocks.rpc).toHaveBeenCalledWith("community_admin_list_users", { p_community_id: "community-a" });
    mocks.scope.mockReturnValue("community-b");
    await listUsers();
    expect(mocks.rpc).toHaveBeenLastCalledWith("community_admin_list_users", { p_community_id: "community-b" });
  });
  it("creates with an explicit community and validates input before RPC", async () => {
    const data = { email: " demo@example.invalid ", name: " Demo ", password: "test-only-password", role: "user" as const };
    await createUser({ data });
    expect(mocks.rpc).toHaveBeenCalledWith("community_admin_create_user", expect.objectContaining({
      p_community_id: "community-a", p_email: "demo@example.invalid", p_name: "Demo", p_role: "user",
    }));
    mocks.rpc.mockClear();
    await expect(createUser({ data: { ...data, password: "short" } })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("scopes role updates and surfaces last-administrator denial", async () => {
    const data = { userId: "b139f344-df9a-47ae-ab41-c5154780926b", role: "user" as const };
    mocks.rpc.mockResolvedValue({ error: { message: "Cannot remove the last administrator" } });
    await expect(updateUserRole({ data })).rejects.toThrow("לא ניתן להסיר את המנהל האחרון");
    expect(mocks.rpc).toHaveBeenCalledWith("community_admin_update_user_role", {
      p_community_id: "community-a", p_user_id: data.userId, p_role: "user",
    });
  });
  it("does not turn a server access denial into an empty successful list", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Admin access required" } });
    await expect(listUsers()).rejects.toThrow("הפעולה מותרת למנהל בלבד");
  });
});
