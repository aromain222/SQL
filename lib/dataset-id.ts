const DATASET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DatasetIdError extends Error {}

export function assertDatasetId(id: string): string {
  const normalized = id.trim();
  if (!DATASET_ID_PATTERN.test(normalized)) {
    throw new DatasetIdError("Invalid dataset id.");
  }
  return normalized;
}

