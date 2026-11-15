import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto genérico de uma tela, para o que só pode montar no navegador. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-5 py-8">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
