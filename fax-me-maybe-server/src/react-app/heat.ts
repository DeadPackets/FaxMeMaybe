// Form page only: a 1-bit dither desk that heats under the pointer, and a WebGL burn on the ticket preview. Never import from the print route.

const CELL = 4;
const FC = 4;
const HEAT = 9;
const COOL = 0.13;
const BURN_RATE = 2.4;
const HEAL_RATE = 0.385;
const M = 96;
const FLAME_D =
	"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z";
const BAYER8 = [
	0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59,
	27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);
const MIN_INK = BAYER8.reduce((a, b) => Math.min(a, b));

const rgba = (r: number, g: number, b: number, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SCORCH = rgba(62, 12, 6);

function cssColor(color: string) {
	const ctx = document.createElement("canvas").getContext("2d")!;
	// A browser that cannot parse the colour keeps the fallback instead of black
	ctx.fillStyle = "#be260b";
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return rgba(r, g, b);
}

function flameMask() {
	const c = document.createElement("canvas");
	c.width = c.height = M;
	const ctx = c.getContext("2d", { willReadFrequently: true })!;
	ctx.filter = "blur(3px)";
	ctx.scale(4, 4);
	ctx.fillStyle = "#fff";
	ctx.fill(new Path2D(FLAME_D));
	const d = ctx.getImageData(0, 0, M, M).data;
	const mask = new Float32Array(M * M);
	for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] / 255;
	return mask;
}

