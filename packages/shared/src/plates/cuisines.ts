/**
 * Cozinhas sugeridas. As chaves são as do OpenStreetMap (tag `cuisine`), para
 * o preenchimento automático casar; o usuário também pode escrever outra.
 */
export const CUISINES = [
  { key: "brazilian", label: "Brasileira" },
  { key: "regional", label: "Regional" },
  { key: "mineira", label: "Mineira" },
  { key: "nordestina", label: "Nordestina" },
  { key: "gaucha", label: "Gaúcha" },
  { key: "steak_house", label: "Churrascaria" },
  { key: "barbecue", label: "Churrasco" },
  { key: "italian", label: "Italiana" },
  { key: "pizza", label: "Pizza" },
  { key: "pasta", label: "Massas" },
  { key: "japanese", label: "Japonesa" },
  { key: "sushi", label: "Sushi" },
  { key: "ramen", label: "Lámen" },
  { key: "chinese", label: "Chinesa" },
  { key: "korean", label: "Coreana" },
  { key: "thai", label: "Tailandesa" },
  { key: "vietnamese", label: "Vietnamita" },
  { key: "indian", label: "Indiana" },
  { key: "arab", label: "Árabe" },
  { key: "lebanese", label: "Libanesa" },
  { key: "turkish", label: "Turca" },
  { key: "greek", label: "Grega" },
  { key: "mexican", label: "Mexicana" },
  { key: "peruvian", label: "Peruana" },
  { key: "argentinian", label: "Argentina" },
  { key: "french", label: "Francesa" },
  { key: "portuguese", label: "Portuguesa" },
  { key: "spanish", label: "Espanhola" },
  { key: "german", label: "Alemã" },
  { key: "american", label: "Americana" },
  { key: "burger", label: "Hambúrguer" },
  { key: "seafood", label: "Frutos do mar" },
  { key: "fish", label: "Peixes" },
  { key: "vegetarian", label: "Vegetariana" },
  { key: "vegan", label: "Vegana" },
  { key: "bakery", label: "Padaria" },
  { key: "coffee_shop", label: "Café" },
  { key: "dessert", label: "Sobremesas" },
  { key: "ice_cream", label: "Sorvete" },
  { key: "sandwich", label: "Sanduíches" },
  { key: "bar", label: "Boteco" },
  { key: "fine_dining", label: "Alta gastronomia" },
] as const;

const LABELS = new Map<string, string>(CUISINES.map((cuisine) => [cuisine.key, cuisine.label]));

/** Nome em português de uma cozinha; a própria chave quando não conhece. */
export function cuisineLabel(key: string): string {
  return LABELS.get(key) ?? key;
}
