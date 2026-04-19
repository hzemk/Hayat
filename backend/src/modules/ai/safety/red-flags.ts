export interface RedFlagMatch {
  category: string;
  advice: {
    ar: string;
    en: string;
  };
}

interface RedFlagRule {
  category: string;
  patterns: RegExp[];
  advice: { ar: string; en: string };
}

const CALL_AMBULANCE = {
  ar: 'هذه علامات خطيرة. اتصل بالإسعاف فوراً على 911 أو اضغط زر الطوارئ.',
  en: 'These are serious warning signs. Call an ambulance immediately on 911 or press the emergency button.',
};

const SEE_DOCTOR_NOW = {
  ar: 'نوصي بزيارة أقرب طوارئ مستشفى فوراً أو التواصل مع طبيب مباشرةً.',
  en: 'We recommend going to the nearest emergency department now or speaking to a doctor immediately.',
};

const RULES: RedFlagRule[] = [
  {
    category: 'cardiac',
    advice: CALL_AMBULANCE,
    patterns: [
      /chest\s*pain/i,
      /pressure\s*in\s*(my\s*)?chest/i,
      /radiating\s*pain.*(arm|jaw)/i,
      /ألم(\s+شديد)?\s+في\s+(ال)?صدر/u,
      /ضغط\s+على\s+(ال)?صدر/u,
    ],
  },
  {
    category: 'stroke',
    advice: CALL_AMBULANCE,
    patterns: [
      /face\s*droop/i,
      /slurred\s*speech/i,
      /sudden\s*weakness.*(arm|leg|side)/i,
      /خدر\s+(في\s+)?(الوجه|اليد|الذراع|الرجل)/u,
      /تلعثم|ميلان\s+(في\s+)?الوجه/u,
    ],
  },
  {
    category: 'breathing',
    advice: CALL_AMBULANCE,
    patterns: [
      /can'?t\s*breathe/i,
      /cannot\s*breathe/i,
      /severe\s*shortness\s*of\s*breath/i,
      /choking/i,
      /لا\s+أستطيع\s+التنفس/u,
      /ضيق\s+(شديد\s+)?في\s+التنفس/u,
      /اختناق/u,
    ],
  },
  {
    category: 'bleeding',
    advice: CALL_AMBULANCE,
    patterns: [
      /severe\s*bleeding/i,
      /heavy\s*bleeding/i,
      /bleeding\s*(that\s*)?(won'?t|does\s*not)\s*stop/i,
      /نزيف\s+(شديد|غزير)/u,
      /نزيف\s+لا\s+يتوقف/u,
    ],
  },
  {
    category: 'unconscious',
    advice: CALL_AMBULANCE,
    patterns: [
      /unconscious/i,
      /passed\s*out/i,
      /not\s*responding/i,
      /فاقد\s+الوعي/u,
      /(غيبوبة|إغماء)/u,
    ],
  },
  {
    category: 'suicide',
    advice: {
      ar: 'أنا قلق عليك. تواصل الآن مع الخط الساخن للصحة النفسية في الأردن أو توجه إلى أقرب طوارئ. لست وحدك.',
      en: "I'm concerned about you. Please contact Jordan's mental health hotline now or go to the nearest emergency room. You are not alone.",
    },
    patterns: [
      /suicid(e|al)/i,
      /kill\s*myself/i,
      /end\s*my\s*life/i,
      /self[-\s]*harm/i,
      /انتحار|أنهي\s+حياتي|أؤذي\s+نفسي/u,
    ],
  },
  {
    category: 'pregnancy',
    advice: SEE_DOCTOR_NOW,
    patterns: [
      /pregnan(t|cy).*(bleeding|pain)/i,
      /(bleeding|pain).*pregnan(t|cy)/i,
      /حامل.*(نزيف|ألم\s+شديد)/u,
    ],
  },
  {
    category: 'allergy',
    advice: CALL_AMBULANCE,
    patterns: [
      /anaphylax/i,
      /throat\s*closing/i,
      /swelling.*(tongue|throat|face)/i,
      /انتفاخ\s+(في\s+)?(الحلق|اللسان|الوجه)/u,
    ],
  },
  {
    category: 'seizure',
    advice: CALL_AMBULANCE,
    patterns: [/seizure/i, /convulsion/i, /تشنج|نوبة\s+صرع/u],
  },
  {
    category: 'pediatric',
    advice: SEE_DOCTOR_NOW,
    patterns: [
      /infant.*(lethargic|fever.*104|high\s*fever)/i,
      /baby.*(not\s*responding|very\s*sleepy|blue)/i,
      /رضيع.*(حرارة\s*(40|عالية)|خامل|أزرق)/u,
    ],
  },
  {
    category: 'poisoning',
    advice: CALL_AMBULANCE,
    patterns: [
      /overdose/i,
      /took\s*too\s*many\s*(pills|tablets)/i,
      /poison(ing|ed)/i,
      /تسمم|جرعة\s+زائدة/u,
    ],
  },
];

export function detectRedFlag(message: string): RedFlagMatch | null {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) {
        return { category: rule.category, advice: rule.advice };
      }
    }
  }
  return null;
}
