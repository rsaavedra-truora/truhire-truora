// =============================================================
// TruHire — TypeScript types
// Generados manualmente del schema Supabase.
// Cuando tengas la DB activa, reemplaza con:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
// =============================================================

export type UserRole =
  | 'recruiter'
  | 'hiring_manager'
  | 'sponsor'
  | 'interviewer'
  | 'head_of_people'

export type EntryMode = 'role_first' | 'talent_first'

export type CapaIntencional = 'liderazgo' | 'funcional'

export type ProcessStatus =
  | 'draft'
  | 'open'
  | 'screening'
  | 'phone_screen'
  | 'challenge'
  | 'loop'
  | 'decision'
  | 'closed_hire'
  | 'closed_no_hire'

export type ScreeningClassification = 'green' | 'talent_pool' | 'yellow' | 'red'
export type FitLevel = 'high' | 'medium' | 'low' | 'n/a'

export type DecisionOutcome = 'hire' | 'no_hire' | 'hire_other_capa'

// -------------------------------------------------------
// Entidades de la DB
// -------------------------------------------------------

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_bar_raiser_certified: boolean
  created_at: string
  updated_at: string
}

export interface Process {
  id: string
  title: string
  entry_mode: EntryMode
  capa_intencional: CapaIntencional
  status: ProcessStatus
  role_slug: string | null
  role_description: string | null
  role_requirements: string | null
  hiring_manager_or_sponsor_id: string | null
  recruiter_id: string | null
  notes: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // Joins
  hiring_manager_or_sponsor?: User
  recruiter?: User
}

export interface Candidate {
  id: string
  full_name: string
  email: string
  linkedin_url: string | null
  cv_url: string | null
  cv_text: string | null
  raw_application: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ProcessCandidate {
  id: string
  process_id: string
  candidate_id: string
  status: string
  applied_at: string
  // Joins
  process?: Process
  candidate?: Candidate
  screening?: Screening
}

export interface Screening {
  id: string
  process_candidate_id: string
  classification: ScreeningClassification
  truora_fit_level: FitLevel | null
  role_fit_level: FitLevel | null
  suggested_capa: CapaIntencional | null
  strengths: string[]
  gaps: string[]
  truora_signals: string[]
  anti_signals: string[]
  ai_summary: string
  raw_ai_response: Record<string, unknown> | null
  recruiter_override: ScreeningClassification | null
  recruiter_notes: string | null
  in_talent_pool: boolean
  created_at: string
}

export interface Loop {
  id: string
  process_candidate_id: string
  bar_raiser_id: string | null
  status: string
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  // Joins
  bar_raiser?: User
  assignments?: LoopAssignment[]
  evaluations?: Evaluation[]
}

export interface LoopAssignment {
  id: string
  loop_id: string
  interviewer_id: string
  principles: string[]
  // Joins
  interviewer?: User
}

export interface Evaluation {
  id: string
  loop_id: string
  interviewer_id: string
  principle_notes: Record<string, { notes: string; score: number }>
  summary: string | null
  conclusion: string | null
  recommendation: boolean | null
  signed_at: string | null
  created_at: string
  updated_at: string
  // Joins
  interviewer?: User
}

export interface Decision {
  id: string
  process_candidate_id: string
  bar_raiser_id: string
  outcome: DecisionOutcome
  justification: string
  alternative_capa: CapaIntencional | null
  decided_at: string
  created_at: string
}

export interface FeedbackEmail {
  id: string
  process_candidate_id: string
  level: 1 | 2 | 3
  ai_draft: string
  human_edited_text: string | null
  sent_at: string | null
  sent_by_id: string | null
  created_at: string
}

// -------------------------------------------------------
// Constantes de UI
// -------------------------------------------------------

export const TRUORA_PRINCIPLES = [
  'Ownership',
  'Bias for Action',
  'Think Big',
  'Customer Obsession',
  'Invent and Simplify',
  'Hire and Develop the Best',
  'Earn Trust',
  'Deliver Results',
] as const

export type TruoraPrinciple = (typeof TRUORA_PRINCIPLES)[number]

export const SCREENING_LABELS: Record<ScreeningClassification, string> = {
  green:       '🟢 Avanzar',
  talent_pool: '🟠 Talent Pool',
  yellow:      '🟡 Posible',
  red:         '🔴 Descartar',
}

export const FIT_LEVEL_LABELS: Record<string, string> = {
  high:   'Alto',
  medium: 'Medio',
  low:    'Bajo',
  'n/a':  'N/A',
}

export const CAPA_LABELS: Record<CapaIntencional, string> = {
  liderazgo: 'Liderazgo',
  funcional:  'Funcional',
}

export const ENTRY_MODE_LABELS: Record<EntryMode, string> = {
  role_first:   'Role-first',
  talent_first: 'Talent-first',
}

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  draft:         'Borrador',
  open:          'Abierto',
  screening:     'Screening AI',
  phone_screen:  'Phone screen',
  challenge:     'Reto',
  loop:          'Interview Loop',
  decision:      'Decisión pendiente',
  closed_hire:   'Cerrado — Hire ✓',
  closed_no_hire:'Cerrado — No Hire',
}
