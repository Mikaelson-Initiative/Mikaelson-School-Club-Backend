import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Mikaelson School Club API Documentation",
      version: "1.0.0",
      description: "API specifications for the Mikaelson School Club initiative, featuring role-based authentication and resource management. Use the authentication endpoints below to easily log in and switch between roles."
    },
    servers: [
      {
        url: "/api",
        description: "Standard API Base Path"
      }
    ],
    paths: {
      "/admin/auth": {
        get: {
          summary: "Get Default Admin Credentials and Current Session Status",
          description: "Returns default credentials for the ADMIN role and checks if the browser currently has a valid session.",
          responses: {
            200: {
              description: "Session status and default test credentials."
            }
          }
        },
        post: {
          summary: "Log in as Admin / Superadmin",
          description: "Authenticates and logs in as an Admin. If request body is empty or null, it logs in with the default admin credentials.",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", example: "happiness@mikaelsoninitiative.org" },
                    password: { type: "string", example: "happiness@123" }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Successfully authenticated as Admin." },
            400: { description: "Invalid credentials or missing input." },
            403: { description: "Access denied (user exists but is not an ADMIN/SUPERADMIN)." }
          }
        }
      },
      "/mentor/auth": {
        get: {
          summary: "Get Default Mentor Credentials and Current Session Status",
          description: "Returns default credentials for the MENTOR role and checks if the browser currently has a valid session.",
          responses: {
            200: {
              description: "Session status and default test credentials."
            }
          }
        },
        post: {
          summary: "Log in as Mentor",
          description: "Authenticates and logs in as a Mentor. If request body is empty or null, it logs in with the default mentor credentials.",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", example: "mentor@mikaelsoninitiative.org" },
                    password: { type: "string", example: "mentor@123" }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Successfully authenticated as Mentor." },
            400: { description: "Invalid credentials or missing input." },
            403: { description: "Access denied (user exists but is not a MENTOR)." }
          }
        }
      },
      "/members/auth": {
        get: {
          summary: "Get Default Student/Member Credentials and Current Session Status",
          description: "Returns default credentials for the STUDENT/MEMBER role and checks if the browser currently has a valid session.",
          responses: {
            200: {
              description: "Session status and default test credentials."
            }
          }
        },
        post: {
          summary: "Log in as Student / Member",
          description: "Authenticates and logs in as a Student/Member. If request body is empty or null, it logs in with the default student credentials.",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", example: "student@mikaelsoninitiative.org" },
                    password: { type: "string", example: "student@123" }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Successfully authenticated as Student." },
            400: { description: "Invalid credentials or missing input." },
            403: { description: "Access denied (user exists but is not a STUDENT or CHAMPION)." }
          }
        }
      },
      "/health": {
        get: {
          summary: "Health Check",
          description: "Returns database and system health status.",
          responses: {
            200: { description: "Healthy" }
          }
        }
      },
      "/members/me": {
        get: {
          summary: "Get Profile of Current Logged-in User",
          description: "Requires any authenticated student/member session.",
          responses: {
            200: { description: "Success" },
            401: { description: "Unauthenticated" }
          }
        },
        patch: {
          summary: "Update Profile of Current Logged-in User",
          description: "Requires any authenticated student/member session.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    gradeLevel: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Updated successfully." },
            401: { description: "Unauthenticated." }
          }
        }
      },
      "/mentor/pending-approvals": {
        get: {
          summary: "Get Pending Approvals (requires MENTOR role)",
          description: "Lists students awaiting chapter mentor approval.",
          responses: {
            200: { description: "Success" },
            401: { description: "Unauthenticated" },
            403: { description: "Access denied (not a Mentor)" }
          }
        }
      },
      "/lessons": {
        get: {
          summary: "List Lessons",
          responses: {
            200: { description: "Success" }
          }
        }
      },
      "/schools": {
        get: {
          summary: "List School Chapters",
          responses: {
            200: { description: "Success" }
          }
        }
      },
      "/team": {
        get: {
          summary: "List Core Team",
          responses: {
            200: { description: "Success" }
          }
        }
      },
      "/blog": {
        get: {
          summary: "List Blog Posts",
          responses: {
            200: { description: "Success" }
          }
        }
      },
      "/volunteer": {
        post: {
          summary: "Submit Volunteer Application",
          description: "Submits a new volunteer application. Rate limited.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    role: { type: "string" },
                    org: { type: "string" },
                    location: { type: "string" },
                    motivation: { type: "string" }
                  },
                  required: ["name", "email", "role"]
                }
              }
            }
          },
          responses: {
            201: { description: "Created successfully." },
            400: { description: "Validation failure or duplicate submission." }
          }
        }
      },
      "/admin/volunteers": {
        get: {
          summary: "List Volunteer Applications (requires Admin)",
          description: "Returns a paginated list of volunteer applications.",
          responses: {
            200: { description: "Success" },
            401: { description: "Unauthenticated" },
            403: { description: "Forbidden" }
          }
        }
      },
      "/admin/volunteers/{id}": {
        patch: {
          summary: "Update Volunteer Status (requires Admin)",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["REVIEWED", "SCHEDULED", "TRAINING", "LAUNCHED", "REJECTED"] }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: "Updated successfully." },
            400: { description: "Validation error." },
            401: { description: "Unauthenticated." },
            403: { description: "Forbidden." },
            404: { description: "Not found." }
          }
        },
        delete: {
          summary: "Soft-Delete Volunteer Application (requires Admin)",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            200: { description: "Deleted successfully." },
            401: { description: "Unauthenticated." },
            403: { description: "Forbidden." },
            404: { description: "Not found." }
          }
        }
      }
    }
  };

  return ok(spec);
}
