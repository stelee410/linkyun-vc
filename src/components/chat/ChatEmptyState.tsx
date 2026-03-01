import React from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { tw } from '../../themes';

type Variant = 'individual' | 'lawyer';

interface ChatEmptyStateProps {
  variant?: Variant;
  title: string;
  description: string;
  suggestions: string[];
  onSuggestionClick: (text: string) => void;
}

const variantStyles = {
  individual: {
    iconBg: tw.iconBg,
    iconColor: tw.iconColor,
  },
  lawyer: {
    iconBg: tw.iconBg,
    iconColor: tw.iconColor,
  },
};

export default function ChatEmptyState({
  variant = 'individual',
  title,
  description,
  suggestions,
  onSuggestionClick,
}: ChatEmptyStateProps) {
  const styles = variantStyles[variant];

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
      <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', styles.iconBg, styles.iconColor)}>
        <TrendingUp className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-500 mt-2 max-w-xs mx-auto">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-8">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSuggestionClick(q)}
            className="p-3 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

