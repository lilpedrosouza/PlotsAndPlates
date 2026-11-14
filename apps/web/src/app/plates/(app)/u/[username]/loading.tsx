import { PublicProfileSkeleton } from "@/components/people/public-profile";

/** Fronteira de carregamento do segmento [username] (o @ só existe na hora do acesso). */
export default function Loading() {
  return <PublicProfileSkeleton />;
}
