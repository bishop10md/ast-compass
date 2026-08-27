const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export default async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers });
  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "The AI science assistant needs an OPENAI_API_KEY in Netlify environment variables before it can answer open-ended questions." }), { status: 503, headers });
  try {
    const { question } = await request.json();
    if (typeof question !== "string" || question.trim().length < 3 || question.length > 1200) return new Response(JSON.stringify({ error: "Enter a science question between 3 and 1,200 characters." }), { status: 400, headers });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5.4-mini", instructions: "You are the AST Compass educational science assistant. Answer science questions accurately and clearly, with special expertise in clinical microbiology, antimicrobial susceptibility testing, microbial genetics, infectious disease laboratory methods, and resistance mechanisms. Use concise sections and explain terminology. Clearly separate established facts from uncertainty. Never invent breakpoint values or claim that demo data are current clinical standards. For patient-specific, treatment, diagnostic, or reporting questions, provide only general education and direct the user to qualified professionals and current authorized CLSI, EUCAST, FDA, or local laboratory sources.", input: question.trim(), max_output_tokens: 900, store: false })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "OpenAI could not generate an answer.");
    const answer = data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!answer) throw new Error("No answer was returned.");
    return new Response(JSON.stringify({ answer }), { status: 200, headers });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "The science assistant is temporarily unavailable." }), { status: 500, headers }); }
};

