import { userRepository }                              from "@/repositories/user.repository";
import { verificationTokenRepository }                 from "@/repositories/verification-token.repository";
import { writeAuditLog }                               from "@/lib/audit";
import { prisma, Prisma }                              from "@/lib/prisma";
import { sendEmailVerificationEmail }                  from "@/lib/mailer";
import { env }                                         from "@/lib/env";
import type { CreateUserInput, UpdateUserInput, SignupInput } from "@/lib/validators/user";
import type { AuthProvider }                           from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function listUsers() {
  return userRepository.listAll();
}

export async function createUser(
  input: CreateUserInput,
  ctx: ActorContext
): Promise<
  | { success: true; id: string; email: string; role: string }
  | { success: false; status: number; error: string }
> {
  try {
    const passwordHash =
      input.provider === "CREDENTIALS"
        ? await bcrypt.hash(input.password!, 12)
        : null;

    const user = await userRepository.create({
      email:        input.email,
      name:         input.name ?? null,
      role:         input.role,
      provider:     (input.provider ?? "CREDENTIALS") as AuthProvider,
      passwordHash,
      emailVerified: new Date(),
    });

    await writeAuditLog({
      actorId:    ctx.actorId,
      actorEmail: ctx.actorEmail,
      action:     "CREATE",
      model:      "User",
      recordId:   user.id,
      after:      { email: user.email, role: user.role, provider: user.provider },
      ip:         ctx.ip,
      userAgent:  ctx.userAgent,
    });

    return { success: true, id: user.id, email: user.email, role: user.role };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, status: 400, error: "A user with this email already exists." };
    }
    throw err;
  }
}

export async function updateUser(
  id:           string,
  input:        UpdateUserInput,
  ctx:          ActorContext,
  currentUserId?: string
): Promise<
  | { success: true; id: string; role: string }
  | { success: false; status: number; error: string }
> {
  const existing = await userRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "User not found." };

  // Prevent a SUPERADMIN from demoting themselves
  if (id === currentUserId && input.role && input.role !== "SUPERADMIN") {
    return { success: false, status: 403, error: "You cannot change your own role." };
  }

  const updateData: Parameters<typeof userRepository.update>[1] = {};
  if (input.name        !== undefined) updateData.name         = input.name;
  if (input.role)                       updateData.role         = input.role;
  if (input.newPassword)                updateData.passwordHash = await bcrypt.hash(input.newPassword, 12);

  const updated = await userRepository.update(id, updateData);

  const isRoleChange = input.role && input.role !== existing.role;

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     isRoleChange ? "ROLE_CHANGE" : "UPDATE",
    model:      "User",
    recordId:   id,
    before:     { role: existing.role },
    after:      { role: updated.role  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, id: updated.id, role: updated.role };
}

export async function deleteUser(
  id: string,
  ctx: ActorContext,
  currentUserId?: string
): Promise<
  | { success: true }
  | { success: false; status: number; error: string }
> {
  if (id === currentUserId) {
    return { success: false, status: 403, error: "Cannot delete your own account." };
  }

  const existing = await userRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "User not found." };

  await userRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "User",
    recordId:   id,
    before:     { email: existing.email, role: existing.role },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}

export async function signupUser(
  input: SignupInput,
  ctx: ActorContext
): Promise<
  | { success: true; id: string; email: string; role: string }
  | { success: false; status: number; error: string }
