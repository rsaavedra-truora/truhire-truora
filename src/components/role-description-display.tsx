'use client'

import { useState } from 'react'

interface RoleDescriptionDisplayProps {
  structured?: {
    area?: string
    seniority?: string
    summary?: string
    responsibilities?: string[]
    requirements?: string[]
    nice_to_have?: string[]
  } | null
  plainText?: string | null
  title?: string
}

export function RoleDescriptionDisplay({ structured, plainText, title }: RoleDescriptionDisplayProps) {
  if (structured) {
    return <StructuredDisplay jd={structured} />
  }

  if (plainText) {
    return <TruoraJDDisplay text={plainText} processTitle={title} />
  }

  return null
}

function StructuredDisplay({ jd }: { jd: NonNullable<RoleDescriptionDisplayProps['structured']> }) {
  return (
    <div className="space-y-4">
      {(jd.area || jd.seniority) && (
        <div className="flex items-center gap-2 flex-wrap">
          {jd.area && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-truora-primary/10 text-truora-primary">
              {jd.area}
            </span>
          )}
          {jd.seniority && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
              {jd.seniority}
            </span>
          )}
        </div>
      )}
      {jd.summary && (
        <p className="text-sm text-gray-700 leading-relaxed">{jd.summary}</p>
      )}
      {jd.responsibilities && jd.responsibilities.length > 0 && (
        <Section title="Responsabilidades" items={jd.responsibilities} dotColor="bg-truora-primary" />
      )}
      {jd.requirements && jd.requirements.length > 0 && (
        <Section title="Requisitos" items={jd.requirements} dotColor="bg-green-500" />
      )}
      {jd.nice_to_have && jd.nice_to_have.length > 0 && (
        <Section title="Nice to have" items={jd.nice_to_have} dotColor="bg-gray-300" textColor="text-gray-500" />
      )}
    </div>
  )
}

