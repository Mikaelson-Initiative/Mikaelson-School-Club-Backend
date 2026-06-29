// src/__tests__/integration/features.integration.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { credentialsAuthorize } from "@/lib/auth";
import { getSession } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";

// Mock api-helpers getSession for dynamic routes
vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>(
    "@/lib/api-helpers"
  );
  const getSessionMock = vi.fn();
  return {
    ...actual,
    getSession: getSessionMock,
    requireSession: async () => {
      const session = await getSessionMock();
      if (!session?.user) return actual.unauthorized();
      return session;
    },
    requireSuperAdmin: async () => {
      const session = await getSessionMock();
      if (!session?.user) return actual.unauthorized();
      if (session.user.role !== "SUPERADMIN") {
        return actual.forbidden("SUPERADMIN role required.");
      }
      return session;
    },
    requireRole: async (allowedRoles: any[]) => {
      const session = await getSessionMock();
      if (!session?.user) return actual.unauthorized();
      const role = session.user.role;
      if (role === "SUPERADMIN" || role === "ADMIN" || allowedRoles.includes(role)) {
        return session;
      }
      return actual.forbidden(`Access denied. Required roles: ${allowedRoles.join(", ")}`);
    },
  };
});

function fakeRequest(url: string, method = "GET", body: any = null): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "user-agent": "vitest-integration",
      "x-forwarded-for": "127.0.0.1",
    },
    body: body ? JSON.stringify(body) : null,
  });
}