> {
  try {
    if (input.chapterId) {
      const chapterExists = await prisma.schoolChapter.findFirst({
        where: { id: input.chapterId },
      });
      if (!chapterExists) {
        return { success: false, status: 400, error: "Selected chapter does not exist." };
      }
    }

    const email = input.email.trim().toLowerCase();
    
    // Check if the user already exists (physically, including soft-deleted ones)
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    let user;
    const passwordHash = await bcrypt.hash(input.password, 12);
    const accountStatus = input.role === "STUDENT" ? "PENDING_APPROVAL" : "ACTIVE";

    if (existing) {
      if (!existing.isDeleted) {
        return { success: false, status: 400, error: "A user with this email already exists." };
      }
      
      // Reactivate soft-deleted user
      user = await userRepository.update(existing.id, {
        name: input.name ?? null,
        passwordHash,
        emailVerified: null, // Reset verification status to require it again
        isDeleted: false,
        deletedAt: null,
        role: input.role,
        chapterId: input.chapterId ?? null,
        gradeLevel: input.gradeLevel ?? null,
        accountStatus,
      });
    } else {
      // Create new user
      user = await userRepository.create({
        email,
        name: input.name ?? null,
        role: input.role,
        provider: "CREDENTIALS",
        passwordHash,
        emailVerified: null, // Require email verification
        chapterId: input.chapterId ?? null,
        gradeLevel: input.gradeLevel ?? null,
        accountStatus,
      });
    }

    // Generate Verification Token (24-hour expiration)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await verificationTokenRepository.create({
      email,
      token,
      expiresAt,
    });

    // Send email verification link
    const verificationUrl = `${env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;
    await sendEmailVerificationEmail({
      to: email,
      name: user.name ?? "there",
      verificationUrl,
    });

    // Write Audit Log
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: existing ? "REACTIVATE" : "SIGNUP",
      model: "User",
      recordId: user.id,
      after: { email: user.email, role: user.role, provider: user.provider },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { success: true, id: user.id, email: user.email, role: user.role };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, status: 400, error: "A user with this email already exists." };
    }
    throw err;
  }
}

export async function verifyEmail(
  token: string,
  ctx?: ActorContext
): Promise<
  | { success: true }
  | { success: false; status: number; error: string }
> {
  const t = await verificationTokenRepository.findByToken(token);
  if (!t) {
    return { success: false, status: 404, error: "Verification token not found." };
  }

  if (t.usedAt) {
    return { success: false, status: 400, error: "Verification token has already been used." };
  }

  if (t.expiresAt < new Date()) {
    return { success: false, status: 400, error: "Verification token has expired." };
  }

  // Find user physically (including soft-deleted)
  const user = await prisma.user.findUnique({ where: { email: t.email } });
  if (!user || user.isDeleted) {
    return { success: false, status: 404, error: "User not found." };
  }

  // Update user verification status
  await userRepository.update(user.id, {
    emailVerified: new Date(),
  });

  // Mark token as used
  await verificationTokenRepository.markAsUsed(token);

  // Write audit log
  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "VERIFY_EMAIL",
    model: "User",
    recordId: user.id,
    ip: ctx?.ip,
    userAgent: ctx?.userAgent,
  });

  return { success: true };
}

export async function getMemberProfile(userId: string) {
  const user = await userRepository.findByIdWithDetails(userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    gradeLevel: user.gradeLevel,
    chapterId: user.chapterId,
    chapter: user.chapter,
    approvedById: user.approvedById,
    approvedBy: user.approvedBy,
    accountStatus: user.accountStatus,
    accountabilityPartnerId: user.accountabilityPartnerId,
    accountabilityPartner: user.accountabilityPartner,
  };
}

export async function updateMemberProfile(
  userId: string,
  input: { name?: string | null; gradeLevel?: string | null },
  ctx: ActorContext
) {
  const existing = await userRepository.findById(userId);
  if (!existing) return { success: false, status: 404, error: "Member not found." };

  const updated = await userRepository.update(userId, {
    name: input.name,
    gradeLevel: input.gradeLevel,
  });

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "UPDATE_PROFILE",
    model: "User",
    recordId: userId,
    before: { name: existing.name, gradeLevel: existing.gradeLevel },
    after: { name: updated.name, gradeLevel: updated.gradeLevel },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function getPendingApprovals(mentorUserId: string) {
  const mentor = await userRepository.findById(mentorUserId);
  if (!mentor) return { success: false, status: 404, error: "Mentor not found." };

  // Admins can see all, mentors can only see their chapter
  const isHostAdmin = mentor.role === "ADMIN" || mentor.role === "SUPERADMIN";
  if (!isHostAdmin && mentor.role !== "MENTOR") {
    return { success: false, status: 403, error: "Only mentors can view pending approvals." };
  }

  if (!isHostAdmin && !mentor.chapterId) {
    return { success: false, status: 400, error: "Mentor is not assigned to a chapter." };
  }

  if (isHostAdmin) {
    // Return all pending approvals
    const pendings = await prisma.user.findMany({
      where: { accountStatus: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: pendings };
  }

  const pendings = await userRepository.findPendingApproval(mentor.chapterId!);
  return { success: true, data: pendings };
}

export async function approveMember(mentorUserId: string, studentUserId: string, ctx: ActorContext) {
  const mentor = await userRepository.findById(mentorUserId);
  if (!mentor) return { success: false, status: 404, error: "Mentor not found." };

  const student = await userRepository.findById(studentUserId);
  if (!student) return { success: false, status: 404, error: "Student not found." };

  const isHostAdmin = mentor.role === "ADMIN" || mentor.role === "SUPERADMIN";
  if (!isHostAdmin && mentor.role !== "MENTOR") {
    return { success: false, status: 403, error: "Only mentors can approve accounts." };
  }

  if (!isHostAdmin && mentor.chapterId !== student.chapterId) {
    return { success: false, status: 403, error: "You can only approve members in your own chapter." };
  }

  const updated = await userRepository.update(studentUserId, {
    accountStatus: "ACTIVE",
    approvedById: mentorUserId,
  });

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "APPROVE_MEMBER",
    model: "User",
    recordId: studentUserId,
    after: { accountStatus: "ACTIVE", approvedById: mentorUserId },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function rejectMember(mentorUserId: string, studentUserId: string, ctx: ActorContext) {
  const mentor = await userRepository.findById(mentorUserId);
  if (!mentor) return { success: false, status: 404, error: "Mentor not found." };

  const student = await userRepository.findById(studentUserId);
  if (!student) return { success: false, status: 404, error: "Student not found." };

  const isHostAdmin = mentor.role === "ADMIN" || mentor.role === "SUPERADMIN";
  if (!isHostAdmin && mentor.role !== "MENTOR") {
    return { success: false, status: 403, error: "Only mentors can reject accounts." };
  }

  if (!isHostAdmin && mentor.chapterId !== student.chapterId) {
    return { success: false, status: 403, error: "You can only reject members in your own chapter." };
  }

  // Soft delete user
  await userRepository.softDelete(studentUserId);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "REJECT_MEMBER",
    model: "User",
    recordId: studentUserId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true };
}