const BURN_VS = "attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}";
const BURN_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_field, u_bg;
uniform vec2 u_res, u_fscale;
uniform vec4 u_bgMap;
uniform float u_time, u_aspect;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.07 + vec2(11.3, 7.9); a *= 0.5; } return v; }
void main() {
  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);
  vec2 f = texture2D(u_field, uv * u_fscale).rg;
  float T = f.r, D = f.g;
  if (D < 0.004 && T < 0.004) { gl_FragColor = vec4(0.0); return; }
  vec2 p = vec2(uv.x * u_aspect, uv.y) * 6.0;
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  float n = fbm(p * 1.7 + 2.5 * q);
  float fib = noise(vec2(uv.x * u_aspect * 160.0, uv.y * 22.0));
  float edge = fbm(p * 5.0 + 3.0 * q) - 0.5;
  float e = D * (0.25 + 1.5 * smoothstep(0.22, 0.78, n)) + D * (edge * 0.22 + (fib - 0.5) * 0.05);
  float yel = smoothstep(0.04, 0.3, e), sco = smoothstep(0.26, 0.52, e), chr = smoothstep(0.5, 0.66, e), hole = smoothstep(0.84, 0.87, e);
  vec3 col = vec3(0.84, 0.70, 0.40);
  float a = yel * 0.45;
  col = mix(col, vec3(0.42, 0.22, 0.08), sco); a = mix(a, 0.82, sco);
  col = mix(col, vec3(0.11, 0.065, 0.04) * (0.55 + 0.9 * fib * n), chr); a = mix(a, 0.97, chr);
  col = mix(col, texture2D(u_bg, u_bgMap.xy + uv * u_bgMap.zw).rgb, hole); a = mix(a, 1.0, hole);
  float front = 1.0 - smoothstep(0.0, 0.035, abs(e - 0.6));
  float rim = 1.0 - smoothstep(0.0, 0.025, abs(e - 0.855));
  float flick = 0.7 + 0.3 * noise(p * 5.0 + vec2(u_time * 3.1, -u_time * 2.3));
  float glow = max(front, rim) * smoothstep(0.05, 0.7, T) * flick;
  vec3 ember = mix(vec3(1.0, 0.32, 0.04), vec3(1.0, 0.82, 0.32), glow);
  vec3 rgb = col * a + ember * glow * 1.2 + vec3(1.0, 0.45, 0.1) * T * 0.04 * (1.0 - hole);
  gl_FragColor = vec4(min(rgb, vec3(1.0)), clamp(a + glow * 0.5, 0.0, 1.0));
}`;

function makeBurn(canvas: HTMLCanvasElement) {
	const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
	if (!gl) return null;
	const prog = gl.createProgram()!;
	for (const [type, src] of [[gl.VERTEX_SHADER, BURN_VS], [gl.FRAGMENT_SHADER, BURN_FS]] as const) {
		const s = gl.createShader(type)!;
		gl.shaderSource(s, src);
		gl.compileShader(s);
		gl.attachShader(prog, s);
	}
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.warn("Burn effect off:", gl.getProgramInfoLog(prog));
		return null;
	}
	gl.useProgram(prog);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const pos = gl.getAttribLocation(prog, "a_pos");
	gl.enableVertexAttribArray(pos);
	gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
	const texture = (unit: number, filter: number) => {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		let size = "";
		// texSubImage2D reuses the texture storage; texImage2D only when the size changes
		return (w: number, h: number, data: Uint8Array) => {
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, t);
			if (size === `${w}x${h}`) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
			else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
			size = `${w}x${h}`;
		};
	};
	const uploadField = texture(0, gl.LINEAR), uploadBg = texture(1, gl.NEAREST);
	const U = (n: string) => gl.getUniformLocation(prog, n);
	gl.uniform1i(U("u_field"), 0);
	gl.uniform1i(U("u_bg"), 1);
	const uRes = U("u_res"), uFScale = U("u_fscale"), uBgMap = U("u_bgMap"), uTime = U("u_time"), uAspect = U("u_aspect");
	return {
		gl,
		uploadBg,
		draw(field: Uint8Array, fw: number, fh: number, fscale: number[], bgMap: number[], time: number) {
			gl.viewport(0, 0, canvas.width, canvas.height);
			uploadField(fw, fh, field);
			gl.uniform2f(uRes, canvas.width, canvas.height);
			gl.uniform2fv(uFScale, fscale);
			gl.uniform4fv(uBgMap, bgMap);
			gl.uniform1f(uTime, time);
			gl.uniform1f(uAspect, canvas.width / canvas.height);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		clear() {
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		},
	};
}

export interface HeatOptions {
	page: HTMLElement;
	canvas: HTMLCanvasElement;
	hero: HTMLElement;
	anchor: HTMLElement;
	feed: HTMLElement;
	burnCanvas: HTMLCanvasElement;
	importance: () => number;
}

export function startHeat({ page, canvas, hero, anchor, feed, burnCanvas, importance }: HeatOptions) {
	const ctx = canvas.getContext("2d")!;
	const mq = matchMedia("(prefers-reduced-motion: reduce)");
	const GROUND = cssColor(getComputedStyle(page).getPropertyValue("--ground").trim());
	const mask = flameMask();
	let reduced = mq.matches;
	let W = 0, H = 0, trail = new Float32Array(0), rowHeat = new Uint8Array(0), rowInk = new Uint8Array(0);
	let img: ImageData | null = null, px = new Uint32Array(0);
	let raf = 0, last = 0, hotUntil = 0, flameSz = 0, flameGap = 0, flameSeen = false;
	let sweep: { y: number; end: number; v: number } | null = null, lp: { x: number; y: number } | null = null;

	let burn = makeBurn(burnCanvas);
	let fw = 0, fh = 0, T = new Float32Array(0), Dm = new Float32Array(0), field = new Uint8Array(0);
	let bgBuf = new Uint32Array(0), bgW = 0, bgH = 0, bgMap = [0, 0, 1, 1];
	let lastF = 0, src: number[] | null = null, burnLast: number[] | null = null, feedVisible = true;

	function resize() {
		const r = page.getBoundingClientRect();
		W = canvas.width = Math.max(1, Math.ceil(r.width / CELL));
		H = canvas.height = Math.max(1, Math.ceil(r.height / CELL));
		trail = new Float32Array(W * H);
		rowHeat = new Uint8Array(H);
		rowInk = new Uint8Array(H);
		img = ctx.createImageData(W, H);
		px = new Uint32Array(img.data.buffer).fill(GROUND);
	}

	function measureFeed() {
		const r = feed.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
		burnCanvas.width = Math.round(r.width * dpr);
		burnCanvas.height = Math.round(r.height * dpr);
		const nw = Math.ceil(r.width / FC) + 1, nh = Math.ceil(r.height / FC) + 1;
		if (nw === fw && nh === fh) return;
		fw = nw;
		fh = nh;
		T = new Float32Array(fw * fh);
		Dm = new Float32Array(fw * fh);
		field = new Uint8Array(fw * fh * 4);
	}

	function flameTarget() {
		const pr = page.getBoundingClientRect(), hr = hero.getBoundingClientRect();
		const base = Math.min(W * 0.42, (hr.height / CELL) * 1.5), size = base * [0.55, 0.75, 1, 1.3, 1.7][importance() - 1];
		// Wide screens: the fire rises from behind the ticket preview. Phones: from behind the hero.
		if (W * CELL >= 960) {
			const ar = anchor.getBoundingClientRect();
			return { size, cx: (ar.left + ar.width / 2 - pr.left) / CELL, bottom: (ar.top - pr.top) / CELL + 14 };
		}
		return { size, cx: W * 0.74, bottom: (hr.bottom - pr.top) / CELL + 10 };
	}

	function heat(cx: number, cy: number, r: number, a: number) {
		const x0 = Math.max(0, Math.floor(cx - r * 2)), x1 = Math.min(W - 1, Math.ceil(cx + r * 2));
		const y0 = Math.max(0, Math.floor(cy - r * 2)), y1 = Math.min(H - 1, Math.ceil(cy + r * 2));
		for (let y = y0; y <= y1; y++) {
			rowHeat[y] = 1;
			for (let x = x0; x <= x1; x++) {
				const i = y * W + x;
				trail[i] = Math.min(1.25, trail[i] + a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (r * r)));
			}
		}
	}

	// Draws only rows that are hot, inside the flame, or still showing ink; returns the hottest cell so the loop knows when to stop
	function draw(now: number, all: boolean) {
		const dt = Math.min(0.05, (now - last) / 1000 || 0);
		last = now;
		if (!img) return 0;
		const pr = page.getBoundingClientRect();
		const y0 = all ? 0 : clamp(Math.floor(-pr.top / CELL) - 2, 0, H), y1 = all ? H : clamp(Math.ceil((innerHeight - pr.top) / CELL) + 2, 0, H);
		const ft = flameTarget();
		flameSz = reduced || !flameSz ? ft.size : flameSz + (ft.size - flameSz) * Math.min(1, dt * 5);
		flameGap = Math.abs(ft.size - flameSz);
		const sz = flameSz, fx0 = ft.cx - sz / 2, fy0 = ft.bottom - sz;
		flameSeen = fy0 + sz > y0 && fy0 < y1;
		if (sweep) {
			sweep.y += sweep.v * dt;
			for (let y = Math.floor(sweep.y) - 2; y <= Math.floor(sweep.y) + 1; y++) {
				if (y < 0 || y >= H) continue;
				trail.fill(1.3, y * W, y * W + W);
				rowHeat[y] = 1;
			}
			if (sweep.y > sweep.end) sweep = null;
		}
		// The trail decay was tuned at 120 Hz; scaling by dt keeps it the same on 60 Hz screens
		const decay = 0.955 ** (dt * 120), t = reduced ? 0 : now * 0.006;
		let hot = 0, top = H, bottom = -1;
		for (let y = y0; y < y1; y++) {
			const inF = y >= fy0 && y < fy0 + sz;
			if (!all && !inF && !rowHeat[y] && !rowInk[y]) continue;
			const row = y * W, by = (y & 7) * 8, v = ((y - fy0) / sz) * M, vi = v | 0;
			const wob = reduced ? 0 : Math.sin(v * 0.16 + t) * 2.4 * (1 - v / M), hotness = (0.55 + (0.6 * v) / M) * (0.92 + 0.08 * Math.sin(t * 1.7 - v * 0.3));
			let rowMax = 0, ink = 0;
			for (let x = 0; x < W; x++) {
				const i = row + x;
				let h = (trail[i] *= decay);
				if (h > rowMax) rowMax = h;
				if (inF && x >= fx0 && x < fx0 + sz) {
					const ui = (((x - fx0) / sz) * M + wob) | 0;
					if (ui >= 0 && ui < M && vi >= 0 && vi < M) h += mask[vi * M + ui] * hotness;
				}
				const on = h > BAYER8[by + (x & 7)];
				px[i] = on ? SCORCH : GROUND;
				ink |= +on;
			}
			if (rowMax < MIN_INK) {
				trail.fill(0, row, row + W);
				rowHeat[y] = 0;
			}
			rowInk[y] = ink;
			if (rowMax > hot) hot = rowMax;
			top = Math.min(top, y);
			bottom = y;
		}
		if (bottom >= top) ctx.putImageData(img, 0, 0, 0, top, W, bottom - top + 1);
		return hot;
	}

	function splat(cx: number, cy: number, dose: number) {
		const r = 5.46, x0 = Math.max(0, Math.floor(cx - 2 * r)), x1 = Math.min(fw - 1, Math.ceil(cx + 2 * r));
		const y0 = Math.max(0, Math.floor(cy - 2 * r)), y1 = Math.min(fh - 1, Math.ceil(cy + 2 * r));
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const i = y * fw + x;
				T[i] = Math.min(1, T[i] + dose * Math.exp(-((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) / (r * r)));
			}
	}

	// Temperature cools in about 0.4 s and feeds damage: 0.5 s on one spot burns through, then it heals in about 3 s
	function simulate(dt: number) {
		const kT = Math.exp(-dt / COOL);
		let mT = 0, mD = 0;
		for (let i = 0; i < T.length; i++) {
			const t0 = T[i];
			if (t0 === 0 && Dm[i] === 0) continue;
			let t = t0 * kT, d = Math.min(1, Dm[i] + t0 * BURN_RATE * dt);
			if (t < 0.004) t = 0;
			if (t < 0.25) d = Math.max(0, d - dt * HEAL_RATE * (1 - t * 4));
			T[i] = t;
			Dm[i] = d;
			if (t > mT) mT = t;
			if (d > mD) mD = d;
			field[i * 4] = (t * 255 + 0.5) | 0;
			field[i * 4 + 1] = (d * 255 + 0.5) | 0;
		}
		return [mT, mD];
	}

	// Copies the desk's dither under the ticket, so burnt-through holes show the same background
	function bgRegion(wr: DOMRect) {
		const pr = page.getBoundingClientRect();
		const fx = (wr.left - pr.left) / CELL, fy = (wr.top - pr.top) / CELL, x0 = Math.floor(fx), y0 = Math.floor(fy);
		const cw = Math.ceil(wr.width / CELL) + 2, ch = Math.ceil(wr.height / CELL) + 2;
		if (bgW !== cw || bgH !== ch) {
			bgBuf = new Uint32Array(cw * ch);
			bgW = cw;
			bgH = ch;
		}
		for (let y = 0; y < ch; y++)
			for (let x = 0; x < cw; x++) {
				const sx = x0 + x, sy = y0 + y;
				bgBuf[y * cw + x] = sx >= 0 && sy >= 0 && sx < W && sy < H ? px[sy * W + sx] : GROUND;
			}
		burn!.uploadBg(bgW, bgH, new Uint8Array(bgBuf.buffer));
		bgMap = [(fx - x0) / cw, (fy - y0) / ch, wr.width / CELL / cw, wr.height / CELL / ch];
	}

	function burnFrame(now: number) {
		if (!burn || !feedVisible || !fw) return false;
		const dt = lastF ? Math.min(0.05, (now - lastF) / 1000) : 1 / 60;
		lastF = now;
		if (src) {
			// Each frame's heat spreads along the path since the last frame: strokes leave a trail, dwelling burns deepest
			const [x0, y0] = burnLast || src, dx = src[0] - x0, dy = src[1] - y0, n = Math.max(1, Math.min(60, Math.ceil(Math.hypot(dx, dy) / 1.2)));
			for (let k = 1; k <= n; k++) splat(x0 + (dx * k) / n, y0 + (dy * k) / n, (HEAT * dt) / n);
		}
		burnLast = src;
		const [mT, mD] = simulate(dt);
		if (!mT && !mD) {
			burn.clear();
			burnCanvas.style.visibility = "hidden";
			lastF = 0;
			burnLast = null;
			return false;
		}
		burnCanvas.style.visibility = "visible";
		const wr = feed.getBoundingClientRect();
		// Holes need damage above about 0.44, so the background copy is skipped until then
		if (mD > 0.44) bgRegion(wr);
		burn.draw(field, fw, fh, [wr.width / FC / fw, wr.height / FC / fh], bgMap, now / 1000);
		return true;
	}

	function frame(now: number) {
		const bgHot = draw(now, false);
		const burning = burnFrame(now);
		const busy = now < hotUntil || bgHot > 0.02 || burning || !!sweep || flameGap > 0.5 || flameSeen;
		raf = !reduced && !document.hidden && busy ? requestAnimationFrame(frame) : 0;
	}

	function wake(ms = 400) {
		if (reduced) {
			draw(performance.now(), true);
			return;
		}
		hotUntil = Math.max(hotUntil, performance.now() + ms);
		if (!raf && !document.hidden) {
			last = performance.now();
			raf = requestAnimationFrame(frame);
		}
	}

	function clearBurn() {
		T.fill(0);
		Dm.fill(0);
		field.fill(0);
		src = burnLast = null;
		burn?.clear();
		burnCanvas.style.visibility = "hidden";
	}

	function onMove(e: PointerEvent) {
		if (reduced) return;
		const pr = page.getBoundingClientRect(), x = (e.clientX - pr.left) / CELL, y = (e.clientY - pr.top) / CELL;
		if (e.type === "pointermove") {
			const d = lp ? Math.hypot(x - lp.x, y - lp.y) : 0;
			lp = { x, y };
			heat(x, y, 7, Math.min(0.5, 0.06 + d * 0.05));
		}
		// Touch burns only while the finger is down, so a scroll swipe does not scorch the ticket
		if (burn && !(e.pointerType === "touch" && e.type === "pointermove" && !e.buttons)) {
			const wr = feed.getBoundingClientRect(), fx = e.clientX - wr.left, fy = e.clientY - wr.top;
			src = fx < -30 || fy < -30 || fx > wr.width + 30 || fy > wr.height + 30 ? null : [fx / FC, fy / FC];
			if (!src) burnLast = null;
		}
		wake();
	}
	function onLeave() {
		lp = null;
		src = burnLast = null;
	}
	const onScroll = () => wake(100);
	const onVisibility = () => {
		if (document.hidden) {
			cancelAnimationFrame(raf);
			raf = 0;
		} else wake();
	};
	const onMotionPref = () => {
		reduced = mq.matches;
		if (reduced) {
			cancelAnimationFrame(raf);
			raf = 0;
			trail.fill(0);
			clearBurn();
		}
		wake();
	};
	const onContextLost = () => {
		burn = null;
		burnCanvas.style.visibility = "hidden";
	};

	const pageObserver = new ResizeObserver(() => {
		resize();
		wake();
	});
	const feedObserver = new ResizeObserver(() => measureFeed());
	const feedIo = new IntersectionObserver(([e]) => {
		feedVisible = e.isIntersecting;
		if (feedVisible) wake();
	});
	pageObserver.observe(page);
	feedObserver.observe(feed);
	feedIo.observe(feed);
	page.addEventListener("pointermove", onMove);
	page.addEventListener("pointerdown", onMove);
	page.addEventListener("pointerleave", onLeave);
	addEventListener("scroll", onScroll, { passive: true });
	document.addEventListener("visibilitychange", onVisibility);
	mq.addEventListener("change", onMotionPref);
	burnCanvas.addEventListener("webglcontextlost", onContextLost);
	resize();
	measureFeed();
	wake(1500);

	return {
		// Splashes heat on the ticket's top edge when the form changes; importance changes also resize the fire
		touch(big: boolean) {
			if (reduced) return wake();
			const pr = page.getBoundingClientRect(), ar = feed.getBoundingClientRect();
			heat((ar.left - pr.left + ar.width * Math.random()) / CELL, (ar.top - pr.top) / CELL - 2, 5, 0.4);
			wake(big ? 1200 : 400);
		},
		// A print head sweeps down the visible page
		sweep() {
			if (reduced) return;
			const pr = page.getBoundingClientRect(), top = -pr.top / CELL, end = (innerHeight - pr.top) / CELL;
			sweep = { y: top, end, v: (end - top) / 1.2 };
			wake(1400);
		},
		clearBurn,
		destroy() {
			cancelAnimationFrame(raf);
			pageObserver.disconnect();
			feedObserver.disconnect();
			feedIo.disconnect();
			page.removeEventListener("pointermove", onMove);
			page.removeEventListener("pointerdown", onMove);
			page.removeEventListener("pointerleave", onLeave);
			removeEventListener("scroll", onScroll);
			document.removeEventListener("visibilitychange", onVisibility);
			mq.removeEventListener("change", onMotionPref);
			burnCanvas.removeEventListener("webglcontextlost", onContextLost);
		},
	};
}

export type HeatEngine = ReturnType<typeof startHeat>;
