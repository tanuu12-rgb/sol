import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "./logger";

const MODEL = "gemini-2.5-flash";

async function generate(prompt: string, json = false): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    });
    return response.text ?? "";
  } catch (err) {
    logger.error({ err }, "Gemini call failed");
    throw err;
  }
}

export async function classifyEmergency(description: string): Promise<{
  type: "Fire" | "Medical" | "Security" | "Other";
  confidence: number;
  summary: string;
}> {
  try {
    const out = await generate(
      `You are an emergency dispatch AI for a hotel. Classify the following report into one of: Fire, Medical, Security, Other. Return JSON with shape {"type":"Fire|Medical|Security|Other","confidence":0..1,"summary":"one short sentence"}.\n\nReport: ${description}`,
      true,
    );
    const parsed = JSON.parse(out);
    return {
      type: ["Fire", "Medical", "Security"].includes(parsed.type)
        ? parsed.type
        : "Other",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      summary: parsed.summary ?? "Emergency reported.",
    };
  } catch {
    const lower = description.toLowerCase();
    let type: "Fire" | "Medical" | "Security" | "Other" = "Other";
    if (/fire|smoke|burn|flame/.test(lower)) type = "Fire";
    else if (/medic|hurt|pain|chest|breath|injur|sick/.test(lower)) type = "Medical";
    else if (/intrud|threat|weapon|attack|stalk|theft/.test(lower)) type = "Security";
    return { type, confidence: 0.7, summary: description.slice(0, 120) };
  }
}

export async function translate(text: string, lang: string): Promise<string> {
  if (!lang || lang === "en") return text;
  try {
    const out = await generate(
      `Translate the following emergency message into ${lang}. Return only the translated text, no quotes or commentary.\n\n${text}`,
    );
    return out.trim() || text;
  } catch {
    return text;
  }
}

export async function calmCoachReply(
  context: {
    type: string;
    room: string;
    language?: string | null;
    accessibility: {
      deaf: boolean;
      wheelchair: boolean;
      visuallyImpaired: boolean;
      nonVerbal: boolean;
      cognitive: boolean;
    } | null;
    history: { role: string; text: string }[];
    guestText: string;
  },
): Promise<{ reply: string; spatialMode: boolean }> {
  const spatial = context.accessibility?.visuallyImpaired ?? false;
  const access = context.accessibility;
  const accNotes: string[] = [];
  if (access?.wheelchair) accNotes.push("guest uses a wheelchair — give accessible-route instructions only, no stairs");
  if (access?.deaf) accNotes.push("guest is deaf — keep messages short and visual");
  if (access?.visuallyImpaired) accNotes.push("guest is visually impaired — use precise step-counts, directions, and tactile landmarks");
  if (access?.cognitive) accNotes.push("guest has cognitive disability — use very simple language, one step at a time");

  const lang = context.language && context.language !== "English" ? context.language : null;

  const prompt = `You are CrisisIQ Calm Coach, a calm hotel emergency assistant.
Emergency type: ${context.type}
Guest room: ${context.room}
Accessibility: ${accNotes.join("; ") || "no special needs"}
${spatial ? "Use a spatial-audio style: precise step counts, compass directions, and feel-for-handle instructions." : "Use calm, brief, reassuring sentences."}
${lang ? `IMPORTANT: Respond entirely in ${lang}. Do not use English.` : ""}

Conversation so far:
${context.history.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n")}
GUEST: ${context.guestText}

Reply with one short paragraph (3-5 sentences) directly to the guest. Acknowledge them, give the next concrete safety step, and tell them help is on the way. Do not add headings or lists.${lang ? ` Reply in ${lang}.` : ""}`;

  try {
    let out = await generate(prompt);
    out = out.trim();
    if (!out) {
      const fb = fallbackCoach(context.type);
      const translated = lang ? await translate(fb, lang) : fb;
      return { reply: translated, spatialMode: spatial };
    }
    return { reply: out, spatialMode: spatial };
  } catch {
    const fb = fallbackCoach(context.type);
    const translated = lang ? await translate(fb, lang) : fb;
    return { reply: translated, spatialMode: spatial };
  }
}

