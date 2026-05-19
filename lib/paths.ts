import path from "path";
import { assertDatasetId } from "@/lib/dataset-id";

export function uploadsRoot(): string {
  // Vercel / AWS Lambda: process.cwd() is read-only /var/task — use /tmp instead
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/uploads";
  }
  return path.join(process.cwd(), "uploads");
}

export function datasetDir(id: string): string {
  return path.join(uploadsRoot(), assertDatasetId(id));
}
