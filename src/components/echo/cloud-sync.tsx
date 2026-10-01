import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getEcho, replaceEcho, subscribeEcho } from "@/lib/echo/store";
import type { EchoState } from "@/lib/echo/types";
import type { Json } from "@/integrations/supabase/types";

/** Keeps the learner's progress saved to their account and restores it on any device. */
export function CloudSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let userId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pulling = false;

    async function pull(uid: string) {
      pulling = true;
      const { data } = await supabase.from("profiles").select("echo_state").eq("id", uid).maybeSingle();
      const saved = data?.echo_state as unknown as EchoState | null;
      const local = getEcho();
      if (saved && (saved.student || saved.chapters?.length)) replaceEcho(saved);
      else await push(uid, local);
      pulling = false;
    }

    async function push(uid: string, s: EchoState) {
      await supabase
        .from("profiles")
        .update({
          echo_state: s as unknown as Json,
          ...(s.student?.name ? { display_name: s.student.name } : {}),
          ...(s.student?.level ? { grade: s.student.level } : {}),
        })
        .eq("id", uid);
    }

    supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user.id ?? null;
      if (userId) void pull(userId);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const next = session?.user.id ?? null;
      if (event === "SIGNED_IN" && next && next !== userId) void pull(next);
      userId = next;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    const unsub = subscribeEcho(() => {
      if (!userId || pulling) return;
      if (timer) clearTimeout(timer);
      const uid = userId;
      timer = setTimeout(() => void push(uid, getEcho()), 1500);
    });

    return () => {
      sub.subscription.unsubscribe();
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [router, queryClient]);

  return null;
}
