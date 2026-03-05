import { cn, werToAccuracy } from '@/lib/utils';

interface WordDiffProps {
  reference: string;
  submitted: string;
  wer?: number | null;
  clipNumber?: number;
  audioFilename?: string;
}

interface DiffToken {
  word: string;
  type: 'equal' | 'deleted' | 'inserted';
}

/**
 * Compute word-level diff using Levenshtein edit distance with backtracking.
 * Returns tokens for reference (left) and hypothesis (right) columns.
 */
function computeDiff(reference: string, hypothesis: string): {
  left: DiffToken[];
  right: DiffToken[];
} {
  const ref = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hyp = hypothesis.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const n = ref.length;
  const m = hyp.length;

  // Build DP table
  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array(m + 1).fill(0)
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        ref[i - 1] === hyp[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  // Backtrack
  const left: DiffToken[] = [];
  const right: DiffToken[] = [];
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      left.unshift({ word: ref[i - 1], type: 'equal' });
      right.unshift({ word: hyp[j - 1], type: 'equal' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      // Insertion
      right.unshift({ word: hyp[j - 1], type: 'inserted' });
      j--;
    } else {
      // Deletion / substitution
      left.unshift({ word: ref[i - 1], type: 'deleted' });
      if (j > 0 && dp[i - 1][j - 1] <= dp[i - 1][j] && dp[i - 1][j - 1] <= dp[i][j - 1]) {
        // It's a substitution — also show the hyp word as inserted
        right.unshift({ word: hyp[j - 1], type: 'inserted' });
        j--;
      }
      i--;
    }
  }

  return { left, right };
}

function renderTokens(tokens: DiffToken[]) {
  return tokens.map((t, i) => (
    <span
      key={i}
      className={cn(
        'mr-1',
        t.type === 'deleted' && 'diff-deleted',
        t.type === 'inserted' && 'diff-inserted',
        t.type === 'equal' && 'diff-equal'
      )}
    >
      {t.word}
    </span>
  ));
}

export function WordDiff({ reference, submitted, wer, clipNumber, audioFilename }: WordDiffProps) {
  const { left, right } = computeDiff(reference, submitted || '');
  const accuracy = wer != null ? (1 - Math.min(wer, 1)) * 100 : null;

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {clipNumber != null && (
            <span className="badge badge-info badge-sm font-semibold">
              Clip {clipNumber}
            </span>
          )}
          {audioFilename && (
            <span className="text-xs text-base-content/40">{audioFilename}</span>
          )}
        </div>
        {wer != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/40">WER: {wer.toFixed(3)}</span>
            <span
              className={cn(
                'badge badge-sm font-bold',
                accuracy != null && accuracy >= 80
                  ? 'badge-success'
                  : accuracy != null && accuracy >= 60
                  ? 'badge-warning'
                  : 'badge-error'
              )}
            >
              {werToAccuracy(wer)}
            </span>
          </div>
        )}
      </div>

      {/* Diff columns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">
            Reference
          </div>
          <div className="text-sm leading-relaxed bg-base-content/[0.04] rounded-lg p-3 min-h-[60px] break-words">
            {reference ? renderTokens(left) : <span className="text-base-content/20 italic">empty</span>}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">
            Submitted
          </div>
          <div className="text-sm leading-relaxed bg-base-content/[0.04] rounded-lg p-3 min-h-[60px] break-words">
            {submitted
              ? renderTokens(right)
              : <span className="text-base-content/20 italic">not submitted</span>}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-base-content/40">
        <span><span className="diff-deleted mr-1">word</span>= deleted/wrong</span>
        <span><span className="diff-inserted mr-1">word</span>= extra/substituted</span>
      </div>
    </div>
  );
}
