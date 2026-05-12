import { useEffect, useRef } from "react";
import type Konva from "konva";

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
  width: number;
  height: number;
  active: boolean;
  /** Сила бочкообразного искажения. 0 = плоский экран, 0.2-0.4 = выраженная бочка CRT. */
  barrel?: number;
  /** Сила хроматической аберрации (RGB-сдвиг к углам). */
  chromatic?: number;
  /** Глубина сканлайнов (0..1). */
  scanline?: number;
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 1.0 - (a_pos.y * 0.5 + 0.5));
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec3 u_bg;
uniform float u_barrel;
uniform float u_chromatic;
uniform float u_scanline;
varying vec2 v_uv;

vec2 distort(vec2 uv) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return uv + c * (u_barrel * r2);
}

void main() {
  vec2 uv = distort(v_uv);
  // За пределами [0,1] — полностью прозрачно. Bezel теперь рисует DOM через
  // clip-path по barrel-curve (см. barrelPath.ts).
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }
  vec2 c = uv - 0.5;
  float ca = u_chromatic;
  vec4 sR = texture2D(u_tex, clamp(uv + c * ca, 0.0, 1.0));
  vec4 sG = texture2D(u_tex, uv);
  vec4 sB = texture2D(u_tex, clamp(uv - c * ca, 0.0, 1.0));
  float r = sR.r * sR.a + u_bg.r * (1.0 - sR.a);
  float g = sG.g * sG.a + u_bg.g * (1.0 - sG.a);
  float bb = sB.b * sB.a + u_bg.b * (1.0 - sB.a);
  vec3 col = vec3(r, g, bb);
  col *= 0.82;
  col.g += col.g * 0.06;
  col += pow(max(col - 0.55, 0.0), vec3(2.0)) * 0.7;
  float scan = sin(uv.y * u_res.y * 1.4);
  col *= 1.0 - u_scanline * (0.5 - 0.5 * scan);
  float vig = 1.0 - dot(c, c) * 0.7;
  col *= clamp(vig, 0.0, 1.0);
  // Цвет хексов плавно гасим в чёрный у кромки (10% ширины) — скрывает hex-зигзаги.
  float edgeNear = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  col *= smoothstep(0.0, 0.10, edgeNear);
  // Alpha остаётся 1 везде внутри [0,1] — DOM-clip-path кроет всё снаружи.
  // Узкий smoothstep даёт только anti-alias на 1-2 пикселя кромки.
  float screenAlpha = smoothstep(0.0, 0.002, edgeNear);
  gl_FragColor = vec4(col, screenAlpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

/** Зеркало шейдера в JS: для точки клика на экране даёт исходную точку,
 *  куда визуально указал курсор. Чистая бочка, без scale-смещения. */
function barrelForward(x: number, y: number, w: number, h: number, k: number) {
  const ux = x / w - 0.5;
  const uy = y / h - 0.5;
  const r2 = ux * ux + uy * uy;
  const f = k * r2;
  return { x: ((ux + ux * f) + 0.5) * w, y: ((uy + uy * f) + 0.5) * h };
}

export function CRTOverlay({ stageRef, width, height, active, barrel = 0.35, chromatic = 0.003, scanline = 0.14 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Применяет инверс-патч на stage.getPointerPosition: Konva получает координаты,
  // соответствующие визуально-видимому пикселю под курсором.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !active) return;
    const orig = stage.getPointerPosition.bind(stage);
    stage.getPointerPosition = function () {
      const pos = orig();
      if (!pos) return pos;
      return barrelForward(pos.x, pos.y, width, height, barrel);
    };
    return () => {
      if (stageRef.current === stage) stage.getPointerPosition = orig;
    };
  }, [stageRef, active, width, height, barrel]);

  // WebGL set up + animation loop
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) {
      console.warn("[CRTOverlay] WebGL unavailable, postfx disabled");
      return;
    }

    const vsh = compile(gl, gl.VERTEX_SHADER, VERT);
    const fsh = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Link failed:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // полноэкранный квад
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uTex = gl.getUniformLocation(prog, "u_tex");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uBg = gl.getUniformLocation(prog, "u_bg");
    const uBarrel = gl.getUniformLocation(prog, "u_barrel");
    const uChrom = gl.getUniformLocation(prog, "u_chromatic");
    const uScan = gl.getUniformLocation(prog, "u_scanline");

    gl.uniform1i(uTex, 0);
    gl.uniform2f(uRes, width, height);
    // Цвет «прозрачных пикселей» источника = фон canvas-host для terminal темы.
    gl.uniform3f(uBg, 0x04 / 255, 0x0a / 255, 0x04 / 255);
    gl.uniform1f(uBarrel, barrel);
    gl.uniform1f(uChrom, chromatic);
    gl.uniform1f(uScan, scanline);

    gl.viewport(0, 0, width, height);
    // Прозрачность за пределами screen-curve — для DOM-bezel на CSS-clip
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // Сборщик исходного канваса: drawImage каждого Konva-Layer на offscreen-canvas
    // (toCanvas() Stage'а медленнее — дёргает toDataURL внутри).
    const composite = document.createElement("canvas");
    composite.width = width;
    composite.height = height;
    const cctx = composite.getContext("2d");

    let alive = true;
    const localStage = stage;
    function frame() {
      if (!alive) return;
      if (cctx) {
        cctx.clearRect(0, 0, width, height);
        const cs = localStage.container().querySelectorAll("canvas");
        cs.forEach((c) => cctx.drawImage(c as HTMLCanvasElement, 0, 0));
        gl!.bindTexture(gl!.TEXTURE_2D, tex);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, composite);
        gl!.clear(gl!.COLOR_BUFFER_BIT);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return () => {
      alive = false;
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
      gl.deleteShader(vsh);
      gl.deleteShader(fsh);
    };
  }, [active, width, height, barrel, chromatic, scanline, stageRef]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}
