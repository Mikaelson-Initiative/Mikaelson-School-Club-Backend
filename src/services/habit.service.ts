// src/services/habit.service.ts
import { habitRepository } from "@/repositories/habit.repository";
import { writeAuditLog } from "@/lib/audit";
import type { CreateHabitInput } from "@/lib/validators/habit";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export function calculateStreak(logs: { loggedDate: Date }[]): number {
  if (logs.length === 0) return 0;

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];

  const logDates = new Set(logs.map(log => toDateStr(log.loggedDate)));

  const today = new Date();
  const todayStr = toDateStr(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  if (!logDates.has(todayStr) && !logDates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let checkDate = logDates.has(todayStr) ? today : yesterday;

  while (true) {
    const checkDateStr = toDateStr(checkDate);
    if (logDates.has(checkDateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export async function createHabit(userId: string, input: CreateHabitInput, ctx: ActorContext) {
  const habit = await habitRepository.create(userId, input.name);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "CREATE_HABIT",
    model: "Habit",
    recordId: habit.id,
    after: { name: habit.name },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: habit };
}

export async function getHabitsForUser(userId: string) {
  const habits = await habitRepository.listAllForUser(userId);

  const enrichedHabits = habits.map((habit) => {
    const currentStreak = calculateStreak(habit.logs);
    return {
      id: habit.id,
      name: habit.name,
      createdAt: habit.createdAt,
      isActive: habit.isActive,
      currentStreak,
      logsCount: habit.logs.length,
    };
  });

  return enrichedHabits;
}

export async function logHabit(
  userId: string,
  habitId: string,
  loggedDateStr: string | undefined,
  ctx: ActorContext
) {
  const habit = await habitRepository.findById(habitId);
  if (!habit) {
    return { success: false, status: 404, error: "Habit not found." };
  }

  if (habit.userId !== userId) {
    return { success: false, status: 403, error: "Forbidden." };
  }

  const logDate = loggedDateStr ? new Date(loggedDateStr) : new Date();

  // Check if log already exists
  const existingLog = await habitRepository.findLog(habitId, logDate);
  if (existingLog) {
    return { success: true, data: existingLog };
  }

  const log = await habitRepository.createLog(habitId, userId, logDate);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "LOG_HABIT",
    model: "HabitLog",
    recordId: log.id,
    after: { habitId, loggedDate: log.loggedDate },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: log };
}

export async function getHabitHistory(userId: string, habitId: string) {
  const habit = await habitRepository.findById(habitId);
  if (!habit) {
    return { success: false, status: 404, error: "Habit not found." };
  }

  if (habit.userId !== userId) {
    return { success: false, status: 403, error: "Forbidden." };
  }

  const logs = await habitRepository.getLogsForHabit(habitId);
  return { success: true, data: logs };
}
