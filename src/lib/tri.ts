// TRI 3PL — proficiência via grid search MLE simplificado
// Cada questão tem parâmetros a (discriminação), b (dificuldade), c (acerto ao acaso).

export type TriItem = {
  a: number; // discriminação
  b: number; // dificuldade
  c: number; // chute (0..1)
  correct: boolean;
};

// Probabilidade 3PL de acerto dado theta
export function prob3PL(theta: number, a: number, b: number, c: number) {
  const z = 1.7 * a * (theta - b);
  const p = c + (1 - c) * (1 / (1 + Math.exp(-z)));
  return Math.min(0.9999, Math.max(0.0001, p));
}

// Log-verossimilhança das respostas dado theta
function logLik(theta: number, items: TriItem[]) {
  let ll = 0;
  for (const it of items) {
    const p = prob3PL(theta, it.a, it.b, it.c);
    ll += it.correct ? Math.log(p) : Math.log(1 - p);
  }
  return ll;
}

// Estima theta via grid em [-3, 3]
export function estimateTheta(items: TriItem[]): number {
  if (items.length === 0) return 0;
  let bestTheta = 0;
  let bestLL = -Infinity;
  for (let t = -3; t <= 3; t += 0.05) {
    const ll = logLik(t, items);
    if (ll > bestLL) {
      bestLL = ll;
      bestTheta = t;
    }
  }
  return bestTheta;
}

// Converte theta (média 0, dp 1) para nota ENEM (média 500, dp 100)
export function thetaToEnemScore(theta: number) {
  return Math.round(Math.max(0, Math.min(1000, 500 + 100 * theta)));
}

// Calcula nota TRI a partir de questões + respostas
// Regra: sem acertos → nota 0 (ENEM trata "chute em branco" como zero).
export function calculateTriEnem(items: TriItem[]) {
  if (items.length === 0) return 0;
  const correct = items.filter((i) => i.correct).length;
  if (correct === 0) return 0;
  const theta = estimateTheta(items);
  return thetaToEnemScore(theta);
}
