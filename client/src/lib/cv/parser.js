/**
 * Turn an uploaded CV (PDF, DOCX or image) into our structured CV format.
 *
 *   1. extractFromFile(file) → { text, photo }   (depends on file type)
 *   2. parseCVText(text)     → structured CV     (same for every type)
 *
 * Libraries load only when a CV is actually uploaded (dynamic import), so
 * nobody downloads several megabytes they don't use.
 *
 * Parsing is rule-based. CV layouts vary a lot, so the result is a draft the
 * candidate always reviews before saving.
 */
import { emptyCV, newEducation, newExperience } from './model'

/* ---------------- Step 1: extraction ---------------- */

async function loadPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  return { pdfjs, pdf: await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise }
}

async function pdfText(pdf) {
  let text = ''
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent()
    for (const item of content.items) text += item.str + (item.hasEOL ? '\n' : ' ')
    text += '\n'
  }
  return text
}

/**
 * Convert one pdf.js image object into our own ImageBitmap.
 * Depending on the browser, pdf.js gives us an ImageBitmap or a VideoFrame;
 * createImageBitmap accepts both and makes a copy that stays valid after
 * pdf.js frees its memory.
 */
async function toBitmap(img, pdfjs) {
  if (img.bitmap) return createImageBitmap(img.bitmap)
  if (!img.data) return null
  const { width, height, data, kind } = img
  const rgba = new Uint8ClampedArray(width * height * 4)
  if (kind === pdfjs.ImageKind.RGBA_32BPP) rgba.set(data)
  else if (kind === pdfjs.ImageKind.RGB_24BPP) {
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) { rgba[j] = data[i]; rgba[j + 1] = data[i + 1]; rgba[j + 2] = data[i + 2]; rgba[j + 3] = 255 }
  } else return null // 1-bit images are never photos
  return createImageBitmap(new ImageData(rgba, width, height))
}

/**
 * Find the candidate's photo on page 1: the largest embedded image whose
 * shape looks like a portrait (roughly square to tall). Logos and icons are
 * usually wide or tiny, so they're skipped.
 */
async function pdfPhoto(pdf, pdfjs) {
  try {
    const page = await pdf.getPage(1)
    const ops = await page.getOperatorList() // also makes pdf.js decode the images
    const names = new Set()
    ops.fnArray.forEach((fn, i) => {
      if (fn === pdfjs.OPS.paintImageXObject) names.add(ops.argsArray[i][0])
    })
    let best = null
    for (const name of names) {
      const store = name.startsWith('g_') ? page.commonObjs : page.objs
      const img = await new Promise((resolve) => store.get(name, resolve))
      if (!img?.width) continue
      const ratio = img.width / img.height
      if (ratio < 0.55 || ratio > 1.15 || img.width < 80) continue
      if (!best || img.width * img.height > best.width * best.height) best = img
    }
    return best ? await toBitmap(best, pdfjs) : null
  } catch {
    return null // a missing photo must never break the import
  }
}

async function docxExtract(file) {
  // mammoth is a CommonJS package: depending on the bundler, its functions are
  // on the module itself or on .default. This line handles both.
  const mod = await import('mammoth')
  const mammoth = mod.default ?? mod
  const arrayBuffer = await file.arrayBuffer()
  const { value: text } = await mammoth.extractRawText({ arrayBuffer })
  // Photos in Word files: take the first embedded image that looks like a portrait.
  let photo = null
  await mammoth.convertToHtml({ arrayBuffer }, {
    convertImage: mammoth.images.imgElement(async (image) => {
      if (photo) return { src: '' }
      try {
        // read('base64') works in browsers; plain read() needs Node's Buffer.
        const base64 = await image.read('base64')
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: image.contentType })
        const bitmap = await createImageBitmap(blob)
        const ratio = bitmap.width / bitmap.height
        if (ratio >= 0.55 && ratio <= 1.15 && bitmap.width >= 80) photo = bitmap
      } catch { /* unsupported image format */ }
      return { src: '' }
    }),
  })
  return { text, photo }
}

async function imageText(file, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => m.status === 'recognizing text' && onProgress?.(Math.round(m.progress * 100)),
  })
  try {
    return (await worker.recognize(file)).data.text
  } finally {
    await worker.terminate()
  }
}

export const ACCEPTED_CV_FILES = '.pdf,.docx,image/png,image/jpeg,image/webp'

export async function extractFromFile(file, onProgress) {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const { pdf, pdfjs } = await loadPdf(file)
    return { text: await pdfText(pdf), photo: await pdfPhoto(pdf, pdfjs) }
  }
  if (name.endsWith('.docx')) return docxExtract(file)
  if (name.endsWith('.doc')) throw new Error('Old .doc files can’t be read in the browser. Save it as .docx or PDF and upload again.')
  if (file.type.startsWith('image/')) return { text: await imageText(file, onProgress), photo: null }
  throw new Error('Unsupported file. Upload a PDF, DOCX, JPG or PNG.')
}

/* ---------------- Step 2: text → structured CV ---------------- */

