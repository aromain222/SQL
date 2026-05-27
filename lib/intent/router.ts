import type { ColumnMeta } from "@/types";
import type { SemanticContext } from "@/lib/finance/types";
import { resolveFinanceContext } from "@/lib/finance";
import { INTENT_KEYWORD_GROUPS } from "./keywords";
import { getIntentPrompt } from "./prompts";
import { INTENT_LABELS, type IntentClassification, type IntentType } from "./types";

function classifyPrimaryIntent(question: string, semanticContext: SemanticContext): IntentType {
  const q = question.toLowerCase();

  // Check specific intents in priority order (most specific first)
  for (const { intent, keywords } of INTENT_KEYWORD_GROUPS) {
    if (keywords.some((kw) => q.includes(kw))) return intent;
  }

  // Finance metric catch-all (after specific structural intents)
  if (semanticContext.isFinanceQuery) return "finance_metric";

  return "generic_db";
}

function computeConfidence(
  intent: IntentType,
  question: string,
  semanticContext: SemanticContext
): number {
  if (intent === "generic_db") return 0.5;

  if (intent === "finance_metric") {
    const top = semanticContext.matchedMetrics[0];
    if (!top) return 0.5;
    if (top.isFullySatisfied) return 0.9;
    const requiredCount = top.metric.requiredRoles.length;
    const mappedRequired = top.columnMappings.filter((m) =>
      top.metric.requiredRoles.includes(m.role)
    ).length;
    return 0.5 + (mappedRequired / Math.max(requiredCount, 1)) * 0.4;
  }

  // Keyword-matched intents: more keyword hits = higher confidence
  const q = question.toLowerCase();
  const group = INTENT_KEYWORD_GROUPS.find((g) => g.intent === intent);
  if (!group) return 0.7;

  const hitCount = group.keywords.filter((kw) => q.includes(kw)).length;
  return Math.min(0.95, 0.65 + hitCount * 0.08);
}

function buildPromptAdditions(
  intent: IntentType,
  semanticContext: SemanticContext
): string {
  const parts: string[] = [];

  // Finance context is always injected when relevant, regardless of primary intent
  if (semanticContext.isFinanceQuery && semanticContext.promptAdditions) {
    parts.push(semanticContext.promptAdditions);
  }

  // Structural intent guidance (variance, cohort, forecast, etc.)
  const intentPrompt = getIntentPrompt(intent);
  if (intentPrompt) parts.push(intentPrompt);

  return parts.join("\n\n");
}

export function routeIntent(question: string, columns: ColumnMeta[]): IntentClassification {
  const semanticContext = resolveFinanceContext(question, columns);
  const intent = classifyPrimaryIntent(question, semanticContext);
  const confidence = computeConfidence(intent, question, semanticContext);

  const metricsUsed = semanticContext.matchedMetrics.map((m) => m.metric.name);
  const missingFields = [
    ...new Set(semanticContext.matchedMetrics.flatMap((m) => m.missingRoles)),
  ];

  return {
    intent,
    intentLabel: INTENT_LABELS[intent],
    confidence,
    promptAdditions: buildPromptAdditions(intent, semanticContext),
    metricsUsed,
    missingFields,
    warnings: semanticContext.warnings,
    semanticContext,
  };
}
