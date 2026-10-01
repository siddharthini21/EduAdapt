import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(30),
});

export const askHelper = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key =
      process.env["EDUADAPT_LLM_API_KEY"] ??
      process.env["ECHOLEARN_LLM_API_KEY"] ??
      process.env["LOVABLE_API_KEY"];
    if (!key) return { reply: "I'm offline right now. Try the Upload page to add notes, or the Reader to study them!" };
    const system = `You are EduAdapt AI, the intelligent, supportive learning co-pilot inside EduAdapt: Personalised AI Learning for Every Learner.
Help with: personalising study paths, mastering key concepts, using EduAdapt tools (Upload, Reader with Text/Listen/Mind map/Quiz modes, Progress analytics, weekly Report, homework Reminders, Account, reading toolbar, Focus Pulse breaks), and answering academic or conceptual questions tailored to the learner's AI level.
Be concise, clear, encouraging, and structured with bullet points.`;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          reasoning_effort: "low",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });
      if (res.status === 429) return { reply: "Lots of people are asking right now — please try again in a moment." };
      if (res.status === 402) return { reply: "The AI helper is out of credits for now." };
      if (!res.ok) return { reply: "Sorry, I couldn't answer that. Please try again." };
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return { reply: json.choices?.[0]?.message?.content ?? "Sorry, I didn't catch that." };
    } catch {
      return { reply: "Sorry, I couldn't connect. Please try again." };
    }
  });
