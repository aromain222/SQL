import { redirect } from "next/navigation";

export default async function LegacyWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/workspace?id=${id}`);
}
