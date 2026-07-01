import { prisma } from './src/lib/prisma';

const HARDCODED_OFFICERS: { name: string; role: string; avatarUrl?: string; linkedinUrl?: string }[] = [
  { name: 'Michael Olukayode', role: 'Team Lead', avatarUrl: '/team/Michael%20Olukayode.jpg', linkedinUrl: 'https://www.linkedin.com/in/michael-olukayode-73890b214/' },
  { name: 'Boluwatife Adeleke', role: 'Project Manager', avatarUrl: '/team/Boluwatife%20Mercy%20Adeleke.jpeg', linkedinUrl: 'https://www.linkedin.com/in/boluwatifemercyadeleke/' },
  { name: 'Irene Ezechi', role: 'Program Manager', avatarUrl: '/team/Irene%20Ezechi.jpg', linkedinUrl: 'https://www.linkedin.com/in/ireneezechi/' },
  { name: 'Mariam Jimoh', role: 'ESG and Impact', avatarUrl: '/team/Mariam%20Jimoh.jpeg', linkedinUrl: 'https://www.linkedin.com/in/jimohmariamajoke/' },
  { name: 'Bright Temitope Ayegbusi', role: 'Visuals and Designs', avatarUrl: '/team/Ayegbusi%20Bright%20Temitope.jpg' },
  { name: 'Feranmi Oluwole', role: 'Operations Manager', avatarUrl: '/team/Feranmi%20Oluwole.JPG', linkedinUrl: 'https://www.linkedin.com/in/feranmi-oluwole-675712339/' },
  { name: 'Theresa Asiedu Gyamfi', role: 'GRC and Policy Engineer', avatarUrl: '/team/Asiedu%20Gyamfi.jpg', linkedinUrl: 'https://www.linkedin.com/in/theresa-gyamfi/' },
  { name: 'Esther Adeoye', role: 'Social Media Manager', avatarUrl: '/team/Adeoye%20Esther.jpg', linkedinUrl: 'https://www.linkedin.com/in/adeoye-esther-4151a62b8/' },
  { name: 'Ariyo Aresa', role: 'Front-end Engineer', avatarUrl: '/team/AriyoAresa.avif', linkedinUrl: 'https://www.linkedin.com/in/ariyoaresa/' },
  { name: 'Ayomide Idowu', role: 'Visuals and Designs', avatarUrl: '/team/Ayomide%20Idowu.jpg', linkedinUrl: 'https://www.linkedin.com/in/ayomide-idowu-4a852623a/' },
  { name: 'Happiness Obochi', role: 'Team Member', avatarUrl: '/team/Happiness%20Obochi.jpg', linkedinUrl: 'https://www.linkedin.com/in/happinessobochi/' },
];

async function main() {
  console.log('Seeding team members...');
  
  for (let i = 0; i < HARDCODED_OFFICERS.length; i++) {
    const officer = HARDCODED_OFFICERS[i];
    if (!officer) continue;
    
    // @ts-ignore
    const email = officer.name.split(' ')[0].toLowerCase() + '@mikaelsoninitiative.org';
    
    await prisma.teamMember.create({
      data: {
        name: officer.name,
        role: officer.role,
        email: email,
        avatarUrl: officer.avatarUrl || null,
        linkedinUrl: officer.linkedinUrl || null,
        sortOrder: i,
      }
    });
    console.log("Added: " + officer.name);
  }
  
  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