function Section({ title, items, dotColor, textColor = 'text-gray-700' }: {
  title: string
  items: string[]
  dotColor: string
  textColor?: string
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`flex items-start gap-2 text-xs ${textColor}`}>
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dotColor} flex-shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TruoraJDDisplay({ text, processTitle }: { text: string; processTitle?: string }) {
  const [expanded, setExpanded] = useState(false)
  const parsed = parseTruoraJD(text)

  return (
    <div className="space-y-4">
      {/* Header con título y metadata */}
      <div className="pb-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{parsed.jobTitle || processTitle}</h3>
        {parsed.metadata.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {parsed.metadata.map((meta, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-600">
                {meta}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Misión */}
      {parsed.mission && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Misión del cargo</p>
          <p className="text-xs text-gray-700 leading-relaxed">{parsed.mission}</p>
        </div>
      )}

      {/* Responsabilidades principales */}
      {parsed.responsibilities.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Responsabilidades principales
          </p>
          <ul className="space-y-1.5">
            {parsed.responsibilities.slice(0, expanded ? undefined : 5).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-truora-primary flex-shrink-0" />
                <span>
                  {r.text}
                  {r.percentage && (
                    <span className="ml-1 text-[10px] text-gray-400">({r.percentage})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {parsed.responsibilities.length > 5 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[11px] text-truora-primary hover:underline mt-2"
            >
              Ver {parsed.responsibilities.length - 5} más...
            </button>
          )}
        </div>
      )}

      {/* Formación */}
      {parsed.education && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Formación requerida</p>
          <div className="flex flex-wrap gap-2">
            {parsed.education.level && (
              <span className="inline-flex items-center px-2 py-1 rounded text-[11px] bg-violet-50 text-violet-700">
                {parsed.education.level}
              </span>
            )}
            {parsed.education.area && (
              <span className="inline-flex items-center px-2 py-1 rounded text-[11px] bg-blue-50 text-blue-700">
                {parsed.education.area}
              </span>
            )}
            {parsed.education.experience && (
              <span className="inline-flex items-center px-2 py-1 rounded text-[11px] bg-green-50 text-green-700">
                {parsed.education.experience} exp.
              </span>
            )}
            {parsed.education.languages?.map((lang, i) => (
              <span key={i} className="inline-flex items-center px-2 py-1 rounded text-[11px] bg-gray-100 text-gray-600">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills con niveles */}
      {parsed.skills.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Conocimientos clave</p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.skills.slice(0, expanded ? undefined : 6).map((skill, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] ${
                  skill.level === 'Avanzado'
                    ? 'bg-truora-primary/10 text-truora-primary'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {skill.name}
              </span>
            ))}
            {parsed.skills.length > 6 && !expanded && (
              <span className="text-[10px] text-gray-400">+{parsed.skills.length - 6} más</span>
            )}
          </div>
        </div>
      )}

      {/* Botón expandir/colapsar */}
      {(parsed.responsibilities.length > 5 || parsed.skills.length > 6) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-truora-primary hover:underline flex items-center gap-1"
        >
          {expanded ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Ver menos
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Ver descripción completa
            </>
          )}
        </button>
      )}
    </div>
  )
}

interface ParsedTruoraJD {
  jobTitle?: string
  metadata: string[]
  mission?: string
  responsibilities: { text: string; percentage?: string }[]
  education?: {
    level?: string
    area?: string
    experience?: string
    languages?: string[]
  }
  skills: { name: string; level: string }[]
}

function parseTruoraJD(text: string): ParsedTruoraJD {
  const lines = text.split('\n').map(l => l.trim())
  const result: ParsedTruoraJD = {
    metadata: [],
    responsibilities: [],
    skills: []
  }

  let currentSection = ''
  const missionLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Skip document header
    if (line.toLowerCase().includes('descripción de cargo') ||
        line.match(/^truora\s*[·•\-|]/i)) {
      continue
    }

    // Skip footer
    if (line.toLowerCase().startsWith('revisado por')) {
      break
    }

    // Skip competency bars (■□ patterns)
    if (line.includes('■') || line.includes('□')) {
      continue
    }

    // Detect job title (first substantial line that's not a section header)
    if (!result.jobTitle && line.length < 80 && !line.endsWith(':') &&
        !line.includes('·') && !line.match(/^(información|misión|principales|formación|conocimientos|actitudes|certificaciones)/i)) {
      result.jobTitle = line
      continue
    }

    // Detect metadata line
    if (line.includes('Área:') || line.includes('Reporta a') || line.includes('Personas a cargo')) {
      const parts = line.split(/[·•|]/).map(p => p.trim()).filter(Boolean)
      result.metadata.push(...parts)
      continue
    }

    // Detect section headers
    const sectionLower = line.toLowerCase()
    if (sectionLower.includes('información general')) {
      currentSection = 'info'
      continue
    }
    if (sectionLower.includes('misión del cargo')) {
      currentSection = 'mission'
      continue
    }
    if (sectionLower.includes('principales responsabilidades')) {
      currentSection = 'responsibilities'
      continue
    }
    if (sectionLower.includes('formación requerida')) {
      currentSection = 'education'
      result.education = { languages: [] }
      continue
    }
    if (sectionLower.includes('conocimientos y habilidades')) {
      currentSection = 'skills'
      continue
    }
    if (sectionLower.includes('actitudes') || sectionLower.includes('certificaciones')) {
      currentSection = 'skip'
      continue
    }

    // Parse based on current section
    if (currentSection === 'info') {
      // Skip table-like info section (key-value pairs we already have)
      continue
    }

    if (currentSection === 'mission') {
      if (!line.match(/^(el|la|este|esta)\s/i) && missionLines.length > 0) {
        // Probably moved to next section
        continue
      }
      missionLines.push(line)
      continue
    }

    if (currentSection === 'responsibilities') {
      // Skip category headers and table headers
      if (line.startsWith('Categorías:') || line === 'Área' || line === 'Responsabilidad' || line === '% Tiempo') {
        continue
      }
      // Parse responsibility with optional percentage
      const percentMatch = line.match(/(\d+%)\s*$/)
      if (percentMatch) {
        const text = line.replace(/\d+%\s*$/, '').trim()
        if (text.length > 10 && !['FP&A', 'Contabilidad', 'Transversal'].includes(text)) {
          result.responsibilities.push({ text, percentage: percentMatch[1] })
        }
      } else if (line.length > 30 && !['FP&A', 'Contabilidad', 'Transversal'].includes(line)) {
        result.responsibilities.push({ text: line })
      }
      continue
    }

    if (currentSection === 'education' && result.education) {
      if (line.includes('Nivel educativo') || line.includes('Grado')) {
        const next = lines[i + 1]?.trim()
        if (next && !next.includes(':')) {
          result.education.level = next
          i++
        }
      } else if (line.includes('Área de estudio')) {
        const next = lines[i + 1]?.trim()
        if (next && !next.includes(':')) {
          result.education.area = next
          i++
        }
      } else if (line.includes('Experiencia')) {
        const next = lines[i + 1]?.trim()
        if (next && !next.includes(':')) {
          result.education.experience = next
          i++
        }
      } else if (line.includes('Inglés') || line.includes('Español')) {
        if (line.includes('Requerido')) {
          result.education.languages?.push(line.replace('Requerido', '').trim())
        }
      }
      continue
    }

    if (currentSection === 'skills') {
      // Parse skill lines: "Skill name    Level"
      const levelMatch = line.match(/^(.+?)\s+(Avanzado|Intermedio|Básico)\s*$/i)
      if (levelMatch) {
        result.skills.push({ name: levelMatch[1].trim(), level: levelMatch[2] })
      } else if (line !== 'Conocimiento / Habilidad' && line !== 'Nivel' && line.length > 3) {
        // Try to extract from next line
        const next = lines[i + 1]?.trim()
        if (next && ['Avanzado', 'Intermedio', 'Básico'].includes(next)) {
          result.skills.push({ name: line, level: next })
          i++
        }
      }
      continue
    }
  }

  // Consolidate mission
  if (missionLines.length > 0) {
    result.mission = missionLines.join(' ')
  }

  return result
}
