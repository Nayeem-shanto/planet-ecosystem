import { eq } from 'drizzle-orm'
import { db, pool, schema } from '../src/db/index.js'

/**
 * Adds starter data: the first company and a few sample published jobs, so the
 * job board isn't empty on day one. Safe to run more than once.
 * Requires the alpha admin to exist (jobs need a creator).
 */
const [alpha] = await db.select().from(schema.users).where(eq(schema.users.role, 'alpha_admin')).limit(1)
if (!alpha) {
  console.error('\n❌ Run "npm run create-alpha" first.\n')
  process.exit(1)
}

const [company] = await db.insert(schema.companies).values({
  name: 'Planet IT Solution Limited',
  industry: 'Information Technology',
  location: 'Dhaka',
  about: 'The technology arm of Planet Ecosystem, a sister concern of Sandhani Group of Companies. Builds software, infrastructure and digital services for the group and its clients.',
  website: '',
}).onConflictDoNothing({ target: schema.companies.name }).returning()

const target = company ?? (await db.select().from(schema.companies).where(eq(schema.companies.name, 'Planet IT Solution Limited')))[0]
const existingJobs = await db.select({ id: schema.jobs.id }).from(schema.jobs).where(eq(schema.jobs.companyId, target.id)).limit(1)

if (!existingJobs.length) {
  const in30 = new Date(Date.now() + 30 * 86_400_000)
  const base = { companyId: target.id, createdById: alpha.id, status: 'published', publishedAt: new Date(), reviewedById: alpha.id, reviewedAt: new Date(), deadline: in30 }
  await db.insert(schema.jobs).values([
    {
      ...base, title: 'Junior Frontend Developer (React)', category: 'Software & IT', type: 'Full-time', workplace: 'Hybrid',
      location: 'Dhaka', experienceMin: 1, salaryMin: 35000, salaryMax: 55000, vacancies: 2,
      description: 'Build accessible, responsive React interfaces for products used across the group. You will work closely with backend developers and designers.',
      responsibilities: ['Build React components and pages', 'Integrate REST APIs with proper loading and error states', 'Review teammates’ pull requests'],
      requirements: ['1+ year building web applications', 'Solid HTML, CSS and modern JavaScript', 'Comfortable with Git'],
      benefits: ['Two festival bonuses', 'Health insurance', 'Learning budget'],
      skills: ['JavaScript', 'React', 'Tailwind CSS', 'Git', 'REST APIs'],
    },
    {
      ...base, title: 'Backend Developer (Node.js, PostgreSQL)', category: 'Software & IT', type: 'Full-time', workplace: 'On-site',
      location: 'Dhaka', experienceMin: 2, salaryMin: 60000, salaryMax: 90000, vacancies: 1,
      description: 'Design and build secure APIs and database schemas for internal platforms, including this careers portal.',
      responsibilities: ['Design REST APIs and PostgreSQL schemas', 'Write automated tests', 'Monitor performance and security'],
      requirements: ['2+ years with Node.js', 'Strong SQL skills', 'Understanding of authentication and authorization'],
      benefits: ['Health insurance', 'Provident fund'],
      skills: ['Node.js', 'Express', 'PostgreSQL', 'JavaScript', 'REST APIs', 'Docker'],
    },
    {
      ...base, title: 'IT Support Intern', category: 'Software & IT', type: 'Internship', workplace: 'On-site',
      location: 'Dhaka', experienceMin: 0, salaryMin: 12000, salaryMax: 15000, vacancies: 3,
      description: 'A six-month internship supporting staff across the group with hardware, networks and software.',
      responsibilities: ['Set up and maintain computers', 'Help staff with day-to-day IT issues', 'Document fixes'],
      requirements: ['Final-year student or recent graduate', 'Basic networking knowledge'],
      benefits: ['Mentorship', 'Possible full-time offer'],
      skills: ['Networking', 'Windows', 'Troubleshooting', 'Communication'],
    },
  ])
  console.log('✅ Added Planet IT Solution Limited and 3 sample jobs.')
} else {
  console.log('ℹ️  Seed data already present. Nothing added.')
}
await pool.end()
