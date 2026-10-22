import fs from 'fs';

const report = JSON.parse(fs.readFileSync('./pwa-audits.json', 'utf8'));

console.log('=== Lighthouse PWA Audits Report ===');
for (const [id, audit] of Object.entries(report.audits || {})) {
  const status = audit.score === 1 ? 'PASS' : audit.score === 0 ? 'FAIL' : 'INFO';
  console.log(`[${status}] ${id}: ${audit.title}`);
  if (audit.score !== 1) {
    if (audit.explanation) console.log(`   Explanation: ${audit.explanation}`);
    if (audit.description) console.log(`   Description: ${audit.description}`);
    if (audit.displayValue) console.log(`   DisplayValue: ${audit.displayValue}`);
    if (audit.details?.items) console.log(`   Details items:`, audit.details.items);
  }
}