describe("Extended Features (Integration Tests)", () => {
  let chapter: any;
  let mentorPassword = "password123";
  let studentPassword = "password123";

  beforeEach(async () => {
    vi.mocked(getSession).mockReset();

    // Clear db tables in truncate order (handled by integration/setup.ts)
    // Create a dummy chapter for testing
    chapter = await prisma.schoolChapter.create({
      data: {
        name: "Lagos Academy Club",
        city: "Lagos",
        country: "Nigeria",
        status: "ACTIVE",
      },
    });
  });

  describe("Phase 1 & 2: Signup, Approval, and Roster", () => {
    it("signs up a student as pending approval, blocked from logging in, then approved by mentor", async () => {
      // 1. Signup STUDENT
      const { POST: signupPOST } = await import("@/app/api/auth/signup/route");
      const signupReq = fakeRequest("http://localhost:3000/api/auth/signup", "POST", {
        email: "student@lagos.com",
        name: "Lagos Student",
        password: studentPassword,
        role: "STUDENT",
        chapterId: chapter.id,
        gradeLevel: "10",
      });

      const signupRes = await signupPOST(signupReq);
      expect(signupRes.status).toBe(201);

      const dbStudent = await prisma.user.findUnique({ where: { email: "student@lagos.com" } });
      expect(dbStudent).not.toBeNull();
      expect(dbStudent?.accountStatus).toBe("PENDING_APPROVAL");

      // Verify they must verify email first
      await expect(
        credentialsAuthorize({ email: "student@lagos.com", password: studentPassword })
      ).rejects.toThrow("Please verify your email before logging in.");

      // Set email verified in db
      await prisma.user.update({
        where: { email: "student@lagos.com" },
        data: { emailVerified: new Date() },
      });

      // Login attempt should now throw "pending approval"
      await expect(
        credentialsAuthorize({ email: "student@lagos.com", password: studentPassword })
      ).rejects.toThrow("Your account is pending approval by a mentor.");

      // 2. Signup MENTOR (lands as ACTIVE directly once verified)
      const mentorSignupReq = fakeRequest("http://localhost:3000/api/auth/signup", "POST", {
        email: "mentor@lagos.com",
        name: "Lagos Mentor",
        password: mentorPassword,
        role: "MENTOR",
        chapterId: chapter.id,
      });

      const mentorSignupRes = await signupPOST(mentorSignupReq);
      expect(mentorSignupRes.status).toBe(201);

      await prisma.user.update({
        where: { email: "mentor@lagos.com" },
        data: { emailVerified: new Date() },
      });

      // Mentor login succeeds
      const mentorLogin = await credentialsAuthorize({ email: "mentor@lagos.com", password: mentorPassword });
      expect(mentorLogin).not.toBeNull();

      // Mock mentor session for approvals API call
      vi.mocked(getSession).mockResolvedValue({
        user: { id: mentorLogin.id, email: mentorLogin.email, role: "MENTOR" },
      } as any);

      // 3. List pending approvals
      const { GET: pendingGET } = await import("@/app/api/mentor/pending-approvals/route");
      const pendingRes = await pendingGET();
      expect(pendingRes.status).toBe(200);
      const pendingList = await pendingRes.json();
      expect(pendingList).toHaveLength(1);
      expect(pendingList[0].id).toBe(dbStudent?.id);

      // 4. Approve student
      const { POST: approvePOST } = await import("@/app/api/mentor/approvals/[userId]/approve/route");
      const approveRes = await approvePOST(
        fakeRequest("http://localhost:3000/api/mentor/approvals/" + dbStudent?.id + "/approve", "POST"),
        { params: { userId: dbStudent?.id || "" } }
      );
      expect(approveRes.status).toBe(200);

      // Student login now succeeds
      const studentLogin = await credentialsAuthorize({ email: "student@lagos.com", password: studentPassword });
      expect(studentLogin).not.toBeNull();
      expect(studentLogin.role).toBe("STUDENT");

      // 5. Check roster
      const { GET: rosterGET } = await import("@/app/api/schools/[id]/members/route");
      const rosterRes = await rosterGET(
        fakeRequest(`http://localhost:3000/api/schools/${chapter.id}/members`),
        { params: { id: chapter.id } }
      );
      expect(rosterRes.status).toBe(200);
      const rosterList = await rosterRes.json();
      expect(rosterList).toHaveLength(2); // student + mentor
    });
  });

  describe("Phase 3: Habits & Streaks", () => {
    it("creates and logs habits, maintaining streaks correctly", async () => {
      // Create student user directly
      const hash = await bcrypt.hash(studentPassword, 12);
      const student = await prisma.user.create({
        data: {
          email: "student-habit@test.com",
          role: "STUDENT",
          passwordHash: hash,
          emailVerified: new Date(),
          accountStatus: "ACTIVE",
          chapterId: chapter.id,
        },
      });

      // Mock session for student
      vi.mocked(getSession).mockResolvedValue({
        user: { id: student.id, email: student.email, role: student.role },
      } as any);

      // 1. Create habit
      const { POST: habitPOST, GET: habitGET } = await import("@/app/api/habits/route");
      const hReq = fakeRequest("http://localhost:3000/api/habits", "POST", {
        name: "Code for 1 hour",
      });

      const hRes = await habitPOST(hReq);
      expect(hRes.status).toBe(201);
      const habit = await hRes.json();
      expect(habit.name).toBe("Code for 1 hour");

      // 2. Log habit today
      const { POST: logPOST } = await import("@/app/api/habits/[id]/log/route");
      const logRes = await logPOST(
        fakeRequest(`http://localhost:3000/api/habits/${habit.id}/log`, "POST"),
        { params: { id: habit.id } }
      );
      expect(logRes.status).toBe(200);

      // 3. Fetch habits list with streak
      const listRes = await habitGET();
      expect(listRes.status).toBe(200);
      const list = await listRes.json();
      expect(list).toHaveLength(1);
      expect(list[0].currentStreak).toBe(1);
    });
  });

  describe("Phase 5: Meeting Attendance", () => {
    it("marks meeting attendance for students", async () => {
      // Create mentor and student
      const mentor = await prisma.user.create({
        data: {
          email: "mentor-attendance@test.com",
          role: "MENTOR",
          emailVerified: new Date(),
          accountStatus: "ACTIVE",
          chapterId: chapter.id,
        },
      });

      const student = await prisma.user.create({
        data: {
          email: "student-attendance@test.com",
          role: "STUDENT",
          emailVerified: new Date(),
          accountStatus: "ACTIVE",
          chapterId: chapter.id,
        },
      });

      // Create an event for the chapter
      const event = await prisma.event.create({
        data: {
          title: "Weekly Chapter Huddle",
          date: new Date(),
          time: "17:00",
          location: "Room A",
          description: "Chapter sync",
          chapterId: chapter.id,
        },
      });

      // Mock mentor session
      vi.mocked(getSession).mockResolvedValue({
        user: { id: mentor.id, email: mentor.email, role: mentor.role },
      } as any);

      // Mark attendance
      const { POST: attPOST } = await import("@/app/api/admin/events/[id]/attendance/route");
      const attRes = await attPOST(
        fakeRequest(`http://localhost:3000/api/admin/events/${event.id}/attendance`, "POST", {
          userId: student.id,
          attended: true,
        }),
        { params: { id: event.id } }
      );
      expect(attRes.status).toBe(200);

      const dbAtt = await prisma.meetingAttendance.findFirst({
        where: { eventId: event.id, userId: student.id },
      });
      expect(dbAtt).not.toBeNull();
      expect(dbAtt?.attended).toBe(true);
    });
  });
});
