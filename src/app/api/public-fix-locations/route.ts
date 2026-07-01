import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const chapters = await prisma.schoolChapter.findMany();
    let updatedCount = 0;

    for (const chapter of chapters) {
      if (chapter.country === 'Unknown') {
        const parts = chapter.city.split(',').map(s => s.trim().replace(/\.$/, ''));
        const parsedCountry = parts.length > 1 ? parts.pop()! : "Nigeria"; // default to Nigeria if no comma
        const parsedCity = parts.join(', ') || chapter.city;

        // Custom overrides based on the data we saw
        let finalCountry = parsedCountry;
        let finalCity = parsedCity;

        if (chapter.city.toLowerCase().includes('accra')) {
          finalCountry = 'Ghana';
          finalCity = 'Accra';
        } else if (chapter.city.toLowerCase().includes('lagos')) {
          finalCountry = 'Nigeria';
          finalCity = 'Lagos';
        } else if (chapter.city.toLowerCase().includes('akure')) {
          finalCountry = 'Nigeria';
          finalCity = 'Akure';
        } else if (chapter.city.toLowerCase().includes('kogi')) {
          finalCountry = 'Nigeria';
          finalCity = 'Kogi';
        } else if (chapter.city.toLowerCase().includes('ogbomoso') || chapter.city.toLowerCase().includes('oyo')) {
          finalCountry = 'Nigeria';
          finalCity = 'Ogbomoso';
        }

        await prisma.schoolChapter.update({
          where: { id: chapter.id },
          data: {
            city: finalCity,
            country: finalCountry
          }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
