"use client";

import {
  DISH_CATEGORIES,
  DISH_CATEGORY_LABELS,
  type DishCategory,
  type DishWithScore,
  RESTAURANT_CRITERIA,
  RESTAURANT_CRITERIA_LABELS,
  type RestaurantCriterion,
  type RestaurantRating,
  type Visit,
  overallFromCriteria,
  todayIso,
} from "@pap/shared";
import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { TogetherToggle } from "@/components/couple/together-toggle";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextAreaField, TextField } from "@/components/ui/field";
import { RatingInput } from "@/components/ui/rating";
import { Stamp } from "@/components/ui/stamp";
import { usePartner } from "@/lib/couple/queries";
import { skipsOptimizer } from "@/lib/image";
import { money } from "@/lib/plates/format";
import {
  useAddDish,
  useAddVisit,
  useDeleteDish,
  useDeleteRestaurantRating,
  useRateDish,
  useRateRestaurant,
  useUpdateDish,
  useUpdateVisit,
} from "@/lib/plates/mutations";
import { PhotoButton, usePhotoUpload } from "./photo-picker";
import { Sheet } from "./sheet";

type SheetBase = { open: boolean; onOpenChange: (open: boolean) => void };

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Não deu para salvar. Tenta de novo?");

/** "45,90" → 4590 centavos; vazio → null. */
export function parseMoney(value: string): number | null {
  const clean = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!clean) return null;
  const amount = Number(clean);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}
const moneyInput = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));

function PrivateToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <ChipToggle pressed={value} onPressedChange={onChange}>
        Avaliação privada
      </ChipToggle>
      <p className="text-sm text-soft">
        {value ? "Só você e o seu par veem esta nota." : "Outras pessoas do PAP podem ver esta nota."}
      </p>
    </div>
  );
}

