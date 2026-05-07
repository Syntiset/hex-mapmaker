import { saveAs } from "file-saver";
import type Konva from "konva";

export function exportStagePng(stage: Konva.Stage, filename = "map.png") {
  const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
  fetch(dataUrl)
    .then((r) => r.blob())
    .then((blob) => saveAs(blob, filename));
}
