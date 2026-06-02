/**
 * TruHire — Permission system (server-side)
 *
 * Centraliza toda la lógica de visibilidad. Corre SOLO en el servidor
 * para que el cliente nunca reciba data que no le corresponde.
 *
 * Modelo:
 * - Recruiter / Head of People: acceso completo
 * - HM / Sponsor: su proceso, sin screening AI, evaluación ciega
 * - Entrevistador: su proceso, solo CV, evaluación ciega hasta que firman
 * - Bar Raiser: todo el proceso una vez asignado, sin restricciones
 */

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

export interface ProcessPermissions {
  // Qué puede VER
  canSeeScreeningAI: boolean       // Clasificación y análisis del agente
  canSeeCandidateCV: boolean       // CV y datos del candidato
  canSeePhoneScreen: boolean       // Evaluación del HM (phone screen)
  canSeeOtherEvaluations: boolean  // Evaluaciones de otros entrevistadores del loop
  canSeeDebrief: boolean           // Debrief completo y decisión del BR
  canSeeBarRaiserIdentity: boolean // Quién es el Bar Raiser

  // Qué puede HACER
  canManageProcess: boolean        // Editar proceso, agregar candidatos
  canRunScreening: boolean         // Correr o re-analizar el screening AI
  canSetupPhoneScreen: boolean     // Configurar el phone screen
  canSetupLoop: boolean            // Configurar el loop de entrevistas
  canTakeDebriefDecision: boolean  // Tomar la decisión final (solo Bar Raiser)
  canSendFeedback: boolean         // Enviar feedback al candidato
}

const FULL_ACCESS: ProcessPermissions = {
  canSeeScreeningAI: true,
  canSeeCandidateCV: true,
  canSeePhoneScreen: true,
  canSeeOtherEvaluations: true,
  canSeeDebrief: true,
  canSeeBarRaiserIdentity: true,
  canManageProcess: true,
  canRunScreening: true,
  canSetupPhoneScreen: true,
  canSetupLoop: true,
  canTakeDebriefDecision: false, // solo BR
  canSendFeedback: true,
}

/**
 * Devuelve los permisos del usuario actual para un proceso específico.
 * Usa el contexto de autenticación del servidor (cookies).
 */
export async function getProcessPermissions(
  processId: string,
  processCandidateId?: string
): Promise<ProcessPermissions & { userRole: UserRole; userId: string | null }> {

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ...noAccess(), userRole: 'interviewer', userId: null }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_bar_raiser_certified')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'interviewer') as UserRole
  const isCertifiedBR = !!(profile as any)?.is_bar_raiser_certified

  // Recruiter y head_of_people: acceso completo
  if (role === 'recruiter' || role === 'head_of_people') {
    return { ...FULL_ACCESS, userRole: role, userId: user.id }
  }

  // Verificar participación en el proceso
  const { data: participation } = await supabase
    .from('process_participants')
    .select('role_in_process')
    .eq('process_id', processId)
    .eq('user_id', user.id)
    .maybeSingle()

  const roleInProcess = (participation as any)?.role_in_process ?? null

  // Bar Raiser asignado a este proceso
  if (isCertifiedBR && roleInProcess === 'bar_raiser') {
    return {
      canSeeScreeningAI: true,
      canSeeCandidateCV: true,
      canSeePhoneScreen: true,
      canSeeOtherEvaluations: true,
      canSeeDebrief: true,
      canSeeBarRaiserIdentity: true,
      canManageProcess: false,
      canRunScreening: false,
      canSetupPhoneScreen: false,
      canSetupLoop: false,
      canTakeDebriefDecision: true,
      canSendFeedback: false,
      userRole: role,
      userId: user.id,
    }
  }

  // Hiring Manager / Sponsor — evaluación ciega: sin screening AI, sin evaluaciones ajenas
  if (roleInProcess === 'hiring_manager' || roleInProcess === 'sponsor') {
    return {
      canSeeScreeningAI: false,       // Evaluación ciega
      canSeeCandidateCV: true,
      canSeePhoneScreen: true,        // Solo la suya propia
      canSeeOtherEvaluations: false,  // No ve evaluaciones del loop
      canSeeDebrief: true,            // Sí ve la decisión final del BR
      canSeeBarRaiserIdentity: false,
      canManageProcess: false,
      canRunScreening: false,
      canSetupPhoneScreen: true,
      canSetupLoop: false,
      canTakeDebriefDecision: false,
      canSendFeedback: false,
      userRole: role,
      userId: user.id,
    }
  }

  // Entrevistador del loop — evaluación ciega: solo CV + sus principios asignados
  if (roleInProcess === 'interviewer') {
    // Verificar si ya firmó su evaluación (post-firma puede ver más)
    let hasSigned = false
    if (processCandidateId) {
      const { data: loop } = await supabase
        .from('loops')
        .select('id')
        .eq('process_candidate_id', processCandidateId)
        .maybeSingle()

      if (loop) {
        const { data: evaluation } = await supabase
          .from('evaluations')
          .select('signed_at')
          .eq('loop_id', loop.id)
          .eq('interviewer_id', user.id)
          .maybeSingle()

        hasSigned = !!evaluation?.signed_at
      }
    }

    return {
      canSeeScreeningAI: false,              // Evaluación ciega
      canSeeCandidateCV: true,
      canSeePhoneScreen: false,              // No ve el phone screen del HM
      canSeeOtherEvaluations: hasSigned,     // Solo después de firmar la suya
      canSeeDebrief: false,
      canSeeBarRaiserIdentity: false,
      canManageProcess: false,
      canRunScreening: false,
      canSetupPhoneScreen: false,
      canSetupLoop: false,
      canTakeDebriefDecision: false,
      canSendFeedback: false,
      userRole: role,
      userId: user.id,
    }
  }

  // Sin participación en el proceso
  return { ...noAccess(), userRole: role, userId: user.id }
}

function noAccess(): ProcessPermissions {
  return {
    canSeeScreeningAI: false,
    canSeeCandidateCV: false,
    canSeePhoneScreen: false,
    canSeeOtherEvaluations: false,
    canSeeDebrief: false,
    canSeeBarRaiserIdentity: false,
    canManageProcess: false,
    canRunScreening: false,
    canSetupPhoneScreen: false,
    canSetupLoop: false,
    canTakeDebriefDecision: false,
    canSendFeedback: false,
  }
}
