// src/__tests__/validators.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure unit tests for all Zod schemas — no mocks needed.
// These run fast and catch every edge case without a database.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { applySchema, updateApplicationSchema } from "@/lib/validators/application";
import { contactSchema, updateContactSchema }   from "@/lib/validators/contact";
import { createSchoolSchema, updateSchoolSchema } from "@/lib/validators/school";
import { createEventSchema }                    from "@/lib/validators/event";
import { createPostSchema, updatePostSchema }   from "@/lib/validators/blog";
import { createTeamMemberSchema }               from "@/lib/validators/team";
import { createUserSchema, resetConfirmSchema } from "@/lib/validators/user";

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION — applySchema
// ─────────────────────────────────────────────────────────────────────────────
describe("applySchema", () => {
  const base = {
    schoolName:       "Test Secondary School",
    contactName:      "Jane Doe",
    role:             "Teacher",
    email:            "jane@school.edu",
    location:         "Lagos, Nigeria",
    studentsEstimate: 25,
  };

  it("passes a fully valid payload", () => {
    expect(applySchema.safeParse(base).success).toBe(true);
  });

  // ── Role enum — must match frontend dropdown exactly ──────────────────────
  it.each([
    "Principal",
    "Deputy Principal",
    "Head of Student Affairs",
    "Teacher",
    "Student",
    "Other",
  ])("accepts valid role: %s", (role) => {
    expect(applySchema.safeParse({ ...base, role }).success).toBe(true);
  });

  it("rejects a role not in the dropdown", () => {
    expect(applySchema.safeParse({ ...base, role: "Governor" }).success).toBe(false);
  });

  it("rejects a missing role", () => {
    const { role: _, ...noRole } = base;
    expect(applySchema.safeParse(noRole).success).toBe(false);
  });

  // ── Email ──────────────────────────────────────────────────────────────────
  it("lowercases email", () => {
    const res = applySchema.safeParse({ ...base, email: "JANE@SCHOOL.EDU" });
    expect(res.success && res.data.email).toBe("jane@school.edu");
  });

  it("rejects an invalid email address", () => {
    expect(applySchema.safeParse({ ...base, email: "notanemail" }).success).toBe(false);
  });

  // ── studentsEstimate — coercion ───────────────────────────────────────────
  it("coerces a numeric string to a number", () => {
    const res = applySchema.safeParse({ ...base, studentsEstimate: "30" });
    expect(res.success && res.data.studentsEstimate).toBe(30);
  });

  it("rejects studentsEstimate > 10000", () => {
    expect(applySchema.safeParse({ ...base, studentsEstimate: 10001 }).success).toBe(false);
  });

  it("rejects negative studentsEstimate", () => {
    expect(applySchema.safeParse({ ...base, studentsEstimate: -1 }).success).toBe(false);
  });

  it("rejects non-numeric string for studentsEstimate", () => {
    expect(applySchema.safeParse({ ...base, studentsEstimate: "many" }).success).toBe(false);
  });

  it("defaults studentsEstimate to 0 when omitted", () => {
    const { studentsEstimate: _, ...noEst } = base;
    const res = applySchema.safeParse(noEst);
    expect(res.success && res.data.studentsEstimate).toBe(0);
  });

  // ── Phone (optional) ──────────────────────────────────────────────────────
  it("accepts a missing phone field", () => {
    const { ...noPhone } = base;
    expect(applySchema.safeParse(noPhone).success).toBe(true);
  });

  it("accepts Nigerian format: +234 803 123 4567", () => {
    expect(applySchema.safeParse({ ...base, phone: "+234 803 123 4567" }).success).toBe(true);
  });

  it("accepts Ghanaian format: +233201234567", () => {
    expect(applySchema.safeParse({ ...base, phone: "+233201234567" }).success).toBe(true);
  });

  it("accepts Kenyan format: +254712345678", () => {
    expect(applySchema.safeParse({ ...base, phone: "+254712345678" }).success).toBe(true);
  });

  it("rejects obviously invalid phone strings", () => {
    expect(applySchema.safeParse({ ...base, phone: "not-a-phone-xyz" }).success).toBe(false);
  });

  // ── Message (optional) ────────────────────────────────────────────────────
  it("accepts a missing message field", () => {
    const { ...noMsg } = base;
    expect(applySchema.safeParse(noMsg).success).toBe(true);
  });

  it("rejects message longer than 2000 characters", () => {
    expect(applySchema.safeParse({ ...base, message: "a".repeat(2001) }).success).toBe(false);
  });

  // ── Required fields ───────────────────────────────────────────────────────
  it("rejects missing schoolName", () => {
    const { schoolName: _, ...b } = base;
    expect(applySchema.safeParse(b).success).toBe(false);
  });

  it("rejects missing contactName", () => {
    const { contactName: _, ...b } = base;
    expect(applySchema.safeParse(b).success).toBe(false);
  });

  it("rejects missing location", () => {
    const { location: _, ...b } = base;
    expect(applySchema.safeParse(b).success).toBe(false);
  });
});

