/**
 * TruHire — Los 8 Truora Principles
 * Fuente: Truora Principles.docx + Question Bank TruHire.docx
 * Uso: página de referencia para entrevistadores, pantalla de screening
 */

export interface InterviewQuestion {
  question: string
  followups: string[]
  evaluates: string
}

export interface TruoraPrinciple {
  id: string           // '01', '02', ...
  slug: string         // para URL
  name: string
  dimension: 'caracter' | 'capacidad' | 'mentalidad-startup'
  dimensionLabel: string
  antivalor: string    // nombre del anti-valor
  antivalorType: 'Entitlement' | 'Sloppiness' | 'Politics'
  predicts: string     // qué mis-hire previene
  definition: string
  signals: string[]    // cómo se ve cuando está presente
  antiSignals: string[] // anti-señales en entrevista
  antivalorDescription: string
  strongExample: string
  weakExample: string
  questions: InterviewQuestion[]
}

export const TRUORA_PRINCIPLES: TruoraPrinciple[] = [
  {
    id: '01',
    slug: 'ownership-sin-fronteras',
    name: 'Ownership sin fronteras',
    dimension: 'caracter',
    dimensionLabel: 'Carácter — quién eres',
    antivalor: 'Entitlement',
    antivalorType: 'Entitlement',
    predicts: 'Mis-hires por falta de responsabilidad',
    definition:
      'Actúa como dueño de Truora, no de su tarea. Ve el problema, lo toma, lo resuelve. Nunca dice "eso no es mi trabajo". Sacrifica crédito o comodidad cuando es lo correcto para el negocio.',
    signals: [
      'Habla en primera persona de los resultados, no del equipo.',
      'No culpa al contexto ni a otros cuando algo salió mal.',
      'Sus historias tienen un costo real — para él o ella, no solo para la empresa.',
      'Toma acción antes de que alguien se lo pida.',
      'Cuando ve algo roto fuera de su área, se involucra en lugar de pasar de largo.',
    ],
    antiSignals: [
      'Todas sus historias empiezan con "mi manager me pidió".',
      'Culpa al equipo, al contexto o a la empresa en sus fracasos.',
      'Sus logros son en plural, sus fracasos tienen dueño ajeno.',
      'No puede dar un ejemplo sin supervisión cercana.',
    ],
    antivalorDescription:
      'Espera que le asignen, que le expliquen, que le den los recursos primero. Sus logros son en plural, sus fracasos tienen dueño ajeno. No puede dar un ejemplo de haber actuado sin supervisión cercana.',
    strongExample:
      '"Nadie lo iba a hacer, así que lo tomé. No era mi trabajo formalmente pero vi que si no lo resolvía, el cliente se iba. Lo escalé cuando ya tenía la solución, no para pedir permiso."',
    weakExample:
      '"Mi manager me asignó el proyecto y yo lo entregué a tiempo. Sí hubo problemas pero el equipo de soporte no nos ayudó lo suficiente."',
    questions: [
      {
        question: 'Cuéntame de una vez que tomaste un problema importante que nadie más estaba atendiendo.',
        followups: ['¿Por qué lo tomaste tú y no alguien más?', '¿Cuál era el riesgo de no hacerlo?', '¿Qué pasó exactamente?'],
        evaluates: 'Iniciativa sin instrucción',
      },
      {
        question: 'Dame un ejemplo en que tuviste que sacrificar algo a corto plazo (tiempo, crédito, comodidad) para hacer lo correcto para el equipo o el negocio.',
        followups: ['¿Qué sacrificaste concretamente?', '¿Cómo tomaste esa decisión?', '¿Lo harías de nuevo?'],
        evaluates: 'Ownership sobre interés personal',
      },
      {
        question: '¿Cuándo fue la última vez que algo salió mal y era parcialmente tu responsabilidad?',
        followups: ['¿Cómo lo reconociste?', '¿Qué hiciste para arreglarlo?', '¿Qué cambió después en tu forma de trabajar?'],
        evaluates: 'Accountability sin excusas',
      },
    ],
  },
  {
    id: '02',
    slug: 'grit-demostrable',
    name: 'Grit demostrable',
    dimension: 'caracter',
    dimensionLabel: 'Carácter — quién eres',
    antivalor: 'Sloppiness',
    antivalorType: 'Sloppiness',
    predicts: 'Mis-hires que se rinden bajo presión',
    definition:
      'Tiene una historia real de adversidad superada. No teórica, no de libro. Un momento en que el mundo le dijo que no y siguió de todas formas. Comete errores, los acepta y se levanta. Gestiona sus emociones en los momentos más difíciles.',
    signals: [
      'Tiene al menos una historia concreta de adversidad real (no abstracciones tipo "trabajo bajo presión").',
      'Reconoce sus errores sin minimizarlos ni dramatizarlos.',
      'Mantiene la cabeza fría cuando algo se rompe — actúa antes de buscar culpables.',
      'No abandona proyectos difíciles cuando deja de ser divertido.',
    ],
    antiSignals: [
      'Su historia de adversidad es académica o superficial.',
      'No puede dar un ejemplo real de fracaso personal.',
      'Sus respuestas siempre terminan bien desde el principio.',
      'Se quiebra o se pone defensivo al hablar de fracasos.',
    ],
    antivalorDescription:
      'Cuando las cosas se ponen difíciles, baja el estándar o busca el camino más fácil. Sus historias de adversidad no resisten un follow-up: cuando preguntas qué pasó después, no hay sustancia.',
    strongExample:
      '"Trabajé dos años en algo que no funcionó. Perdí dinero propio, el equipo se fue, y mi familia no entendía por qué seguía. Pero aprendí más en esos dos años que en los cinco anteriores. Hoy no cambiaría nada."',
    weakExample:
      '"Fue muy difícil estudiar y trabajar al mismo tiempo, pero lo logré. Creo que el esfuerzo siempre da frutos si uno se propone las cosas."',
    questions: [
      {
        question: 'Cuéntame del momento más difícil de tu carrera o vida en que quisiste rendirte. ¿Qué hiciste?',
        followups: ['¿Cuánto tiempo duró esa situación?', '¿Qué fue lo más difícil de aguantar?', '¿Qué te hizo seguir?'],
        evaluates: 'Resiliencia real bajo presión',
      },
      {
        question: 'Dame un ejemplo de cuando fallaste en algo importante para ti. ¿Cómo te recuperaste?',
        followups: ['¿Cuál fue el impacto concreto del fracaso?', '¿Cómo lo procesaste emocionalmente?', '¿Qué cambió en ti después?'],
        evaluates: 'Capacidad de aprender del fracaso',
      },
      {
        question: '¿Alguna vez lograste algo que todos a tu alrededor pensaban que era imposible o que tú no podías hacer?',
        followups: ['¿Qué te decían?', '¿Cómo manejaste esa presión externa?', '¿Cuánto tiempo tomó?', '¿Cuál fue el resultado?'],
        evaluates: 'Determinación vs. opinión externa',
      },
    ],
  },
  {
    id: '03',
    slug: 'confianza-y-straight-talk',
    name: 'Confianza y straight talk',
    dimension: 'caracter',
    dimensionLabel: 'Carácter — quién eres',
    antivalor: 'Politics',
    antivalorType: 'Politics',
    predicts: 'Mis-hires que hacen política',
    definition:
      'Dice lo que piensa, incluso cuando es incómodo. Cumple lo que dice o avisa a tiempo cuando no puede. No hace política. No evita el conflicto constructivo. Construye confianza con consistencia, no con simpatía.',
    signals: [
      'Da feedback directo aunque sea incómodo, especialmente hacia arriba.',
      'Cuando no está de acuerdo lo dice en la reunión, no en el pasillo después.',
      'Cumple los compromisos. Si algo no va a salir, avisa con tiempo y propone alternativas.',
      'Es la misma persona en privado que en público.',
    ],
    antiSignals: [
      'Dice lo que la gente quiere escuchar para mantener la paz o su posición.',
      'Espera a saber qué piensan los demás antes de declarar su postura.',
      'Suaviza para no incomodar, incluso cuando la situación pide claridad.',
      'Habla mal de decisiones en privado pero las defiende en público.',
    ],
    antivalorDescription:
      'Dice lo que la gente quiere escuchar para mantener la paz o su posición. Espera a saber qué piensan los demás antes de declarar su postura. Suaviza para no incomodar, incluso cuando la situación pide claridad.',
    strongExample:
      '"Le dije a mi CEO que la estrategia que habíamos definido no iba a funcionar. No era el momento ideal pero si no lo decía nadie más lo iba a hacer. Le presenté los datos y propuse una alternativa."',
    weakExample:
      '"Siempre trato de ser honesto pero también de ser diplomático. Creo que hay formas de decir las cosas sin que la gente se sienta mal."',
    questions: [
      {
        question: 'Cuéntame de una vez que tuviste que dar feedback difícil a alguien con más seniority o poder que tú.',
        followups: ['¿Cómo decidiste que valía la pena decirlo?', '¿Cómo lo estructuraste?', '¿Cuál fue la reacción?'],
        evaluates: 'Valentía para el feedback ascendente',
      },
      {
        question: 'Dame un ejemplo en que no pudiste cumplir un compromiso importante. ¿Cómo lo manejaste?',
        followups: ['¿Cuándo lo comunicaste?', '¿Cómo reaccionó la otra persona?', '¿Qué hiciste para remediar la situación?'],
        evaluates: 'Accountability y comunicación proactiva',
      },
      {
        question: 'Cuéntame de una vez que tuviste que disentir de una decisión de tu equipo o empresa. ¿Cómo lo manejaste?',
        followups: ['¿Cómo expresaste tu desacuerdo?', '¿Lo hiciste públicamente o en privado?', '¿Comprometiste al final?'],
        evaluates: 'Disagree and commit',
      },
    ],
  },
  {
    id: '04',
    slug: 'pensamiento-analitico',
    name: 'Pensamiento analítico',
    dimension: 'capacidad',
    dimensionLabel: 'Capacidad — cómo piensas',
    antivalor: 'Sloppiness',
    antivalorType: 'Sloppiness',
    predicts: 'Mis-hires que no mueven métricas',
    definition:
      'Toma decisiones con datos. Entiende cómo sus acciones afectan el negocio. Puede construir un argumento cuantitativo desde cero. Distingue correlación de causalidad. Sabe qué métrica importa y por qué. No confunde actividad con impacto.',
    signals: [
      'Cuando explica una decisión, cita el dato que la respalda — no la intuición.',
      'Conecta su trabajo con métricas de negocio, no solo con outputs.',
      'Hace las preguntas correctas antes de aceptar una conclusión.',
      'Sabe simplificar problemas complejos a sus variables esenciales.',
    ],
    antiSignals: [
      'Toma decisiones por intuición sin validar.',
      'Cita números sin saber de dónde vienen.',
      'Confunde actividad con impacto.',
      'No puede construir un argumento cuantitativo básico desde cero.',
    ],
    antivalorDescription:
      'Toma decisiones por intuición sin validar, o ejecuta sin entender si está moviendo la aguja correcta. Cita números sin saber de dónde vienen. Confunde actividad con impacto.',
    strongExample:
      '"Detecté que nuestro churn rate del mes era 4% pero la métrica que el equipo medía capturaba solo cancelaciones voluntarias. Cuando incluí los non-renewals, el número subía a 9%. Eso cambió completamente la prioridad del trimestre."',
    weakExample:
      '"Soy muy analítico. Siempre reviso los datos antes de tomar decisiones. En mi último trabajo usábamos dashboards en Tableau y los revisábamos cada semana en el equipo."',
    questions: [
      {
        question: 'Dame un ejemplo de una decisión importante que tomaste basada en datos. ¿Cuáles fueron los datos, cómo los conseguiste y cómo llegaste a la conclusión?',
        followups: ['¿Qué datos no tenías y cómo los estimaste?', '¿Había alternativas de interpretación?', '¿Resultó correcta la decisión?'],
        evaluates: 'Razonamiento cuantitativo real',
      },
      {
        question: '¿Alguna vez encontraste que los datos contradecían tu intuición sobre algo importante? ¿Qué hiciste?',
        followups: ['¿Cómo validaste que los datos eran correctos?', '¿Cuánto te costó cambiar de opinión?', '¿Cuál fue el resultado?'],
        evaluates: 'Data over intuition',
      },
      {
        question: '¿Cómo medirías el éxito de [algo relevante al rol]? Desde cero, sin saber qué métricas existen hoy.',
        followups: ['¿Por qué esa métrica y no otra?', '¿Qué riesgos tiene ese indicador?', '¿Cómo sabrías si está siendo manipulada?'],
        evaluates: 'Diseño de métricas',
      },
    ],
  },
  {
    id: '05',
    slug: 'velocidad-de-aprendizaje',
    name: 'Velocidad de aprendizaje',
    dimension: 'capacidad',
    dimensionLabel: 'Capacidad — cómo piensas',
    antivalor: 'Sloppiness',
    antivalorType: 'Sloppiness',
    predicts: 'Mis-hires que no se adaptan al ritmo',
    definition:
      'Aprende áreas nuevas en semanas, no meses. Es autodidacta por naturaleza. Hay evidencia verificable de que ha dominado algo difícil por cuenta propia. Su curva de aprendizaje es más valiosa que su experiencia previa.',
    signals: [
      'Tiene historias verificables de haber aprendido algo no trivial sin que nadie le dijera cómo.',
      'En ramp-up de un proyecto nuevo, está produciendo valor en semanas — no en trimestres.',
      'Pregunta más que afirma cuando entra a un terreno nuevo, y procesa rápido.',
      'Se incomoda cuando lleva mucho tiempo haciendo lo mismo.',
    ],
    antiSignals: [
      'Se queda en lo que ya sabe porque es más cómodo que aprender algo nuevo.',
      'Trata su experiencia previa como un techo en lugar de una base.',
      'Tarda meses en absorber lo que otros absorben en semanas.',
      'Su historia de aprendizaje más reciente es vaga o no verificable.',
    ],
    antivalorDescription:
      'Se queda en lo que ya sabe porque es más cómodo que aprender algo nuevo. Trata su experiencia previa como un techo en lugar de una base. Tarda meses en absorber lo que otros absorben en semanas.',
    strongExample:
      '"Necesitaba entender machine learning para un proyecto. Tomé un curso en Coursera, lo apliqué en producción en 6 semanas, y al tercer mes ya estaba enseñándolo al equipo."',
    weakExample:
      '"Siempre estoy aprendiendo cosas nuevas. Leo libros, sigo blogs del sector, asisto a conferencias cuando puedo."',
    questions: [
      {
        question: 'Cuéntame de algo complejo que aprendiste completamente solo en los últimos 2 años. ¿Cómo lo aprendiste?',
        followups: ['¿Cómo sabías que lo habías aprendido bien?', '¿Cuánto tiempo tomó?', '¿Cómo lo aplicaste?'],
        evaluates: 'Aprendizaje autodidacta verificable',
      },
      {
        question: 'Dame un ejemplo de cuando entraste a un rol o proyecto sin tener el conocimiento necesario. ¿Cuánto tiempo te tomó ser productivo?',
        followups: ['¿Cuál fue tu proceso exacto de onboarding intelectual?', '¿Qué atajos encontraste?'],
        evaluates: 'Velocidad de rampa en contexto nuevo',
      },
      {
        question: '¿Cuál es algo que sabes hoy, que hace 18 meses no sabías, y que cambió cómo piensas o trabajas?',
        followups: ['¿Cómo llegaste a eso?', '¿Fue por necesidad o por curiosidad?', '¿Cómo lo incorporaste a tu trabajo?'],
        evaluates: 'Aprendizaje continuo y aplicado',
      },
    ],
  },
  {
    id: '06',
    slug: 'comunicacion-estructurada',
    name: 'Comunicación estructurada',
    dimension: 'capacidad',
    dimensionLabel: 'Capacidad — cómo piensas',
    antivalor: 'Politics',
    antivalorType: 'Politics',
    predicts: 'Mis-hires que no escalan a liderazgo',
    definition:
      'Toma un problema complejo y lo explica con claridad a alguien sin contexto. Escribe y habla con estructura, no con volumen. Anticipa qué información necesita cada interlocutor. Es el predictor más fuerte de si alguien puede escalar a liderazgo en Truora.',
    signals: [
      'Sus mensajes y documentos tienen una estructura clara: primero la conclusión, después el detalle.',
      'En una reunión, su intervención avanza la conversación — no la repite.',
      'Adapta el nivel de detalle a quien tiene enfrente, sin perder precisión.',
      'Cuando explica algo difícil, el otro entiende — y se nota.',
    ],
    antiSignals: [
      'Comunica para quedar bien en lugar de para ser entendido.',
      'Usa la ambigüedad como escudo.',
      'Esconde una decisión sencilla detrás de un párrafo complicado.',
      'Sus emails y documentos son largos pero dicen poco.',
    ],
    antivalorDescription:
      'Comunica para quedar bien en lugar de para ser entendido. Usa la ambigüedad como escudo. Esconde una decisión sencilla detrás de un párrafo complicado.',
    strongExample:
      '"Cuando tengo que presentar algo al board, escribo primero la conclusión y las 3 implicaciones. Luego el detalle para quien quiera. En 30 segundos deben entender la decisión."',
    weakExample:
      '"Soy una persona muy comunicativa. Me gusta explicar las cosas con detalle para que todo el mundo entienda el contexto completo antes de llegar a la conclusión."',
    questions: [
      {
        question: 'Dame un ejemplo de cuando tuviste que convencer a alguien que no estaba de acuerdo contigo en algo importante. ¿Cómo armaste el argumento?',
        followups: ['¿Qué objeciones anticipaste?', '¿Cómo las preparaste?', '¿Cuántas rondas tomó?'],
        evaluates: 'Persuasión estructurada',
      },
      {
        question: 'Cuéntame de una vez que tuviste que comunicar malas noticias hacia arriba. ¿Cómo lo hiciste?',
        followups: ['¿Cuándo decidiste comunicarlo?', '¿Cómo preparaste el mensaje?', '¿Qué reacción tuviste?'],
        evaluates: 'Comunicación difícil hacia arriba',
      },
      {
        question: 'Explícame [concepto técnico relevante al rol] como si yo no tuviera el background.',
        followups: ['¿Cómo supiste qué nivel de detalle usar?', '¿Cómo sabes que te entendí?'],
        evaluates: 'Claridad en tiempo real',
      },
    ],
  },
  {
    id: '07',
    slug: 'agencia-y-sesgo-a-la-accion',
    name: 'Agencia y sesgo a la acción',
    dimension: 'mentalidad-startup',
    dimensionLabel: 'Mentalidad startup — por qué Truora',
    antivalor: 'Entitlement',
    antivalorType: 'Entitlement',
    predicts: 'Mis-hires que esperan instrucciones',
    definition:
      'Detecta el problema, actúa, ve el resultado, aprende, repite. No espera instrucciones. No pide permiso para lo que puede decidir solo. Prefiere equivocarse rápido a esperar indefinidamente. Entiende que la velocidad es una ventaja competitiva en Truora.',
    signals: [
      'Cuando ve un problema, el siguiente paso es una acción — no una pregunta a su manager.',
      'Prefiere intentar, equivocarse y corregir que esperar a tener el plan perfecto.',
      'Sabe distinguir cuándo pedir permiso y cuándo pedir perdón después.',
      'Mueve cosas. Donde está, las cosas se mueven más rápido.',
    ],
    antiSignals: [
      'Espera que le den la dirección, el plan y los recursos antes de moverse.',
      'Trata cada decisión chica como un tema que necesita aprobación.',
      'Su default es "preguntar primero" para cosas que podría resolver solo.',
      'Sus proyectos tienen mucho plan y poca ejecución.',
    ],
    antivalorDescription:
      'Espera que le den la dirección, el plan y los recursos antes de moverse. Trata cada decisión chica como un tema que necesita aprobación. Su default es "preguntar primero".',
    strongExample:
      '"Vi que el proceso de onboarding de clientes tardaba 3 semanas. Sin que nadie me lo pidiera, documenté el problema, propuse una solución y la implementé en 2 semanas. El tiempo bajó a 4 días."',
    weakExample:
      '"En mi empresa siempre estábamos muy alineados. Antes de hacer algo importante, coordinábamos con el equipo para asegurarnos de que todos estuvieran en la misma página."',
    questions: [
      {
        question: 'Cuéntame de una iniciativa importante que lanzaste completamente solo, sin que nadie te lo pidiera. ¿Qué pasó?',
        followups: ['¿Cómo detectaste la oportunidad?', '¿Cómo conseguiste los recursos?', '¿Cuál fue el resultado?'],
        evaluates: 'Iniciativa autónoma de alto impacto',
      },
      {
        question: 'Dame un ejemplo de cuando tomaste una decisión importante sin tener toda la información que hubieras querido.',
        followups: ['¿Cuánta información tenías vs. cuánta necesitabas?', '¿Qué salió bien y qué no?'],
        evaluates: 'Actuar bajo incertidumbre',
      },
      {
        question: '¿Cuándo fue la última vez que viste un problema en tu empresa que nadie más estaba viendo o atacando? ¿Qué hiciste?',
        followups: ['¿Cómo llegaste a la conclusión de que era un problema real?', '¿Cuál fue el impacto?'],
        evaluates: 'Visión periférica + acción',
      },
    ],
  },
  {
    id: '08',
    slug: 'ambicion-de-impacto',
    name: 'Ambición de impacto y potencial C-level',
    dimension: 'mentalidad-startup',
    dimensionLabel: 'Mentalidad startup — por qué Truora',
    antivalor: 'Entitlement',
    antivalorType: 'Entitlement',
    predicts: 'Mis-hires sin norte ni ambición real',
    definition:
      'No quiere un trabajo estable. Quiere construir algo. Su ambición es verificable en sus decisiones pasadas, no en lo que dice sobre el futuro. La pregunta central: ¿en 4-5 años, podría ser C-level en alguna empresa? ¿Ve Truora como trampolín, no como destino?',
    signals: [
      'Sus decisiones de carrera muestran un patrón: ha elegido roles más difíciles cuando podría haber elegido más fáciles.',
      'Habla con concreción de lo que quiere construir, no en abstracto de "crecer".',
      'Tiene un norte propio — Truora es un capítulo de su trayectoria, no la trayectoria entera.',
      'Su ambición no es cosmética; es verificable en cómo ha pasado los últimos 3-5 años.',
    ],
    antiSignals: [
      'Quiere las oportunidades de una startup sin el riesgo ni la incomodidad.',
      'Busca estabilidad disfrazada de "crecimiento".',
      'Su ambición existe en el discurso pero no en su trayectoria.',
      'Sus decisiones de carrera siempre han privilegiado la seguridad sobre el impacto.',
    ],
    antivalorDescription:
      'Quiere las oportunidades de una startup sin el riesgo, la incomodidad ni la ambición que requiere. Busca estabilidad disfrazada de "crecimiento". Su ambición existe en el discurso pero no en su trayectoria.',
    strongExample:
      '"Dejé un trabajo bien pagado en una multinacional para co-fundar una startup. Funcionó, la vendimos en 3 años. Ahora quiero hacer lo mismo pero con más recursos y en un mercado más grande."',
    weakExample:
      '"Quiero crecer profesionalmente y aprender de las mejores personas. Creo que Truora es una empresa increíble con mucho futuro y me gustaría ser parte de eso."',
    questions: [
      {
        question: '¿Cuál es el problema más grande que quieres resolver en tu carrera? ¿Por qué ese y no otro?',
        followups: ['¿Cuándo llegaste a esa conclusión?', '¿Qué has hecho concretamente hacia ese objetivo?', '¿Cómo encaja Truora en ese camino?'],
        evaluates: 'Claridad y ambición del norte personal',
      },
      {
        question: 'Cuéntame de una decisión de carrera que tomaste que parecía riesgosa o poco convencional. ¿Por qué la tomaste?',
        followups: ['¿Qué dejaste ir para tomarla?', '¿Cómo reaccionó tu entorno?', '¿Lo harías de nuevo?'],
        evaluates: 'Apetito real por el riesgo de carrera',
      },
      {
        question: '¿Dónde te ves en 5 años? No como formalidad — quiero entender si hay un norte claro y si Truora encaja genuinamente.',
        followups: ['¿Qué tipo de empresa o problema quieres estar liderando?', '¿Qué habilidades te faltan para llegar ahí?'],
        evaluates: 'Alineación real entre ambición y Truora',
      },
    ],
  },
]