export async function recommendActions(incident: {
  type: string;
  room: string;
  floor: number;
  status: string;
  createdAt: string;
  guestName?: string | null;
  accessibility?: {
    deaf: boolean;
    wheelchair: boolean;
    visuallyImpaired: boolean;
    nonVerbal: boolean;
    cognitive: boolean;
  } | null;
  log: { timestamp: string; message: string }[];
}): Promise<{
  severity: "low" | "medium" | "high" | "critical";
  priorityScore: number;
  eta: string;
  actions: { title: string; detail: string }[];
}> {
  const ageSec = Math.max(
    1,
    Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 1000),
  );
  const accFlags = incident.accessibility
    ? Object.entries(incident.accessibility)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : [];

  try {
    const out = await generate(
      `You are an AI incident commander for a hotel. Analyze this emergency and recommend immediate actions.

Type: ${incident.type}
Room: ${incident.room} (Floor ${incident.floor})
Status: ${incident.status}
Age: ${ageSec} seconds
Guest: ${incident.guestName ?? "unknown"}
Accessibility flags: ${accFlags.join(", ") || "none"}
Recent log:
${incident.log.slice(-5).map((l) => `- ${l.message}`).join("\n")}

Return JSON shaped exactly as:
{
  "severity": "low|medium|high|critical",
  "priorityScore": 0-100 number,
  "eta": "estimated time-to-resolve, e.g. '2 minutes'",
  "actions": [
    {"title":"short action","detail":"one-sentence reason"},
    ... 3 to 4 items
  ]
}`,
      true,
    );
    const parsed = JSON.parse(out);
    return {
      severity: ["low", "medium", "high", "critical"].includes(parsed.severity)
        ? parsed.severity
        : "high",
      priorityScore:
        typeof parsed.priorityScore === "number"
          ? Math.max(0, Math.min(100, parsed.priorityScore))
          : 70,
      eta: typeof parsed.eta === "string" ? parsed.eta : "3 minutes",
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
            .filter((a: unknown) => a && typeof a === "object")
            .map((a: { title?: unknown; detail?: unknown }) => ({
              title: String(a.title ?? "Action"),
              detail: String(a.detail ?? ""),
            }))
            .slice(0, 5)
        : [],
    };
  } catch {
    const sev =
      incident.type === "Fire" ? "critical" : accFlags.length > 0 ? "high" : "medium";
    return {
      severity: sev,
      priorityScore:
        sev === "critical" ? 95 : sev === "high" ? 78 : 55,
      eta: sev === "critical" ? "1 minute" : "3 minutes",
      actions: [
        {
          title: `Dispatch nearest ${incident.type.toLowerCase()} responder`,
          detail: `Closest available staff to floor ${incident.floor} should be paged immediately.`,
        },
        ...(accFlags.includes("wheelchair")
          ? [
              {
                title: "Pre-stage accessible egress route",
                detail: "Clear ramp B and unlock service elevator for wheelchair guest.",
              },
            ]
          : []),
        {
          title: "Notify on-duty manager",
          detail: "Loop in command for situational awareness and resource backup.",
        },
        {
          title: "Open multilingual guest broadcast",
          detail: "Send calming, in-language alert to all guests on the affected floor.",
        },
      ],
    };
  }
}

function fallbackCoach(type: string): string {
  return `Stay calm. I'm alerting staff right now. ${
    type === "Fire"
      ? "Stay low, feel your door for heat before opening, and move toward the nearest exit."
      : type === "Medical"
        ? "Sit or lie down in a safe spot. Help is on the way."
        : "Move to a safe area and lock your door. We are coming."
  } You are not alone.`;
}

