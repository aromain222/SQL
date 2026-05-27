import type { ColumnMeta } from "@/types";
import type { MetricMatch, SemanticContext } from "./types";
import { buildRoleMap, detectMetricIntent, matchMetric } from "./schema-mapper";

function buildPromptAdditions(matches: MetricMatch[]): string {
  if (matches.length === 0) return "";

  const top = matches[0];
  const lines: string[] = [
    `FINANCE CONTEXT`,
    `This question is about "${top.metric.name}": ${top.metric.description}`,
    `Definition: ${top.metric.explanation}`,
    "",
  ];

  if (top.columnMappings.length > 0) {
    lines.push("Detected column-to-role mappings (use these columns for the relevant parts of the query):");
    for (const m of top.columnMappings) {
      const note = m.confidence < 0.8 ? " (approximate — verify against schema)" : "";
      lines.push(`  ${m.role}: "${m.columnName}"${note}`);
    }
    lines.push("");
  }

  lines.push(`SQL formula hint: ${top.metric.sqlHint}`);
  lines.push(`Preferred chart type for this metric: ${top.metric.defaultChart}`);

  if (top.missingRoles.length > 0) {
    lines.push("");
    lines.push(
      `Missing data: the following required roles have no matching column — ${top.missingRoles.join(", ")}. ` +
      `If the query cannot be answered, set sql to "" and explain clearly what data is needed.`
    );
  }

  // Surface secondary metrics if any (e.g., question about "profit" matches both net_income and gross_margin)
  const secondary = matches.slice(1).filter((m) => m.isFullySatisfied);
  if (secondary.length > 0) {
    lines.push("");
    lines.push(
      `Related metrics also detected in the question: ${secondary.map((m) => m.metric.name).join(", ")}. ` +
      `Focus on the primary metric above but include related data if it adds value.`
    );
  }

  return lines.join("\n");
}

function buildWarnings(matches: MetricMatch[]): string[] {
  const warnings: string[] = [];

  for (const match of matches) {
    if (!match.isFullySatisfied) {
      warnings.push(match.metric.missingDataWarning);
    } else {
      // Partially mapped (optional roles missing) — note low-confidence mappings
      const lowConfidence = match.columnMappings.filter(
        (m) => match.metric.requiredRoles.includes(m.role) && m.confidence < 0.8
      );
      if (lowConfidence.length > 0) {
        warnings.push(
          `${match.metric.name}: column "${lowConfidence[0].columnName}" is an approximate match for the "${lowConfidence[0].role}" role — verify the result.`
        );
      }
    }
  }

  return [...new Set(warnings)];
}

export function resolveFinanceContext(
  question: string,
  columns: ColumnMeta[]
): SemanticContext {
  const intendedMetrics = detectMetricIntent(question);

  if (intendedMetrics.length === 0) {
    return { isFinanceQuery: false, matchedMetrics: [], promptAdditions: "", warnings: [] };
  }

  const roleMap = buildRoleMap(columns);

  const matches = intendedMetrics
    .map((metric) => matchMetric(metric, roleMap))
    .sort((a, b) => {
      if (a.isFullySatisfied !== b.isFullySatisfied) return a.isFullySatisfied ? -1 : 1;
      return b.columnMappings.length - a.columnMappings.length;
    });

  return {
    isFinanceQuery: true,
    matchedMetrics: matches,
    promptAdditions: buildPromptAdditions(matches),
    warnings: buildWarnings(matches),
  };
}

export type { SemanticContext, MetricMatch, MetricDefinition, ColumnMapping } from "./types";
