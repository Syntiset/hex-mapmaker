/**
 * Реестр канвасов, которые CRTOverlay должен подмешать в композит-текстуру
 * каждый кадр перед применением барель-шейдера. Используется для тематических
 * элементов (например, snapshot сайдбара в Terminal теме), чтобы они тоже
 * прошли через бочку/хроматику/сканлайны.
 *
 * Каждый канвас должен быть размером canvas-host и иметь прозрачный фон;
 * непрозрачные пиксели накладываются поверх Konva-композита.
 */
const sources = new Set<HTMLCanvasElement>();

export const compositeRegistry = {
  add(c: HTMLCanvasElement) { sources.add(c); },
  remove(c: HTMLCanvasElement) { sources.delete(c); },
  forEach(cb: (c: HTMLCanvasElement) => void) { sources.forEach(cb); },
};
