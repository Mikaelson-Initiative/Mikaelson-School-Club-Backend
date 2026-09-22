-- TEMPORARY: adds a TEST sponsorship type for live Paystack verification.
-- Remove this value + its handling once confirmed (see schema.prisma comment).
ALTER TYPE "SponsorshipType" ADD VALUE 'TEST';
