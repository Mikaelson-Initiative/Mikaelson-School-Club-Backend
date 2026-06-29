import { prisma } from "@/lib/prisma";

export const metricsRepository = {
  async getDashboard() {
    const [
      schoolsRegistered,
      activeChapters,
      studentsAgg,
      volunteerApplications,
      schoolEnquiries,
      sponsorEnquiries,
      pendingApplications,
      unreadMessages,
      totalBlogPosts,
      publishedPosts,
      upcomingEvents,
      trainedChampions,
    ] = await Promise.all([
      prisma.schoolChapter.count(),
      prisma.schoolChapter.count({ where: { status: "ACTIVE" } }),
      prisma.schoolChapter.aggregate({ _sum: { studentsCount: true } }),
      prisma.volunteerApplication.count(),
      prisma.contactMessage.count({ where: { type: "SCHOOL_ENQUIRY" } }),
      prisma.contactMessage.count({ where: { type: "PARTNERSHIP" } }),
      prisma.application.count({ where: { status: "PENDING" } }),
      prisma.contactMessage.count({ where: { status: "UNREAD" } }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { isPublished: true } }),
      prisma.event.count({ where: { isPast: false } }),
      prisma.application.count({ where: { status: { in: ["TRAINING", "LAUNCHED"] } } }),
    ]);

    return {
      schoolsRegistered,
      activeChapters,
      studentsEnrolled:      studentsAgg._sum.studentsCount ?? 0,
      trainedChampions,
      volunteerApplications,
      schoolEnquiries,
      sponsorEnquiries,
      pendingApplications,
      unreadMessages,
      totalBlogPosts,
      publishedPosts,
      upcomingEvents,
    };
  },
};