import type { DatasetMeta } from "@/types";

export type StarterAnalysis = {
  title: string;
  question: string;
  reason: string;
};

function firstTextColumn(columns: DatasetMeta["columns"]) {
  return columns.find((col) => col.type === "text" && col.uniqueCount > 1) ?? columns[0] ?? null;
}

function numericColumns(columns: DatasetMeta["columns"]) {
  return columns.filter((col) => col.type === "integer" || col.type === "real");
}

function dateColumns(columns: DatasetMeta["columns"]) {
  return columns.filter((col) => col.type === "date");
}

export function buildStarterAnalyses(meta: DatasetMeta): StarterAnalysis[] {
  const numeric = numericColumns(meta.columns);
  const dates = dateColumns(meta.columns);
  const category = firstTextColumn(meta.columns);
  const primaryMetric = numeric[0] ?? null;
  const secondaryMetric = numeric[1] ?? null;
  const starters: StarterAnalysis[] = [];

  if (primaryMetric && category) {
    starters.push({
      title: `Top ${category.originalName} by ${primaryMetric.originalName}`,
      question: `Show the top 10 ${category.originalName} by ${primaryMetric.originalName}.`,
      reason: "Finds the biggest contributors immediately.",
    });
    starters.push({
      title: `${primaryMetric.originalName} by ${category.originalName}`,
      question: `What is the total ${primaryMetric.originalName} by ${category.originalName}?`,
      reason: "Creates a quick grouped view for charting.",
    });
  }

  if (dates[0] && primaryMetric) {
    starters.push({
      title: `${primaryMetric.originalName} over time`,
      question: `How does ${primaryMetric.originalName} change over ${dates[0].originalName}?`,
      reason: "Checks trend direction and seasonality.",
    });
  }

  if (primaryMetric) {
    starters.push({
      title: `Average ${primaryMetric.originalName}`,
      question: `What is the average ${primaryMetric.originalName}?`,
      reason: "Sets a simple benchmark for the dataset.",
    });
  }

  if (primaryMetric && secondaryMetric && category) {
    starters.push({
      title: `${primaryMetric.originalName} vs ${secondaryMetric.originalName}`,
      question: `Show ${category.originalName}, ${primaryMetric.originalName}, and ${secondaryMetric.originalName} for the top 10 rows by ${primaryMetric.originalName}.`,
      reason: "Compares the two most important numeric fields.",
    });
  }

  starters.push({
    title: "Dataset size check",
    question: "How many rows are in this dataset?",
    reason: "Confirms the imported data volume.",
  });

  return starters.slice(0, 5);
}