/** Avaliação do restaurante: os quatro critérios, o carimbo que acompanha a média e o review. */
export function RatingSheet({ restaurantId, current, open, onOpenChange }: SheetBase & { restaurantId: string; current: RestaurantRating | null }) {
  const [criteria, setCriteria] = useState<Record<RestaurantCriterion, number | null>>({
    food: current?.food ?? null,
    service: current?.service ?? null,
    ambiance: current?.ambiance ?? null,
    value: current?.value ?? null,
  });
  const [review, setReview] = useState(current?.review ?? "");
  const [isPrivate, setPrivate] = useState(current?.isPrivate ?? false);
  const [error, setError] = useState<string | null>(null);
  const rate = useRateRestaurant(restaurantId);
  const remove = useDeleteRestaurantRating(restaurantId);
  const overall = overallFromCriteria(criteria);

  const save = () => {
    if (overall === null) {
      setError("Dê nota a pelo menos um critério.");
      return;
    }
    setError(null);
    rate.mutate({ ...criteria, review, isPrivate }, { onError: (failure) => setError(errorText(failure)) });
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nossa avaliação"
      description="Dê nota só no que lembrar; a nota geral é a média dos critérios."
      footer={
        <div className="flex gap-3 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1">
          {current ? (
            <Button
              variant="danger"
              onClick={() => {
                remove.mutate();
                onOpenChange(false);
              }}
            >
              Apagar
            </Button>
          ) : null}
          <Button block onClick={save} busy={rate.isPending}>
            Salvar nota
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <dl className="flex flex-1 flex-col gap-4">
            {RESTAURANT_CRITERIA.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="font-micro text-[0.8125rem] text-soft">{RESTAURANT_CRITERIA_LABELS[key]}</dt>
                <dd>
                  <RatingInput
                    label={RESTAURANT_CRITERIA_LABELS[key]}
                    value={criteria[key]}
                    onChange={(value) => setCriteria((currentCriteria) => ({ ...currentCriteria, [key]: value }))}
                    size={34}
                  />
                </dd>
              </div>
            ))}
          </dl>
          <Stamp value={overall} caption="geral" size="lg" className="mt-2 shrink-0" />
        </div>
        <TextAreaField label="Review" value={review} onChange={(event) => setReview(event.target.value)} maxLength={4000} placeholder="O que vale lembrar da próxima vez?" />
        <PrivateToggle value={isPrivate} onChange={setPrivate} />
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

/**
 * Nova visita ou edição de uma visita: data, ocasião, valor, pratos pedidos e
 * fotos. Quem pode editar o restaurante cria o prato ali mesmo.
 */
export function VisitSheet({
  restaurantId,
  dishes,
  visit,
  canEdit,
  open,
  onOpenChange,
}: SheetBase & { restaurantId: string; dishes: DishWithScore[]; visit?: Visit | null; canEdit: boolean }) {
  const [visitedOn, setVisitedOn] = useState(visit?.visitedOn ?? todayIso());
  const [occasion, setOccasion] = useState(visit?.occasion ?? "");
  const [amount, setAmount] = useState(moneyInput(visit?.amountCents));
  const [dishIds, setDishIds] = useState<string[]>(visit?.dishIds ?? []);
  const partner = usePartner();
  const [together, setTogether] = useState(visit ? visit.together : partner !== null);
  // Só quem registrou desmarca o "juntos" aqui; o par tira a visita do caderno dele apagando.
  const showTogether = partner !== null && (!visit || visit.registeredBy === null);
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>(
    visit?.photos.map((photo) => ({ path: photo.path, preview: photo.thumbUrl })) ?? [],
  );
  const [created, setCreated] = useState<{ id: string; name: string }[]>([]);
  const [newDish, setNewDish] = useState("");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const uploader = usePhotoUpload("visit");
  const add = useAddVisit(restaurantId);
  const update = useUpdateVisit(restaurantId);
  const addDish = useAddDish(restaurantId);

  // Pratos criados agora aparecem na hora, antes de a página recarregar a lista.
  const options = [...dishes.map((dish) => ({ id: dish.id, name: dish.name })), ...created.filter((dish) => !dishes.some((known) => known.id === dish.id))];

  const createDish = () => {
    const name = newDish.trim();
    if (!name) return;
    setError(null);
    addDish.mutate(
      { name, category: "principal" },
      {
        onSuccess: (dish) => {
          setCreated((current) => [...current, { id: dish.id, name: dish.name }]);
          setDishIds((current) => [...current, dish.id]);
          setNewDish("");
        },
        onError: (failure) => setError(errorText(failure)),
      },
    );
  };

  const save = () => {
    setError(null);
    const body = {
      visitedOn,
      occasion,
      amountCents: parseMoney(amount),
      dishIds,
      photoPaths: photos.map((photo) => photo.path),
      ...(showTogether ? { together } : {}),
    };
    const done = { onSuccess: () => onOpenChange(false), onError: (failure: unknown) => setError(errorText(failure)) };
    if (visit) update.mutate({ visitId: visit.id, patch: body }, done);
    else add.mutate(body, done);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={visit ? "Editar visita" : "Nova visita"}
      footer={
        <Button block onClick={save} busy={add.isPending || update.isPending} disabled={uploading > 0 || addDish.isPending}>
          {visit ? "Salvar visita" : "Registrar visita"}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Quando" type="date" value={visitedOn} max={todayIso()} onChange={(event) => setVisitedOn(event.target.value)} />
          <TextField label="Quanto gastamos" inputMode="decimal" prefix="R$" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" />
        </div>
        {showTogether && partner ? <TogetherToggle partner={partner} label="Fomos juntos" where="caderno" value={together} onChange={setTogether} /> : null}
        <TextField label="Ocasião" value={occasion} onChange={(event) => setOccasion(event.target.value)} maxLength={80} placeholder="Aniversário, almoço de domingo…" />
        {options.length > 0 || canEdit ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="font-micro mb-3 text-[0.8125rem] text-soft">O que a gente pediu</legend>
            {options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {options.map((dish) => (
                  <ChipToggle
                    key={dish.id}
                    pressed={dishIds.includes(dish.id)}
                    onPressedChange={(on) => setDishIds((current) => (on ? [...current, dish.id] : current.filter((id) => id !== dish.id)))}
                  >
                    {dish.name}
                  </ChipToggle>
                ))}
              </div>
            ) : null}
            {canEdit ? (
              <div className="flex items-end gap-2">
                <TextField
                  label="Prato que não está na lista"
                  value={newDish}
                  onChange={(event) => setNewDish(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      createDish();
                    }
                  }}
                  maxLength={80}
                  placeholder="Bolinho de bacalhau"
                  className="min-w-0 flex-1"
                />
                <Button variant="secondary" onClick={createDish} busy={addDish.isPending} disabled={!newDish.trim()}>
                  Anotar
                </Button>
              </div>
            ) : null}
          </fieldset>
        ) : null}
        <div className="flex flex-col gap-3">
          <span className="font-micro text-[0.8125rem] text-soft">Fotos</span>
          {photos.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <li key={photo.path} className="relative">
                  <Image src={photo.preview} alt="" width={88} height={110} unoptimized className="arch h-[110px] w-[88px] object-cover" />
                  <button
                    type="button"
                    aria-label="Tirar foto"
                    onClick={() => setPhotos((current) => current.filter((item) => item.path !== photo.path))}
                    className="absolute -top-2 -right-2 inline-flex size-8 items-center justify-center rounded-full border border-rule-strong bg-surface text-foreground"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <PhotoButton
            label="Pôr fotos"
            multiple
            busy={uploading > 0}
            className="self-start shadow-none"
            onFile={async (files) => {
              for (const file of files.slice(0, 10 - photos.length)) {
                setUploading((count) => count + 1);
                const preview = URL.createObjectURL(file);
                const path = await uploader.upload(file);
                setUploading((count) => count - 1);
                if (path) setPhotos((current) => [...current, { path, preview }]);
              }
            }}
          />
          {uploader.error ? <p role="alert" className="text-sm font-medium text-danger">{uploader.error}</p> : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Cadastrar ou editar um prato (só quem pode editar o restaurante). */
export function DishSheet({ restaurantId, dish, open, onOpenChange }: SheetBase & { restaurantId: string; dish?: DishWithScore | null }) {
  const [name, setName] = useState(dish?.name ?? "");
  const [category, setCategory] = useState<DishCategory>(dish?.category ?? "principal");
  const [price, setPrice] = useState(moneyInput(dish?.priceCents));
  const [description, setDescription] = useState(dish?.description ?? "");
  const [photoPath, setPhotoPath] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const photo = usePhotoUpload("dish");
  const add = useAddDish(restaurantId);
  const update = useUpdateDish(restaurantId);
  const remove = useDeleteDish(restaurantId);
  const busy = add.isPending || update.isPending;

  const save = () => {
    if (!name.trim()) {
      setError("Dê um nome ao prato.");
      return;
    }
    setError(null);
    const body = { name, category, priceCents: parseMoney(price), description, ...(photoPath !== undefined ? { photoPath } : {}) };
    const done = { onSuccess: () => onOpenChange(false), onError: (failure: unknown) => setError(errorText(failure)) };
    if (dish) update.mutate({ dishId: dish.id, patch: body }, done);
    else
      add.mutate(body, {
        ...done,
        onSuccess: () => {
          setName("");
          setPrice("");
          setDescription("");
          setPhotoPath(undefined);
          photo.clear();
          onOpenChange(false);
        },
      });
  };

  const preview = photo.preview ?? dish?.photo?.thumbUrl ?? null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={dish ? "Editar prato" : "Novo prato"}
      footer={
        <div className="flex gap-3 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1">
          {dish ? (
            <Button
              variant="danger"
              onClick={() => {
                remove.mutate(dish.id);
                onOpenChange(false);
              }}
            >
              Apagar
            </Button>
          ) : null}
          <Button block onClick={save} busy={busy} disabled={photo.busy}>
            {dish ? "Salvar prato" : "Adicionar prato"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-end gap-4">
          {preview ? (
            <Image src={preview} alt="" width={88} height={110} unoptimized={skipsOptimizer(preview)} className="arch h-[110px] w-[88px] shrink-0 object-cover" />
          ) : null}
          <PhotoButton
            label={preview ? "Trocar foto" : "Pôr foto"}
            busy={photo.busy}
            className="shadow-none"
            onFile={async ([file]) => {
              if (!file) return;
              const path = await photo.upload(file);
              if (path) setPhotoPath(path);
            }}
          />
        </div>
        <TextField label="Nome" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        <fieldset className="flex flex-col gap-3">
          <legend className="font-micro mb-3 text-[0.8125rem] text-soft">Categoria</legend>
          <div className="flex flex-wrap gap-2">
            {DISH_CATEGORIES.map((value) => (
              <ChipToggle key={value} pressed={category === value} onPressedChange={() => setCategory(value)}>
                {DISH_CATEGORY_LABELS[value]}
              </ChipToggle>
            ))}
          </div>
        </fieldset>
        <TextField label="Preço" inputMode="decimal" prefix="R$" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" />
        <TextAreaField label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
        {photo.error || error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {photo.error ?? error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Nota do prato: estrelas, comentário e "pediria de novo?". */
export function DishRatingSheet({
  restaurantId,
  dish,
  open,
  onOpenChange,
  onEditDish,
}: SheetBase & { restaurantId: string; dish: DishWithScore; onEditDish?: () => void }) {
  const mine = dish.myRating;
  const [rating, setRating] = useState<number | null>(mine?.rating ?? null);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [again, setAgain] = useState<boolean | null>(mine?.wouldOrderAgain ?? null);
  const [isPrivate, setPrivate] = useState(mine?.isPrivate ?? false);
  const [error, setError] = useState<string | null>(null);
  const rate = useRateDish(restaurantId);

  const save = () => {
    if (rating === null) {
      setError("Toque nas estrelas para dar a nota.");
      return;
    }
    rate.mutate({ dishId: dish.id, input: { rating, comment, wouldOrderAgain: again, isPrivate } });
    onOpenChange(false);
  };

  const meta = [DISH_CATEGORY_LABELS[dish.category], money(dish.priceCents)].filter(Boolean).join(" · ");

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={dish.name}
      description={meta || undefined}
      footer={
        <div className="flex gap-3 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1">
          {onEditDish ? (
            <Button variant="secondary" onClick={onEditDish}>
              Editar prato
            </Button>
          ) : null}
          <Button block onClick={save} busy={rate.isPending}>
            Salvar nota
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {dish.description ? <p className="leading-relaxed text-soft">{dish.description}</p> : null}
        <div className="flex flex-col gap-1">
          <span className="font-micro text-[0.8125rem] text-soft">Sua nota</span>
          <RatingInput label={`Nota para ${dish.name}`} value={rating} onChange={setRating} />
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="font-micro mb-3 text-[0.8125rem] text-soft">Pediria de novo?</legend>
          <div className="flex gap-2">
            <ChipToggle pressed={again === true} onPressedChange={(on) => setAgain(on ? true : null)}>
              Pediria
            </ChipToggle>
            <ChipToggle pressed={again === false} onPressedChange={(on) => setAgain(on ? false : null)}>
              Não pediria
            </ChipToggle>
          </div>
        </fieldset>
        <TextAreaField label="Comentário" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} />
        <PrivateToggle value={isPrivate} onChange={setPrivate} />
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
