import { ListSkeleton } from "@/components/plots/list-page";

/** Fronteira de carregamento do segmento [id] (o id só existe na hora do acesso). */
export default function Loading() {
  return <ListSkeleton />;
}
