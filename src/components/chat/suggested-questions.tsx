'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  questions?: string[];
}

const DEFAULT_QUESTIONS = [
  'What is our remote work policy?',
  'How do I submit an expense report?',
  'What are the standard working hours?',
  'What is the onboarding process?',
];

export default function SuggestedQuestions({ onSelect, questions }: SuggestedQuestionsProps) {
  const list = questions && questions.length > 0 ? questions : DEFAULT_QUESTIONS;

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
      {list.map((q, idx) => (
        <motion.button
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + idx * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(q)}
          className="flex items-center gap-2 text-xs bg-white/5 hover:bg-indigo-500/15 text-slate-400 hover:text-indigo-300 border border-white/10 hover:border-indigo-400/30 rounded-full px-3 py-2 transition-all duration-200 cursor-pointer shadow-sm backdrop-blur-sm"
        >
          <Zap className="h-3 w-3 shrink-0 text-amber-400" />
          {q}
        </motion.button>
      ))}
    </div>
  );
}