// Slugs para mapear señales del AI a principios
export const PRINCIPLE_SLUG_MAP: Record<string, string> = {
  'ownership': 'ownership-sin-fronteras',
  'grit': 'grit-demostrable',
  'confianza': 'confianza-y-straight-talk',
  'straight talk': 'confianza-y-straight-talk',
  'pensamiento': 'pensamiento-analitico',
  'analítico': 'pensamiento-analitico',
  'analitico': 'pensamiento-analitico',
  'velocidad': 'velocidad-de-aprendizaje',
  'aprendizaje': 'velocidad-de-aprendizaje',
  'comunicación': 'comunicacion-estructurada',
  'comunicacion': 'comunicacion-estructurada',
  'agencia': 'agencia-y-sesgo-a-la-accion',
  'sesgo': 'agencia-y-sesgo-a-la-accion',
  'ambición': 'ambicion-de-impacto',
  'ambicion': 'ambicion-de-impacto',
  'impacto': 'ambicion-de-impacto',
}

/**
 * Dado el texto de una señal ("Ownership: fundó y escaló..."),
 * intenta encontrar el slug del principio correspondiente.
 */
export function signalToPrincipleSlug(signal: string): string | null {
  const lower = signal.toLowerCase()
  for (const [keyword, slug] of Object.entries(PRINCIPLE_SLUG_MAP)) {
    if (lower.startsWith(keyword) || lower.includes(keyword + ':') || lower.includes(keyword + ' ')) {
      return slug
    }
  }
  return null
}

export function getPrincipleBySlug(slug: string): TruoraPrinciple | undefined {
  return TRUORA_PRINCIPLES.find(p => p.slug === slug)
}

export const DIMENSION_COLORS = {
  'caracter': { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
  'capacidad': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'mentalidad-startup': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
}

export const ANTIVALOR_COLORS = {
  'Entitlement': { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
  'Sloppiness':  { bg: 'bg-[#FECACA]', text: 'text-[#991B1B]' },
  'Politics':    { bg: 'bg-[#FCA5A5]', text: 'text-[#7F1D1D]' },
}
