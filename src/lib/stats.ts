// Só o que ainda é usado no app (avatar genérico com iniciais do time em
// TeamBadge). O modelo estatístico local (Poisson) que existia aqui foi
// removido do produto — toda previsão hoje vem da IA generativa
// (predictions.functions.ts), não deste arquivo.
export function teamInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
