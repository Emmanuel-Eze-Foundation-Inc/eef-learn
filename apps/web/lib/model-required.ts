import { NextResponse } from "next/server";

import { MODEL_REQUIRED } from "./ai-providers";

/**
 * EEF Learn provides no AI credits. Without the user's own key, AI features point them to
 * their own assistant over MCP, or to adding a key.
 */
export function modelRequired(what: string) {
  return NextResponse.json(
    {
      error: `Connect your own AI to ${what}.`,
      code: MODEL_REQUIRED,
      fix: "Connect Claude, ChatGPT, Cursor or Gemini to EEF Learn over MCP, or add a model key in Settings. EEF Learn doesn't provide AI credits.",
    },
    { status: 409 },
  );
}
