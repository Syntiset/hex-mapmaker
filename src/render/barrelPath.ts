/**
 * Численный инверс бочки + генерация SVG-path по форме barrel-кривой.
 *
 * Шейдер делает: uv = v_uv + (v_uv - 0.5) * barrel * |v_uv - 0.5|²
 * Для DOM-clip нужна обратная функция: дано uv (на квадрате источника [0,1]),
 * найти v_uv (на выходе). Решаем Newton-итерациями.
 */

/**
 * Численный инверс: дано целевое (ux, uy) на источнике, найти такое (vx, vy)
 * на выходе, что distort(vx, vy) ≈ (ux, uy). Newton/fixed-point: 8 шагов.
 */
function barrelInverse(ux: number, uy: number, k: number): [number, number] {
  let vx = ux;
  let vy = uy;
  for (let i = 0; i < 8; i++) {
    const cx = vx - 0.5;
    const cy = vy - 0.5;
    const r2 = cx * cx + cy * cy;
    const f = k * r2;
    // residual = distort(v) - target
    const rx = vx + cx * f - ux;
    const ry = vy + cy * f - uy;
    // приближение: применяем коррекцию назад
    vx -= rx;
    vy -= ry;
  }
  return [vx, vy];
}

/**
 * Генерит SVG-path в координатах ПИКСЕЛЕЙ [0..w, 0..h], следующий по форме
 * barrel-curve. Это контур который ВИДНО как кривой экран (после бочки).
 *
 * @param k         Сила бочки (= barrel в шейдере)
 * @param w, h      Размер DOM-контейнера в px
 * @param steps     Количество точек на каждой стороне (24-32 разумно)
 * @param inset     Сжатие пути к центру (доля от размера, 0..0.05).
 *                  Нужно чтобы DOM-bezel чуть заходил внутрь WebGL-curve
 *                  и закрывал тонкий стык между шейдером и clip-path.
 */
export function buildBarrelScreenPath(k: number, w: number, h: number, steps = 32, inset = 0.012): string {
  const shrink = 1 - inset * 2;
  const points: [number, number][] = [];
  const push = (ux: number, uy: number) => {
    const [vx, vy] = barrelInverse(ux, uy, k);
    // Сжимаем точку к центру (0.5, 0.5) на коэффициент shrink
    const sx = (vx - 0.5) * shrink + 0.5;
    const sy = (vy - 0.5) * shrink + 0.5;
    points.push([sx * w, sy * h]);
  };
  // Верхняя сторона: y = 0, x = 0..1
  for (let i = 0; i <= steps; i++) push(i / steps, 0);
  // Правая: x = 1, y = 0..1 (пропускаем первый — он дублирует угол)
  for (let i = 1; i <= steps; i++) push(1, i / steps);
  // Нижняя: y = 1, x = 1..0
  for (let i = 1; i <= steps; i++) push(1 - i / steps, 1);
  // Левая: x = 0, y = 1..0
  for (let i = 1; i < steps; i++) push(0, 1 - i / steps);

  return (
    `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} ` +
    points.slice(1).map(([x, y]) => `L ${x.toFixed(2)},${y.toFixed(2)}`).join(" ") +
    " Z"
  );
}

/**
 * Полная clip-path для DOM-bezel: внешний прямоугольник (заполняет всё)
 * минус внутренняя barrel-форма (вырезается). С fill-rule:evenodd рамка
 * рендерится только в зоне корпуса, экран остаётся прозрачным.
 *
 * Возвращает значение для CSS `clip-path: path('...')`.
 */
export function buildBezelClipPath(k: number, w: number, h: number, steps = 32): string {
  const outer = `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`;
  const inner = buildBarrelScreenPath(k, w, h, steps);
  return `${outer} ${inner}`;
}