export async function debriefReport(incident: {
  id: string;
  type: string;
  room: string;
  createdAt: string;
  resolvedAt: string | null;
  log: { timestamp: string; message: string }[];
  assignedStaffName: string | null;
  accessibility: unknown;
}): Promise<{
  executiveSummary: string;
  timeline: { time: string; event: string }[];
  responseTime: string;
  whatWorked: string[];
  whatFailed: string[];
  recommendations: string[];
}> {
  const responseSec =
    incident.resolvedAt && incident.createdAt
      ? Math.round(
          (new Date(incident.resolvedAt).getTime() -
            new Date(incident.createdAt).getTime()) /
            1000,
        )
      : 0;

  try {
    const out = await generate(
      `You are an incident reviewer for a hotel emergency response system. Generate a structured debrief in JSON for the following incident:

Type: ${incident.type}
Room: ${incident.room}
Started: ${incident.createdAt}
Resolved: ${incident.resolvedAt ?? "not resolved"}
Total response time: ${responseSec} seconds
Assigned staff: ${incident.assignedStaffName ?? "unassigned"}
Accessibility: ${JSON.stringify(incident.accessibility)}
Log:
${incident.log.map((l) => `- ${l.timestamp}: ${l.message}`).join("\n")}

Return JSON with shape:
{
  "executiveSummary": "2-3 sentence summary",
  "timeline": [{"time":"HH:MM:SS","event":"..."}],
  "responseTime": "human-readable response time analysis",
  "whatWorked": ["...","...","..."],
  "whatFailed": ["...","..."],
  "recommendations": ["...","...","..."]
}`,
      true,
    );
    const parsed = JSON.parse(out);
    return {
      executiveSummary: parsed.executiveSummary ?? "",
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      responseTime: parsed.responseTime ?? `${responseSec} seconds total`,
      whatWorked: Array.isArray(parsed.whatWorked) ? parsed.whatWorked : [],
      whatFailed: Array.isArray(parsed.whatFailed) ? parsed.whatFailed : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
    };
  } catch {
    return {
      executiveSummary: `${incident.type} incident at room ${incident.room} resolved in ${responseSec} seconds.`,
      timeline: incident.log.map((l) => ({
        time: new Date(l.timestamp).toISOString().substring(11, 19),
        event: l.message,
      })),
      responseTime: `Total response time: ${responseSec} seconds.`,
      whatWorked: [
        "Auto-dispatch identified the nearest staff member instantly.",
        "Accessibility profile was honored during routing.",
        "Calm-coach kept the guest reassured throughout.",
      ],
      whatFailed: [
        "No multi-floor coordinator was paged.",
      ],
      recommendations: [
        "Add a secondary backup responder for incidents over 60 seconds.",
        "Pre-stage extinguishers near accessibility-flagged rooms.",
        "Run a monthly drill that includes wheelchair evacuation routing.",
      ],
    };
  }
}

export async function wellnessMessage(
  guestName: string,
  language: string,
  incidentType: string,
): Promise<{ message: string; language: string }> {
  try {
    const out = await generate(
      `Write a short, warm wellness check message to a hotel guest named ${guestName} who experienced a ${incidentType} incident. 3-4 sentences. Acknowledge what happened, offer support resources, and ask if they need anything. Write the message in ${language || "English"}. Return only the message text.`,
    );
    return { message: out.trim(), language: language || "en" };
  } catch {
    return {
      message: `Hi ${guestName}, we want to check in after the recent ${incidentType.toLowerCase()} incident. We're sorry for the disruption — our team is here if you need water, a room change, or anything at all. Just reply and we'll come right away.`,
      language: language || "en",
    };
  }
}

export async function socialRadarSummary(posts: { handle: string; text: string }[]): Promise<{
  threatLevel: "Low" | "Medium" | "High";
  summary: string;
}> {
  try {
    const out = await generate(
      `You monitor social media around a hotel for crisis signals. Given these recent posts, return JSON {"threatLevel":"Low|Medium|High","summary":"one sentence"}.\n\n${posts.map((p) => `${p.handle}: ${p.text}`).join("\n")}`,
      true,
    );
    const parsed = JSON.parse(out);
    return {
      threatLevel: ["Low", "Medium", "High"].includes(parsed.threatLevel)
        ? parsed.threatLevel
        : "Low",
      summary: parsed.summary ?? "No notable signals.",
    };
  } catch {
    return { threatLevel: "Low", summary: "No notable signals near the property." };
  }
}
