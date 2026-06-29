const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const { search, replace } of replacements) {
    if (typeof search === 'string') {
        content = content.split(search).join(replace);
    } else {
        content = content.replace(search, replace);
    }
  }
  fs.writeFileSync(fullPath, content, 'utf8');
}

replaceInFile('middleware.ts', [{ search: 'const { pathname, method } = req.nextUrl;', replace: 'const { pathname } = req.nextUrl;\n  const method = req.method;' }]);
replaceInFile('src/__tests__/setup.ts', [{ search: 'process.env.NODE_ENV               = "test";', replace: 'Object.defineProperty(process.env, "NODE_ENV", { value: "test" });' }]);
replaceInFile('src/app/api/admin/cron/archive-audit/route.ts', [
  { search: '.filter((log) =>', replace: '.filter((log: any) =>' },
  { search: '.map((l) => l.id)', replace: '.map((l: any) => l.id)' }
]);

function fixZodErrors(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) fixZodErrors(fullPath);
    else if (fullPath.endsWith('.ts')) {
      let c = fs.readFileSync(fullPath, 'utf8');
      c = c.replace(/\.error\.errors/g, '.error.issues').replace(/error: e\.errors/g, 'error: e.issues').replace(/e\.errors/g, 'e.issues');
      fs.writeFileSync(fullPath, c, 'utf8');
    }
  }
}
fixZodErrors(path.join(process.cwd(), 'src/app/api'));

replaceInFile('src/lib/env.ts', [
  { search: 'parsed.error.errors', replace: 'parsed.error.issues' },
  { search: '.reduce((acc, e) =>', replace: '.reduce((acc: any, e: any) =>' }
]);
replaceInFile('src/lib/api-helpers.ts', [
  { search: 'Exclude<Awaited<ReturnType<typeof auth>>, null> | Response', replace: 'import("next-auth").Session | Response' },
  { search: 'return session as Exclude<Awaited<ReturnType<typeof auth>>, null>;', replace: 'return session as import("next-auth").Session;' }
]);

const faPath = path.join(process.cwd(), 'src/lib/firebase-admin.ts');
if (fs.existsSync(faPath) && !fs.readFileSync(faPath, 'utf8').includes('export')) {
  fs.appendFileSync(faPath, '\nexport const _dummy = true;\n');
}

replaceInFile('src/lib/auth.ts', [{ search: 'token.role = user.role;', replace: 'token.role = user.role as "ADMIN" | "SUPERADMIN";' }]);

let pC = fs.readFileSync(path.join(process.cwd(), 'src/lib/prisma.ts'), 'utf8');
pC = pC.replace(/async (findMany|findFirst|findFirstOrThrow|count|aggregate|delete|deleteMany)\(\{ model, args, query \}\) \{/g, 'async $1({ model, args, query }: { model: any, args: any, query: any }) {');
fs.writeFileSync(path.join(process.cwd(), 'src/lib/prisma.ts'), pC, 'utf8');

replaceInFile('src/lib/restore.ts', [
  { search: 'prisma.$queryRawUnsafe<{ id: string }[]>', replace: 'prisma.$queryRawUnsafe' },
  { search: 'const rows = await result;', replace: 'const rows = await result as { id: string }[];' }
]);
