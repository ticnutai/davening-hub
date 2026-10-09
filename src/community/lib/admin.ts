import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@community/integrations/supabase/client";
import { communityId } from "@/community/lib/community";

type TableName =
  | "minyanim"
  | "minyan_categories"
  | "announcements"
  | "shiurim"
  | "shiur_categories"
  | "chavrutot"
  | "settings";

export function useSaveRow(table: TableName, queryKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = row["id"]
        ? await supabase
            .from(table)
            .update({ ...row, community_id: communityId() } as never)
            .eq("id", row["id"] as string)
            .eq("community_id", communityId())
        : // A new row belongs to the synagogue being edited. Without this
          // the column's default (the only active synagogue) put rows made in
          // another synagogue's admin into the main one.
          await supabase.from(table).insert({ ...row, community_id: communityId() } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [queryKey] });
      toast.success("נשמר בהצלחה");
    },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });
}

export function useDeleteRow(table: TableName, queryKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id).eq("community_id", communityId());
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [queryKey] });
      toast.success("נמחק");
    },
    onError: (e: Error) => toast.error(e.message || "המחיקה נכשלה"),
  });
}
