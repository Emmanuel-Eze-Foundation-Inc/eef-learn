"use client";

import { ChevronDown, CircleCheck, Circle, CircleDot, Lock, SquarePen } from "lucide-react";
import Link from "next/link";

import { LearnLockup } from "../../../components/learn-lockup";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  formatMinutes,
  formatTime,
  lessonMinutes,
  optionalMinutes,
  totalMinutes,
  totalOptionalMinutes,
  type CourseLesson,
  type CourseModule,
  type CourseOutline,
  type LessonState,
} from "@/lib/course-model";

function StateIcon({ state, current }: { state: LessonState; current: boolean }) {
  if (state === "mastered") return <CircleCheck className="size-4 shrink-0 text-gold-400" aria-label="Completed" />;
  if (state === "locked") return <Lock className="size-3.5 shrink-0 text-star-400/70" aria-label="Locked" />;
  if (current) return <CircleDot className="size-4 shrink-0 text-aurora-400" aria-label="Current" />;
  return <Circle className="size-4 shrink-0 text-star-400/60" aria-label="Not started" />;
}

function LessonRow({
  lesson,
  label,
  currentId,
  indent,
  onOpen,
}: {
  lesson: CourseLesson;
  label?: string;
  currentId: string;
  indent: number;
  onOpen: (id: string) => void;
}) {
  const current = lesson.id === currentId;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={current}
        onClick={() => onOpen(lesson.id)}
        className={cn(
          "h-auto items-start gap-2.5 py-2 data-[active=true]:bg-aurora-400/10 data-[active=true]:text-star-100",
          lesson.state === "locked" && "text-star-400",
        )}
        style={{ paddingLeft: `${0.5 + indent * 0.85}rem` }}
      >
        <span className="mt-0.5">
          <StateIcon state={lesson.state} current={current} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-snug">{label ?? lesson.title}</span>
          <span className="mt-0.5 block font-mono text-[10px] tracking-[0.08em] text-star-400/80">
            {lesson.blocks.length ? `${formatMinutes(lessonMinutes(lesson))} · ${lesson.blocks.length} parts` : "empty"}
          </span>
          {optionalMinutes(lesson) ? (
            <span className="block font-mono text-[10px] tracking-[0.08em] text-star-400/80">
              + {formatMinutes(optionalMinutes(lesson))} optional
            </span>
          ) : null}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ModuleGroup({
  module,
  index,
  currentId,
  onOpen,
}: {
  module: CourseModule;
  index: number;
  currentId: string;
  onOpen: (id: string) => void;
}) {
  const all = [module.head, ...module.lessons];
  const done = all.filter((l) => l.state === "mastered").length;
  const minutes = totalMinutes(all);
  const extra = totalOptionalMinutes(all);
  const holdsCurrent = all.some((l) => l.id === currentId);
  const baseDepth = module.head.depth;

  return (
    <Collapsible defaultOpen={holdsCurrent || index === 0} className="group/module">
      <SidebarGroup className="py-1">
        <CollapsibleTrigger className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-night-800/60">
          <span className="grid size-7 shrink-0 place-items-center rounded-md border border-night-800 bg-night-950 font-mono text-[11px] text-star-400">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-snug font-semibold text-star-100">{module.head.title}</span>
            <span className="mt-0.5 block font-mono text-[10px] tracking-[0.08em] text-star-400">
              {done}/{all.length} done{minutes ? ` · ${formatTime(minutes, extra)}` : ""}
            </span>
          </span>
          <ChevronDown className="mt-1 size-4 shrink-0 text-star-400 transition-transform group-data-[state=closed]/module:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu className="mt-1 gap-0.5">
            <LessonRow
              lesson={module.head}
              label={module.lessons.length ? `Overview` : undefined}
              currentId={currentId}
              indent={1}
              onOpen={onOpen}
            />
            {module.lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                currentId={currentId}
                indent={lesson.depth - baseDepth}
                onOpen={onOpen}
              />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function CourseSidebar({
  title,
  slug,
  outline,
  lessons,
  currentId,
  isCreator,
  onOpen,
}: {
  title: string;
  slug: string;
  outline: CourseOutline;
  lessons: CourseLesson[];
  currentId: string;
  isCreator: boolean;
  onOpen: (id: string) => void;
}) {
  const done = lessons.filter((l) => l.state === "mastered").length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const minutes = totalMinutes(lessons);
  const extra = totalOptionalMinutes(lessons);

  return (
    <Sidebar className="border-r border-night-800">
      <SidebarHeader className="gap-4 px-4 pt-4 pb-3">
        <Link href="/dashboard" aria-label="Your maps">
          <LearnLockup />
        </Link>
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">Course</p>
          <h2 className="mt-1 text-base leading-snug font-semibold text-star-100">{title}</h2>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-star-400 uppercase">
            <span>
              {done} of {lessons.length} lessons{minutes ? ` · ${formatMinutes(minutes)}` : ""}
            </span>
            <span className="text-star-100">{pct}%</span>
          </div>
          <Progress value={pct} aria-label="Course progress" />
          {extra ? (
            <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-star-400">
              + {formatMinutes(extra)} of optional deep dives
            </p>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pb-4">
        {outline.intro ? (
          <SidebarGroup className="py-1">
            <p className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">
              Start here
            </p>
            <SidebarMenu>
              <LessonRow lesson={outline.intro} currentId={currentId} indent={0} onOpen={onOpen} />
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
        {outline.modules.map((module, i) => (
          <ModuleGroup key={module.head.id} module={module} index={i} currentId={currentId} onOpen={onOpen} />
        ))}
      </SidebarContent>
      {isCreator ? (
        <SidebarFooter className="border-t border-night-800 p-3">
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/maps/${slug}/studio`}>
              <SquarePen className="size-4" />
              Edit in studio
            </Link>
          </Button>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </Sidebar>
  );
}