// ── updateApplicationSchema ────────────────────────────────────────────────────
describe("updateApplicationSchema", () => {
  it("accepts REVIEWED", () => {
    expect(updateApplicationSchema.safeParse({ status: "REVIEWED" }).success).toBe(true);
  });

  it.each(["REVIEWED", "SCHEDULED", "TRAINING", "LAUNCHED", "REJECTED"])(
    "accepts valid status: %s",
    (status) => {
      expect(updateApplicationSchema.safeParse({ status }).success).toBe(true);
    }
  );

  it("rejects PENDING (not allowed in PATCH — it is the initial default)", () => {
    expect(updateApplicationSchema.safeParse({ status: "PENDING" }).success).toBe(false);
  });

  it("accepts empty object (all fields optional)", () => {
    expect(updateApplicationSchema.safeParse({}).success).toBe(true);
  });

  it("accepts adminNotes up to 5000 characters", () => {
    expect(
      updateApplicationSchema.safeParse({ adminNotes: "a".repeat(5000) }).success
    ).toBe(true);
  });

  it("rejects adminNotes over 5000 characters", () => {
    expect(
      updateApplicationSchema.safeParse({ adminNotes: "a".repeat(5001) }).success
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT — contactSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("contactSchema", () => {
  const base = {
    name:    "Test User",
    email:   "test@example.com",
    type:    "GENERAL" as const,
    message: "Hello, this is a test message that is long enough.",
  };

  it("passes a valid payload", () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });

  it("defaults type to GENERAL when omitted", () => {
    const { type: _, ...noType } = base;
    const res = contactSchema.safeParse(noType);
    expect(res.success && res.data.type).toBe("GENERAL");
  });

  it.each(["SCHOOL_ENQUIRY", "PARTNERSHIP", "MEDIA", "GENERAL"])(
    "accepts valid contact type: %s", (type) => {
      expect(contactSchema.safeParse({ ...base, type }).success).toBe(true);
    }
  );

  it("rejects an invalid type", () => {
    expect(contactSchema.safeParse({ ...base, type: "SPAM" }).success).toBe(false);
  });

  it("rejects message under 10 characters", () => {
    expect(contactSchema.safeParse({ ...base, message: "Hi" }).success).toBe(false);
  });

  it("rejects message over 5000 characters", () => {
    expect(contactSchema.safeParse({ ...base, message: "a".repeat(5001) }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(contactSchema.safeParse({ ...base, email: "bad" }).success).toBe(false);
  });
});

// ── updateContactSchema ────────────────────────────────────────────────────────
describe("updateContactSchema", () => {
  it("accepts READ", () => {
    expect(updateContactSchema.safeParse({ status: "READ" }).success).toBe(true);
  });

  it("accepts RESPONDED", () => {
    expect(updateContactSchema.safeParse({ status: "RESPONDED" }).success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateContactSchema.safeParse({}).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL — createSchoolSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createSchoolSchema", () => {
  const base = { name: "Test College", city: "Lagos", country: "Nigeria" };

  it("passes a valid payload", () => {
    expect(createSchoolSchema.safeParse(base).success).toBe(true);
  });

  it("defaults status to REGISTERED", () => {
    const res = createSchoolSchema.safeParse(base);
    expect(res.success && res.data.status).toBe("REGISTERED");
  });

  it.each(["REGISTERED", "ONBOARDING", "ACTIVE", "INACTIVE"])(
    "accepts valid status: %s", (status) => {
      expect(createSchoolSchema.safeParse({ ...base, status }).success).toBe(true);
    }
  );

  it("rejects invalid coordinatorEmail", () => {
    expect(
      createSchoolSchema.safeParse({ ...base, coordinatorEmail: "notvalid" }).success
    ).toBe(false);
  });

  it("accepts valid coordinatorEmail", () => {
    expect(
      createSchoolSchema.safeParse({ ...base, coordinatorEmail: "coord@school.edu" }).success
    ).toBe(true);
  });

  it("rejects missing name", () => {
    const { name: _, ...b } = base;
    expect(createSchoolSchema.safeParse(b).success).toBe(false);
  });
});

// ── updateSchoolSchema ────────────────────────────────────────────────────────
describe("updateSchoolSchema", () => {
  it("accepts empty object (all fields optional in PATCH)", () => {
    expect(updateSchoolSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only studentsCount", () => {
    expect(updateSchoolSchema.safeParse({ studentsCount: 50 }).success).toBe(true);
  });

  it("coerces studentsCount from a string (admin form input)", () => {
    const res = createSchoolSchema.safeParse({
      name: "Test College", city: "Lagos", country: "Nigeria",
      studentsCount: "75",
    });
    expect(res.success && res.data.studentsCount).toBe(75);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT — createEventSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createEventSchema", () => {
  const base = {
    title:       "Leadership Workshop",
    date:        "2025-09-01T15:30:00Z",
    time:        "3:30 PM - 5:00 PM",
    location:    "Room 301",
    description: "Learn leadership skills in this interactive workshop session.",
  };

  it("passes a valid payload", () => {
    expect(createEventSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an invalid date string", () => {
    expect(createEventSchema.safeParse({ ...base, date: "not-a-date" }).success).toBe(false);
  });

  it("rejects description under 10 characters", () => {
    expect(createEventSchema.safeParse({ ...base, description: "Short" }).success).toBe(false);
  });

  it("defaults isPast to false", () => {
    const res = createEventSchema.safeParse(base);
    expect(res.success && res.data.isPast).toBe(false);
  });

  it("accepts a valid registrationUrl", () => {
    expect(
      createEventSchema.safeParse({ ...base, registrationUrl: "https://forms.example.com" }).success
    ).toBe(true);
  });

  it("rejects an invalid registrationUrl", () => {
    expect(
      createEventSchema.safeParse({ ...base, registrationUrl: "not-a-url" }).success
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOG — createPostSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createPostSchema", () => {
  const base = {
    title:    "A Great Post About Leadership",
    category: "Student Story",
    author:   "Amara O.",
    excerpt:  "A short summary of this excellent post about growth.",
    content:  "This is the full content of the blog post. ".repeat(5),
  };

  it("passes a valid payload", () => {
    expect(createPostSchema.safeParse(base).success).toBe(true);
  });

  it("rejects meta title over 70 characters (SEO limit)", () => {
    expect(
      createPostSchema.safeParse({ ...base, metaTitle: "a".repeat(71) }).success
    ).toBe(false);
  });

  it("accepts meta title of exactly 70 characters", () => {
    expect(
      createPostSchema.safeParse({ ...base, metaTitle: "a".repeat(70) }).success
    ).toBe(true);
  });

  it("rejects meta description over 160 characters (SEO limit)", () => {
    expect(
      createPostSchema.safeParse({ ...base, metaDescription: "a".repeat(161) }).success
    ).toBe(false);
  });

  it("rejects content under 50 characters", () => {
    expect(createPostSchema.safeParse({ ...base, content: "Too short" }).success).toBe(false);
  });

  it("rejects excerpt over 500 characters", () => {
    expect(createPostSchema.safeParse({ ...base, excerpt: "a".repeat(501) }).success).toBe(false);
  });

  it("defaults isPublished to false", () => {
    const res = createPostSchema.safeParse(base);
    expect(res.success && res.data.isPublished).toBe(false);
  });

  it("accepts a valid imageUrl", () => {
    expect(
      createPostSchema.safeParse({ ...base, imageUrl: "https://example.com/img.jpg" }).success
    ).toBe(true);
  });

  it("rejects an invalid imageUrl", () => {
    expect(
      createPostSchema.safeParse({ ...base, imageUrl: "not-a-url" }).success
    ).toBe(false);
  });
});

// ── updatePostSchema ───────────────────────────────────────────────────────────
describe("updatePostSchema", () => {
  it("accepts empty object (all fields optional in PATCH)", () => {
    expect(updatePostSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only isPublished", () => {
    expect(updatePostSchema.safeParse({ isPublished: true }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM — createTeamMemberSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createTeamMemberSchema", () => {
  const base = {
    name:  "Michael Olukayode",
    role:  "Team Lead",
    email: "michael@mikaelsoninitiative.org",
  };

  it("passes a valid payload", () => {
    expect(createTeamMemberSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(createTeamMemberSchema.safeParse({ ...base, email: "bad" }).success).toBe(false);
  });

  it("defaults sortOrder to 0", () => {
    const res = createTeamMemberSchema.safeParse(base);
    expect(res.success && res.data.sortOrder).toBe(0);
  });

  it("coerces sortOrder from a string (admin form input)", () => {
    const res = createTeamMemberSchema.safeParse({ ...base, sortOrder: "3" });
    expect(res.success && res.data.sortOrder).toBe(3);
  });

  it("accepts valid social URLs", () => {
    expect(
      createTeamMemberSchema.safeParse({
        ...base,
        linkedinUrl: "https://linkedin.com/in/michael",
        twitterUrl:  "https://twitter.com/michael",
      }).success
    ).toBe(true);
  });

  it("rejects invalid social URLs", () => {
    expect(
      createTeamMemberSchema.safeParse({ ...base, linkedinUrl: "linkedin.com/michael" }).success
    ).toBe(false);
  });

  it("rejects bio over 2000 characters", () => {
    expect(
      createTeamMemberSchema.safeParse({ ...base, bio: "a".repeat(2001) }).success
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// USER — createUserSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createUserSchema", () => {
  it("requires password when provider is CREDENTIALS", () => {
    expect(
      createUserSchema.safeParse({ email: "admin@test.com", provider: "CREDENTIALS" }).success
    ).toBe(false);
  });

  it("accepts CREDENTIALS with a valid password", () => {
    expect(
      createUserSchema.safeParse({
        email:    "admin@test.com",
        provider: "CREDENTIALS",
        password: "SecurePass123",
      }).success
    ).toBe(true);
  });



  it("rejects password shorter than 8 characters", () => {
    expect(
      createUserSchema.safeParse({
        email:    "admin@test.com",
        provider: "CREDENTIALS",
        password: "short",
      }).success
    ).toBe(false);
  });

  it("defaults role to ADMIN", () => {
    const res = createUserSchema.safeParse({
      email:    "admin@test.com",
      provider: "CREDENTIALS",
      password: "Password123!",
    });
    expect(res.success && res.data.role).toBe("ADMIN");
  });

  it("accepts SUPERADMIN role", () => {
    expect(
      createUserSchema.safeParse({
        email:    "super@test.com",
        provider: "CREDENTIALS",
        password: "Password123!",
        role:     "SUPERADMIN",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid role", () => {
    expect(
      createUserSchema.safeParse({
        email:    "admin@test.com",
        provider: "CREDENTIALS",
        password: "Password123!",
        role:     "VIEWER",
      }).success
    ).toBe(false);
  });
});

// ── resetConfirmSchema ─────────────────────────────────────────────────────────
describe("resetConfirmSchema", () => {
  const base = {
    token:           "abc123token",
    newPassword:     "NewSecurePass1",
    confirmPassword: "NewSecurePass1",
  };

  it("passes when passwords match", () => {
    expect(resetConfirmSchema.safeParse(base).success).toBe(true);
  });

  it("rejects when passwords do not match", () => {
    expect(
      resetConfirmSchema.safeParse({ ...base, confirmPassword: "Different1" }).success
    ).toBe(false);
  });

  it("rejects newPassword under 8 characters", () => {
    expect(
      resetConfirmSchema.safeParse({ ...base, newPassword: "short", confirmPassword: "short" }).success
    ).toBe(false);
  });

  it("rejects missing token", () => {
    const { token: _, ...noToken } = base;
    expect(resetConfirmSchema.safeParse(noToken).success).toBe(false);
  });
});