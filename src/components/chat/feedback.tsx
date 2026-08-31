'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function ChatFeedback({ messageId, sessionId }: { messageId: string, sessionId: string }) {
  const [hasVoted, setHasVoted] = useState<'up' | 'down' | null>(null);
  const supabase = createClient();

  const handleVote = async (vote: 'up' | 'down') => {
    if (hasVoted) return;
    setHasVoted(vote);

    // Send feedback to Supabase query_logs for Admin Human-in-the-Loop review
    const { error } = await supabase
      .from('query_logs')
      .update({ user_feedback: vote })
      .eq('id', messageId);

    if (error) {
      toast.error('Failed to submit feedback.');
      setHasVoted(null);
    } else {
      toast.success('Thank you for your feedback!');
    }
  };

  const handleReportInaccuracy = async () => {
    const reason = prompt("What is inaccurate about this answer?");
    if (!reason) return;

    await supabase
      .from('query_logs')
      .update({ 
        user_feedback: 'down', 
        flagged_for_review: true,
        flag_reason: reason 
      })
      .eq('id', messageId);
    
    toast.success('Reported to Admin for review.');
  };

  return (
    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
      <button 
        onClick={() => handleVote('up')}
        className={`p-1 hover:text-green-500 transition-colors ${hasVoted === 'up' ? 'text-green-500' : ''}`}
        disabled={!!hasVoted}
        aria-label="Helpful"
      >
        <ThumbsUp size={16} />
      </button>
      
      <button 
        onClick={() => handleVote('down')}
        className={`p-1 hover:text-red-500 transition-colors ${hasVoted === 'down' ? 'text-red-500' : ''}`}
        disabled={!!hasVoted}
        aria-label="Not helpful"
      >
        <ThumbsDown size={16} />
      </button>

      <button
        onClick={handleReportInaccuracy}
        className="flex items-center gap-1 ml-4 hover:text-orange-500 transition-colors"
      >
        <AlertCircle size={14} />
        <span>Report Inaccuracy</span>
      </button>
    </div>
  );
}
