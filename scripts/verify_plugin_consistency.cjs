// Consistency checks for the web3-audit-response-toolkit plugin.
//
// These catch the failure modes that are invisible in Markdown but break the
// skills at runtime: invalid JSON in the manifests, a manifest that advertises a
// different skill count/version than it ships, a skill whose declared version
// disagrees with the CHANGELOG, and dangling relative links / anchors.
//
// Usage: node verify_plugin_consistency.cjs
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const problems = []
const notes = []

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

/* ---------- 1. manifests parse ---------- */
let plugin, marketplace
try {
  plugin = JSON.parse(read('.claude-plugin/plugin.json'))
  console.log('OK  plugin.json parses')
} catch (e) {
  problems.push(`plugin.json does not parse: ${e.message}`)
}
try {
  marketplace = JSON.parse(read('.claude-plugin/marketplace.json'))
  console.log('OK  marketplace.json parses')
} catch (e) {
  problems.push(`marketplace.json does not parse: ${e.message}`)
}

/* ---------- 2. shipped skills vs manifest claims ---------- */
const skillsDir = path.join(ROOT, 'skills')
const shipped = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory()).sort()
  : []
console.log(`\nshipped skills (${shipped.length}): ${shipped.join(', ')}`)

if (plugin) {
  // plugin.json must name every shipped skill exactly once.
  for (const s of shipped) {
    if (!plugin.description.includes(s)) {
      problems.push(`plugin.json description does not mention shipped skill "${s}"`)
    }
  }
  // Count "Three skills"/"Three-skill"/"two-skill" style claims.
  const claim = /\b(Two|Three|Four)[-\s]skills?\b/i.exec(plugin.description)
  if (claim) {
    const claimed = { two: 2, three: 3, four: 4 }[claim[1].toLowerCase()]
    if (claimed !== shipped.length) {
      problems.push(
        `plugin.json description claims ${claimed} skills but ${shipped.length} are shipped`,
      )
    } else {
      console.log(`OK  plugin.json skill-count claim matches (${claimed})`)
    }
  }
}

if (marketplace) {
  const entry = marketplace.plugins && marketplace.plugins[0]
  if (entry) {
    if (plugin && entry.version !== plugin.version) {
      problems.push(
        `version drift: marketplace.json ${entry.version} != plugin.json ${plugin.version}`,
      )
    } else if (plugin) {
      console.log(`OK  marketplace/plugin version agree (${plugin.version})`)
    }
    const claim = /\b(Two|Three|Four)[-\s]skills?\b/i.exec(entry.description)
    if (claim) {
      const claimed = { two: 2, three: 3, four: 4 }[claim[1].toLowerCase()]
      if (claimed !== shipped.length) {
        problems.push(
          `marketplace.json description claims ${claimed} skills but ${shipped.length} are shipped`,
        )
      } else {
        console.log(`OK  marketplace skill-count claim matches (${claimed})`)
      }
    }
  }
}

/* ---------- 3. declared skills must exist on disk ---------- */
if (plugin) {
  for (const s of shipped) {
    if (!fs.existsSync(path.join(skillsDir, s, 'SKILL.md'))) {
      problems.push(`skills/${s} has no SKILL.md`)
    }
  }
}

/* ---------- 4. skill frontmatter version vs the CHANGELOG ----------
   A skill's declared version is the newest release that touched it, not the one
   that introduced it: 1.1.0 revised reviewing-audit-reports' severity framework
   without re-listing it under "Added". So a skill's version must equal the
   highest release whose section mentions it. */
const changelog = fs.existsSync(path.join(ROOT, 'CHANGELOG.md')) ? read('CHANGELOG.md') : ''

