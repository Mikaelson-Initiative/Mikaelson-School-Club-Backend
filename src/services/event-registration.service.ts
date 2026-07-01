import { prisma } from "@/lib/prisma";
import type { EventRegistrationInput } from "@/lib/validators/event-registration";
import { AppError } from "@/lib/api-helpers";

export async function createEventRegistration(eventId: string, data: EventRegistrationInput) {
  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, date: true, time: true, isDeleted: true }
  });

  if (!event || event.isDeleted) {
    throw new AppError(404, "Event not found.");
  }

  // Check if already registered
  const existing = await prisma.eventRegistration.findUnique({
    where: {
      eventId_email: {
        eventId,
        email: data.email
      }
    }
  });

  if (existing) {
    throw new AppError(409, "You have already registered for this event with this email.");
  }

  // Create registration
  const registration = await prisma.eventRegistration.create({
    data: {
      eventId,
      name: data.name,
      email: data.email,
      schoolName: data.schoolName || null
    }
  });

  return { registration, event };
}

export async function listEventRegistrations(eventId: string) {
  return prisma.eventRegistration.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' }
  });
}
