import { RestaurantSkeleton } from "@/components/plates/restaurant-page";

/**
 * Fronteira de carregamento do segmento [id]: o id só é conhecido na hora do
 * acesso, então a rota precisa de um Suspense acima dela para o build gerar a
 * casca estática.
 */
export default function Loading() {
  return <RestaurantSkeleton />;
}