if (changelog) {
  // Split into release sections in file order (newest first in a Keep-a-Changelog file).
  const sections = []
  const re = /^## \[(\d+\.\d+\.\d+)\][^\n]*$/gm
  let m
  while ((m = re.exec(changelog)) !== null) sections.push({ version: m[1], at: m.index })
  sections.forEach((s, i) => {
    s.body = changelog.slice(s.at, i + 1 < sections.length ? sections[i + 1].at : changelog.length)
  })

  console.log(`\nCHANGELOG releases: ${sections.map((s) => s.version).join(', ')}`)

  const topVersion = sections.length > 0 ? sections[0].version : null

  for (const s of shipped) {
    const p = path.join(skillsDir, s, 'SKILL.md')
    if (!fs.existsSync(p)) continue
    const declared = (read(path.relative(ROOT, p)).match(/version:\s*"([\d.]+)"/) || [])[1]
    if (!declared) continue

    // A release "touches" a skill if it names the skill, or names one of the
    // files that only that skill owns. 1.1.0 revises reviewing-audit-reports'
    // severity framework and its SUBAGENT_PROMPT.md without repeating the skill
    // name, so matching on the name alone produces a false failure.
    const owned = {
      'reviewing-audit-reports': ['SUBAGENT_PROMPT.md', 'SEVERITY_REFERENCE.md'],
      'resolving-audit-findings': [],
      'aggregating-audit-campaigns': ['SCORING_RULES.md', 'DEDUP_PROMPT.md'],
    }[s] || []
    const touched = sections.filter(
      (sec) => sec.body.includes(s) || owned.some((f) => sec.body.includes(f)),
    )
    if (touched.length === 0) {
      problems.push(`CHANGELOG never mentions shipped skill "${s}"`)
      continue
    }
    // File order is newest-first, so touched[0] is the most recent release.
    const expected = touched[0].version
    if (declared !== expected) {
      problems.push(
        `skills/${s}/SKILL.md declares version ${declared} but its newest CHANGELOG entry is ${expected}`,
      )
    } else {
      const introduced = touched[touched.length - 1].version
      console.log(
        `OK  skills/${s} version ${declared} (introduced ${introduced}, last touched ${expected})`,
      )
    }
  }

  if (topVersion && plugin && plugin.version !== topVersion) {
    problems.push(`plugin.json version ${plugin.version} != CHANGELOG top ${topVersion}`)
  }
}

/* ---------- 5. severity weights agree across README and skills ---------- */
const readme = read('README.md')
const reviewSkill = read('skills/reviewing-audit-reports/SKILL.md')
const w = (s) => {
  const m = s.match(/Critical=8,\s*High=4,\s*Medium=2,\s*Low[=/](?:Info)?[=/](\d)/)
  return m ? m[1] : null
}
const rw = w(readme)
const sw = w(reviewSkill)
if (rw !== null && sw !== null && rw !== sw) {
  problems.push(`severity weight drift: README Low=${rw} but reviewing-audit-reports Low=${sw}`)
} else if (rw !== null && sw !== null) {
  console.log(`OK  severity Low weight agrees (${rw})`)
}

/* ---------- 6. dangling relative links + anchors ---------- */
const mdFiles = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.md')) mdFiles.push(p)
  }
})(ROOT)

// GitHub's heading-slug algorithm, replicated closely enough to be useful:
// lowercase, drop characters that are not alphanumeric/space/hyphen/underscore,
// then map every remaining space to exactly one hyphen. Note that runs of spaces
// are NOT collapsed and literal hyphens in the heading are preserved, so
// "Phase 2: RED - Convert" becomes "phase-2-red---convert" (space, hyphen, space).
const slug = (h) =>
  h
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/ /g, '-')

for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)

  for (const m of text.matchAll(/\]\((?!https?:|#)([^)#\s]+)(#[^)\s]*)?\)/g)) {
    const target = path.resolve(path.dirname(file), m[1])
    if (!fs.existsSync(target)) {
      problems.push(`${rel}: dead relative link -> ${m[1]}`)
    }
  }

  // In-document anchors, resolved against this file's own headings.
  const headings = new Set(
    [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => slug(h[1])),
  )
  for (const m of text.matchAll(/\]\(#([^)\s]+)\)/g)) {
    if (!headings.has(m[1])) {
      problems.push(`${rel}: dead anchor #${m[1]}`)
    }
  }
}

console.log(`\nscanned ${mdFiles.length} markdown files`)

/* ---------- report ---------- */
for (const n of notes) console.log(`note: ${n}`)
console.log('\n-----')
if (problems.length === 0) {
  console.log('PLUGIN_CONSISTENCY: PASS');
} else {
  console.log(`PLUGIN_CONSISTENCY: FAIL (${problems.length})`)
  for (const p of problems) console.log(`  - ${p}`)
}
process.exit(problems.length === 0 ? 0 : 1)
