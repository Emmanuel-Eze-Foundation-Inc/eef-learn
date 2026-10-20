import type { CourseSpec } from "../../course-spec";
import { m1 } from "./m1-foundations";
import { m2 } from "./m2-prompting";
import { m3 } from "./m3-rag";
import { m4 } from "./m4-agents";
import { m5 } from "./m5-evals";
import { m6 } from "./m6-shipping";
import { m7 } from "./m7-scaling";
import { m8 } from "./m8-mastery";

export const aiEngineering: CourseSpec = {
  title: "AI Engineering: Build and Deploy Scalable AI Products",
  topic: "AI engineering: building and deploying scalable products with AI and automation",
  brief: {
    audience: "Developers and technical builders who want to ship AI products",
    startingPoint: "Can read basic Python and use a terminal; no machine learning background",
    depth: "Beginner to mastery",
    notes: "Hands-on: every module ends in working code, and the course closes with a deployed capstone.",
  },
  author: "claude-opus (Cursor agent, hand-authored)",
  modules: [m1, m2, m3, m4, m5, m6, m7, m8],
  prerequisites: [
    ["first-api-call", "prompts-that-hold-up"],
    ["structured-output", "tool-calling"],
    ["embeddings", "rag-pipeline"],
    ["tool-calling", "agent-loop"],
    ["error-analysis", "eval-suites"],
    ["architecture", "deploy"],
    ["deploy", "capstone"],
    ["eval-suites", "capstone"],
  ],
};
