"use client";

import { useState } from "react";

import type { QuizData } from "./recall-data";

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, i) => id === right[i]);
}

function inputType(mode: QuizData["mode"]): "checkbox" | "radio" {
  switch (mode) {
    case "multi":
      return "checkbox";
    case "radio":
      return "radio";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function modeHint(mode: QuizData["mode"]): string {
  switch (mode) {
    case "multi":
      return "Pick every answer that fits";
    case "radio":
      return "Pick one";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Knowledge check. No scores stored — just whether this answer is right. */
export function Quiz({ data }: { data: QuizData }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const right = checked && sameSet(picked, data.correct);

  function toggle(id: string) {
    setChecked(false);
    if (data.mode === "radio") {
      setPicked([id]);
      return;
    }
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => id !== x) : [...prev, id]));
  }

  function onCheck() {
    if (picked.length === 0) return;
    setChecked(true);
  }

  return (
    <fieldset className="mt-6">
      <legend className="text-xl leading-relaxed text-star-100">{data.prompt}</legend>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
        {modeHint(data.mode)}
      </p>
      <ul className="mt-5 space-y-2">
        {data.options.map((opt) => {
          const on = picked.includes(opt.id);
          const showCorrect = checked && data.correct.includes(opt.id);
          const showWrong = checked && on && !data.correct.includes(opt.id);
          return (
            <li key={opt.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                  showCorrect
                    ? "border-aurora-400/80 bg-aurora-400/10"
                    : showWrong
                      ? "border-ember-300/60"
                      : on
                        ? "border-aurora-400/50 bg-night-900"
                        : "border-night-800 bg-night-950 hover:border-star-400"
                }`}
              >
                <input
                  type={inputType(data.mode)}
                  name="quiz"
                  checked={on}
                  onChange={() => toggle(opt.id)}
                  className="mt-1 accent-[#34d98c]"
                />
                <span className="text-base leading-relaxed">{opt.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCheck}
          className="rounded-xl bg-aurora-400 px-5 py-2.5 text-sm font-semibold text-ink-900"
        >
          Check
        </button>
        {checked && (
          <p className={`text-sm ${right ? "text-aurora-400" : "text-ember-300"}`} role="status">
            {right ? "That's it." : "Not quite. The highlighted answers are the ones to keep."}
          </p>
        )}
      </div>
    </fieldset>
  );
}
