import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/echo/shell";
import { EduAdaptMark } from "@/components/echo/logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EduAdapt" },
      { name: "description", content: "Sign in or create your EduAdapt account to save your personalised learning progress." },
      { property: "og:title", content: "Sign in — EduAdapt" },
      { property: "og:description", content: "Save your streaks, chapters and reports across devices." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/dashboard" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) setSent(true);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google sign-in failed. Please try again.");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-background p-10 text-primary-foreground md:flex">
        <Logo />
        <div>
          <div className="mb-6 grid size-24 place-items-center rounded-3xl bg-background/25 p-2 shadow-lg backdrop-blur">
            <EduAdaptMark size={64} />
          </div>
          <h2 className="text-4xl font-bold leading-tight">Personalised AI Learning for Every Learner.</h2>
          <p className="mt-3 text-lg opacity-90">Save your streaks, chapters and weekly reports on any device.</p>
        </div>
        <p className="text-sm opacity-80">“Small steps every day add up to big results.”</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden"><Logo /></div>
          {sent ? (
            <div className="rounded-3xl border bg-card p-6 text-center">
              <h1 className="text-xl font-bold">Check your email 📬</h1>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Click it to finish creating your account.</p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold">{mode === "in" ? "Welcome back!" : "Create your account"}</h1>
                <p className="text-sm text-muted-foreground">{mode === "in" ? "Sign in to continue learning." : "It only takes a minute."}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="space-y-3">
                {mode === "up" && <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />}
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password (6+ characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                {mode === "in" ? "New to EduAdapt? " : "Already have an account? "}
                <button className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                  {mode === "in" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
