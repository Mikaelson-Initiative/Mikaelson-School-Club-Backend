// src/__tests__/features.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getMemberProfile,
  updateMemberProfile,
  getPendingApprovals,
  approveMember,
  rejectMember,
} from "@/services/user.service";
import {
  createHabit,
  getHabitsForUser,
  logHabit,
  getHabitHistory,
  calculateStreak,
} from "@/services/habit.service";
import {
  setAccountabilityPartner,
  createAccountabilityGroup,
  getPartnerAndGroupProgress,
  nudgeUser,
} from "@/services/accountability.service";
import {
  markMeetingAttendance,
  getUpcomingChapterMeetings,
} from "@/services/event.service";
import {
  createLesson,
  listLessons,
  getLesson,
  updateLesson,
  deleteLesson,
} from "@/services/lesson.service";
import {
  createProject,
  listProjects,
  getProject,
  listProjectsByChapter,
  updateProject,
  deleteProject,
} from "@/services/project.service";

type MockPrisma = any;
const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "user-1", actorEmail: "user@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("Extended Features Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Phase 1: Member Identity & Roles", () => {
    it("gets member profile successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "student-1",
        name: "Student",
        role: "STUDENT",
        gradeLevel: "11",
        chapterId: "chapter-1",
      });

      const profile = await getMemberProfile("student-1");
      expect(profile).not.toBeNull();
      expect(profile?.role).toBe("STUDENT");
      expect(profile?.gradeLevel).toBe("11");
    });

    it("updates self profile successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "student-1", name: "Student" });
      mockPrisma.user.update.mockResolvedValue({ id: "student-1", name: "New Name", gradeLevel: "12" });

      const res = await updateMemberProfile("student-1", { name: "New Name", gradeLevel: "12" }, ctx);
      expect(res.success).toBe(true);
      expect(res.data!.name).toBe("New Name");
    });

    it("lists pending approvals in chapter for mentor", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "mentor-1", role: "MENTOR", chapterId: "chapter-1" });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "student-2", name: "Pending Student", accountStatus: "PENDING_APPROVAL" },
      ]);

      const res = await getPendingApprovals("mentor-1");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it("approves student within the same chapter", async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({ id: "mentor-1", role: "MENTOR", chapterId: "chapter-1" }) // mentor
        .mockResolvedValueOnce({ id: "student-2", role: "STUDENT", chapterId: "chapter-1" }); // student
      mockPrisma.user.update.mockResolvedValue({ id: "student-2", accountStatus: "ACTIVE" });

      const res = await approveMember("mentor-1", "student-2", ctx);
      expect(res.success).toBe(true);
      expect(res.data!.accountStatus).toBe("ACTIVE");
    });

    it("rejects/soft-deletes student in chapter", async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({ id: "mentor-1", role: "MENTOR", chapterId: "chapter-1" })
        .mockResolvedValueOnce({ id: "student-2", role: "STUDENT", chapterId: "chapter-1" });
      mockPrisma.user.delete.mockResolvedValue({ id: "student-2" });

      const res = await rejectMember("mentor-1", "student-2", ctx);
      expect(res.success).toBe(true);
    });
  });

  describe("Phase 3: Habit Tracking & Streaks", () => {
    describe("Streak Calculation", () => {
      it("calculates 0 for empty logs", () => {
        expect(calculateStreak([])).toBe(0);
      });

      it("calculates streak correctly when logged today and yesterday", () => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date();
        dayBefore.setDate(dayBefore.getDate() - 2);

        const logs = [
          { loggedDate: today },
          { loggedDate: yesterday },
          { loggedDate: dayBefore },
        ];

        expect(calculateStreak(logs)).toBe(3);
      });

      it("calculates streak correctly when logged yesterday but not today", () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date();
        dayBefore.setDate(dayBefore.getDate() - 2);

        const logs = [
          { loggedDate: yesterday },
          { loggedDate: dayBefore },
        ];

        expect(calculateStreak(logs)).toBe(2);
      });

      it("calculates 0 when no logs today or yesterday", () => {
        const dayBefore = new Date();
        dayBefore.setDate(dayBefore.getDate() - 2);

        const logs = [
          { loggedDate: dayBefore },
        ];

        expect(calculateStreak(logs)).toBe(0);
      });
    });

    it("creates a habit successfully", async () => {
      mockPrisma.habit.create.mockResolvedValue({ id: "habit-1", name: "Read Books", userId: "student-1" });

      const res = await createHabit("student-1", { name: "Read Books" }, ctx);
      expect(res.success).toBe(true);
      expect(res.data.name).toBe("Read Books");
    });

    it("logs a habit idempotently", async () => {
      mockPrisma.habit.findFirst.mockResolvedValue({ id: "habit-1", userId: "student-1" });
      mockPrisma.habitLog.findUnique.mockResolvedValue(null);
      mockPrisma.habitLog.create.mockResolvedValue({ id: "log-1", habitId: "habit-1", loggedDate: new Date() });

      const res = await logHabit("student-1", "habit-1", undefined, ctx);
      expect(res.success).toBe(true);
      expect(res.data!.id).toBe("log-1");
    });
  });

  describe("Phase 4: Accountability Hub", () => {
    it("sets accountability partner successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "student-2" });
      mockPrisma.user.update.mockResolvedValue({ id: "student-1", accountabilityPartnerId: "student-2" });

      const res = await setAccountabilityPartner("student-1", "student-2");
      expect(res.success).toBe(true);
    });

    it("creates accountability group successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "student-2" });
      mockPrisma.accountabilityGroup.create.mockResolvedValue({ id: "group-1", name: "Coders Hub" });

      const res = await createAccountabilityGroup("student-1", "Coders Hub", ["student-2"]);
      expect(res.success).toBe(true);
    });

    it("nudges peer successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "student-2", name: "Buddy" });

      const res = await nudgeUser("student-1", "student-2", "Keep it up!", ctx);
      expect(res.success).toBe(true);
      expect(res.message).toContain("Buddy");
    });
  });

  describe("Phase 5: Meetings & Skill Lab", () => {
    it("marks meeting attendance successfully", async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({ id: "mentor-1", role: "MENTOR", chapterId: "chapter-1" }) // mentor
        .mockResolvedValueOnce({ id: "student-2", role: "STUDENT", chapterId: "chapter-1" }); // student
      mockPrisma.event.findFirst.mockResolvedValue({ id: "event-1", chapterId: "chapter-1" });
      mockPrisma.meetingAttendance.upsert.mockResolvedValue({ id: "att-1", eventId: "event-1", attended: true });

      const res = await markMeetingAttendance("mentor-1", "event-1", "student-2", true, ctx);
      expect(res.success).toBe(true);
      expect(res.data!.attended).toBe(true);
    });

    it("manages Skill Lab Lessons CRUD", async () => {
      mockPrisma.lesson.create.mockResolvedValue({ id: "lesson-1", title: "Git Basics" });
      mockPrisma.lesson.findMany.mockResolvedValue([{ id: "lesson-1", title: "Git Basics" }]);
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: "lesson-1", title: "Git Basics" });
      mockPrisma.lesson.update.mockResolvedValue({ id: "lesson-1", title: "Advanced Git" });
      mockPrisma.lesson.delete.mockResolvedValue({ id: "lesson-1" });

      const createRes = await createLesson({ title: "Git Basics", content: "Learn Git step by step", category: "DIGITAL_LITERACY", estimatedMinutes: 10, skillTags: ["git"] }, ctx);
      expect(createRes.success).toBe(true);

      const listRes = await listLessons();
      expect(listRes).toBeDefined();
      expect(listRes).toHaveLength(1);

      const getRes = await getLesson("lesson-1");
      expect(getRes?.title).toBe("Git Basics");

      const updateRes = await updateLesson("lesson-1", { title: "Advanced Git" }, ctx);
      expect(updateRes.success).toBe(true);

      const deleteRes = await deleteLesson("lesson-1", ctx);
      expect(deleteRes.success).toBe(true);
    });
  });

  describe("Phase 6: Community Projects", () => {
    it("manages Community Projects CRUD", async () => {
      mockPrisma.project.create.mockResolvedValue({ id: "project-1", title: "Clean Energy" });
      mockPrisma.project.findMany.mockResolvedValue([{ id: "project-1", title: "Clean Energy" }]);
      mockPrisma.project.findFirst.mockResolvedValue({ id: "project-1", title: "Clean Energy" });
      mockPrisma.project.update.mockResolvedValue({ id: "project-1", title: "Green School Grid" });
      mockPrisma.project.delete.mockResolvedValue({ id: "project-1" });

      const createRes = await createProject({ chapterId: "chapter-1", title: "Clean Energy", description: "Solar power installation", term: "Fall 2026", status: "PLANNING", memberIds: [] }, ctx);
      expect(createRes.success).toBe(true);

      const listRes = await listProjects();
      expect(listRes).toBeDefined();
      expect(listRes).toHaveLength(1);

      const getRes = await getProject("project-1");
      expect(getRes?.title).toBe("Clean Energy");

      const updateRes = await updateProject("project-1", { title: "Green School Grid" }, ctx);
      expect(updateRes.success).toBe(true);

      const deleteRes = await deleteProject("project-1", ctx);
      expect(deleteRes.success).toBe(true);
    });
  });
});