const SECTIONS = {
  summary: /^(summary|profile|professional summary|career (objective|summary)|objective|about me)\b/i,
  experience: /^(experience|work experience|employment( history)?|professional experience|work history|career history)\b/i,
  education: /^(education|academic( background| qualifications?| records?)?|educational qualifications?|qualifications?)\b/i,
  skills: /^(skills|technical skills|key skills|core competencies|competencies|computer skills)\b/i,
  languages: /^(languages?( proficiency)?)\b/i,
  certifications: /^(certifications?|certificates?|trainings?|courses|training summary)\b/i,
  references: /^(references?|referees?)\b/i,
  personal: /^(personal (details|information|info))\b/i,
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE = /(\+?88)?0?1[3-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\+?\d[\d\s-]{8,}\d/
const LINKEDIN = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,]+/i
const URL = /https?:\/\/[^\s,]+/i
const YEAR_RANGE = /((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now|running)/i
const DOB = /(date of birth|d\.?o\.?b\.?)\s*[:-]?\s*([0-9]{1,2}[\s./-][A-Za-z0-9]{1,9}[\s./-][0-9]{2,4})/i
const NATIONALITY = /nationality\s*[:-]?\s*([A-Za-z]+)/i

function detectSection(line) {
  const candidate = line.replace(/[:|]+$/, '').trim()
  if (candidate.length > 45) return null
  return Object.keys(SECTIONS).find((key) => SECTIONS[key].test(candidate)) ?? null
}

function chunkByDates(lines) {
  const entries = []
  let current = null
  lines.forEach((line, index) => {
    const range = line.match(YEAR_RANGE)
    if (range) {
      const withoutDates = line.replace(YEAR_RANGE, '').replace(/[|,()–-]+\s*$/, '').trim()
      const heading = withoutDates || lines[index - 1] || ''
      if (!withoutDates && current?.details.at(-1) === heading) current.details.pop()
      current = { heading, start: range[1], end: range[2], details: [] }
      entries.push(current)
    } else if (current) current.details.push(line)
    else entries.push((current = { heading: line, start: '', end: '', details: [] }))
  })
  return entries
}

const splitHeading = (heading) => {
  const [first, ...rest] = heading.split(/\s+(?:at|@|\||–|-)\s+|,\s+/)
  return [first?.trim() ?? '', rest.join(', ').trim()]
}
const cleanBullet = (s) => s.replace(/^[-•*▪◦]\s*/, '').trim()
const isResultLine = (s) => /cgpa|gpa|grade|result|division|class|%/i.test(s)

export function parseCVText(raw) {
  const cv = emptyCV()
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const all = lines.join('\n')

  cv.personal.email = all.match(EMAIL)?.[0] ?? ''
  cv.personal.phone = all.match(PHONE)?.[0]?.replace(/\s+/g, ' ').trim() ?? ''
  cv.personal.linkedin = all.match(LINKEDIN)?.[0] ?? ''
  const url = all.match(URL)?.[0]
  if (url && !url.includes('linkedin')) cv.personal.website = url
  cv.personal.dateOfBirth = all.match(DOB)?.[2] ?? ''
  cv.personal.nationality = all.match(NATIONALITY)?.[1] ?? ''

  const sections = { header: [] }
  let current = 'header'
  for (const line of lines) {
    const section = detectSection(line)
    if (section) {
      current = section
      sections[section] ??= []
      const inline = line.split(':').slice(1).join(':').trim()
      if (inline) sections[section].push(inline)
    } else sections[current].push(line)
  }

  // Name: the first header line shaped like a name. Handles ALL CAPS names too.
  const isNameLike = (l) => /^[A-Za-z.'\s-]+$/.test(l) && l.split(' ').length >= 2 && l.split(' ').length <= 5 && !detectSection(l)
  const nameLine = sections.header.find(isNameLike) ?? ''
  cv.personal.fullName = nameLine === nameLine.toUpperCase() ? nameLine.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : nameLine
  const titleLine = sections.header[sections.header.indexOf(nameLine) + 1]
  if (titleLine && !EMAIL.test(titleLine) && !PHONE.test(titleLine) && titleLine.length < 60) cv.personal.title = titleLine

  const address = sections.header.find((l) => /(road|house|dhaka|chattogram|chittagong|sylhet|khulna|rajshahi|barishal|rangpur|mymensingh|bangladesh)/i.test(l) && !EMAIL.test(l))
  if (address) cv.personal.address = address.replace(/^address\s*[:-]?\s*/i, '')

  cv.personal.summary = (sections.summary ?? []).join(' ')
  const listItems = (key) => [...new Set((sections[key] ?? []).flatMap((l) => l.split(/[,•|;]+/)).map(cleanBullet).filter((s) => s && s.length < 40))]
  cv.skills = listItems('skills')
  cv.languages = listItems('languages')

  cv.experience = chunkByDates(sections.experience ?? []).map((e) => {
    const [role, company] = splitHeading(e.heading)
    const isCurrent = /present|current|now|running/i.test(e.end)
    return { ...newExperience(), role, company, start: e.start, end: isCurrent ? '' : e.end, current: isCurrent, details: e.details.map(cleanBullet).join('\n') }
  })
  cv.education = chunkByDates(sections.education ?? []).map((e) => {
    const [degree, institution] = splitHeading(e.heading)
    return { ...newEducation(), degree, institution: institution || e.details.find((d) => !isResultLine(d)) || '', start: e.start, end: e.end, result: e.details.find(isResultLine) ?? '' }
  })
  cv.certifications = (sections.certifications ?? []).map((l) => ({ id: crypto.randomUUID(), name: cleanBullet(l), issuer: '', year: l.match(/(19|20)\d{2}/)?.[0] ?? '' }))
  return cv
}
