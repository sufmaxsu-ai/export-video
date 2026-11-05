import { useEffect, useRef, useState } from "react";

// Le moteur du film est en JavaScript classique dans public/web/film/ (copié tel quel
// dans dist/web/). On le charge ici pour utiliser EXACTEMENT les mêmes dessins et la
// même timeline que preview.html et que l'export Chromium → FFmpeg.
const BASE = "web/";
const SCRIPTS = ["film/core.js", "film/characters.js", "film/world.js", "film/story.js", "film/player.js"];

declare global {
  interface Window {
    GFPlayer?: { create: (root: HTMLElement, opts?: Record<string, unknown>) => { pause: () => void } };
    GF?: unknown;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-gf="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.dataset.gf = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(src));
    document.body.appendChild(s);
  });
}

const SPECS: [string, string][] = [
  ["Format", "Vertical 9:16 · 1080 × 1920"],
  ["Durée", "8,00 s · 192 images"],
  ["Cadence", "24 i/s constants"],
  ["Dessins uniques", "108 (en deux ; en un pour la course)"],
  ["Vidéo", "H.264 · yuv420p · faststart"],
  ["Audio", "AAC stéréo 48 kHz · bruitages synthétisés, sans voix"],
  ["Moteur", "JavaScript + Canvas 2D, sans dépendance"],
  ["Rendu", "Chromium headless (Playwright) → PNG → FFmpeg"],
];

const BEATS = [
  "Mamie fouette la pâte en fredonnant",
  "Elle verse la pâte, enfourne, ferme la porte d’un coup de pantoufle",
  "L’horloge tourne, le gâteau gonfle, ding !",
  "Elle le sort, ferme du talon, le pose, ajoute une fraise",
  "« À table ! » — Léo lâche son ballon, Lina saute de la balançoire",
  "Dos tourné… Lina goûte la crème du bout du doigt, Léo pouffe",
  "Une part pour chacun, pieds qui se balancent, le chat se réveille",
];

export default function App() {
  const playerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mp4Missing, setMp4Missing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let inst: { pause: () => void } | undefined;
    (async () => {
      try {
        for (const s of SCRIPTS) await loadScript(BASE + s);
        if (cancelled || !playerRef.current || !window.GFPlayer) return;
        if (playerRef.current.childElementCount) return; // StrictMode : déjà monté
        inst = window.GFPlayer.create(playerRef.current, { audio: BASE + "soundtrack.m4a", autoplay: true });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      inst?.pause();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7ecd6] text-[#3a281f]">
      <link rel="stylesheet" href={BASE + "film/player.css"} />
      <a href="#live" className="absolute -left-[999px] top-2 rounded-lg border-2 border-[#3a281f] bg-[#fffaf0] px-3 py-2 focus:left-2">
        Aller à la prévisualisation
      </a>
      <header className="px-5 pb-2 pt-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#c0392b]">Film dessiné image par image</p>
        <h1 className="mb-3 text-balance text-4xl font-extrabold leading-tight sm:text-5xl">Mamie &amp; le gâteau</h1>
        <p className="mx-auto max-w-2xl text-pretty">
          8&nbsp;secondes en vertical, chaque image dessinée par JavaScript sur Canvas&nbsp;2D&nbsp;: Mamie prépare le goûter, appelle
          ses petits-enfants qui jouaient au jardin… et quelqu’un goûte la crème quand elle a le dos tourné.
        </p>
      </header>

      <main id="main" className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 pt-4 lg:grid-cols-2">
        <section id="live" aria-labelledby="h-live" className="min-w-0 scroll-mt-4 rounded-3xl border-[3px] border-[#3a281f] bg-[#fffaf0] p-4 shadow-[6px_6px_0_rgba(58,40,31,0.15)]">
          <h2 id="h-live" className="mb-3 text-balance text-xl font-bold">Prévisualisation en direct (JavaScript, sans MP4)</h2>
          {status === "loading" && <p className="py-20 text-center">Chargement du moteur de dessin…</p>}
          {/* conteneur réservé au lecteur impératif : React n'y gère aucun enfant */}
          <div ref={playerRef} aria-busy={status === "loading"} />
          {status === "error" && (
            <p role="alert" className="rounded-xl border-2 border-dashed border-[#3a281f] p-3">
              Impossible de charger le moteur (web/film/*.js).
            </p>
          )}
          <p className="mt-3 text-sm">
            Même fonction <code>drawFrame()</code> et même timeline que l’export vidéo. Espace&nbsp;: lecture/pause · ←/→&nbsp;: image par image.{" "}
            <a className="font-semibold underline decoration-2 underline-offset-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2f7dd1]" href={BASE + "preview.html"}>
              Plein écran
            </a>{" "}
            ·{" "}
            <a className="font-semibold underline decoration-2 underline-offset-2" href={BASE + "index.html"}>
              Page autonome
            </a>
          </p>
        </section>

        <div className="grid min-w-0 gap-6">
          <section aria-labelledby="h-mp4" className="rounded-3xl border-[3px] border-[#3a281f] bg-[#fffaf0] p-4 shadow-[6px_6px_0_rgba(58,40,31,0.15)]">
            <h2 id="h-mp4" className="mb-3 text-xl font-bold">Vidéo exportée (MP4)</h2>
            {!mp4Missing ? (
              <video
                className="mx-auto mb-3 block aspect-[9/16] w-full max-w-[300px] rounded-2xl border-[3px] border-[#3a281f] bg-black"
                controls
                playsInline
                preload="metadata"
                poster={BASE + "poster.jpg"}
              >
                <source src={BASE + "mamie-gateau.mp4"} type="video/mp4" />
                <source src={BASE + "mamie-gateau.webm"} type="video/webm" onError={() => setMp4Missing(true)} />
              </video>
            ) : (
              <p className="rounded-xl border-2 border-dashed border-[#3a281f] p-3">Vidéo absente ou illisible dans ce navigateur — la prévisualisation JavaScript fonctionne quand même.</p>
            )}
            <p className="text-center">
              <a
                href={BASE + "mamie-gateau.mp4"}
                download="mamie-gateau.mp4"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#3a281f] bg-[#c0392b] px-5 py-2.5 font-bold text-[#fffaf0] transition-colors hover:bg-[#a93226] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2f7dd1]"
              >
                <span aria-hidden="true">⬇</span> Télécharger le MP4
              </a>
            </p>
          </section>

          <section aria-labelledby="h-spec" className="rounded-3xl border-[3px] border-[#3a281f] bg-[#fffaf0] p-4 shadow-[6px_6px_0_rgba(58,40,31,0.15)]">
            <h2 id="h-spec" className="mb-2 text-xl font-bold">Caractéristiques</h2>
            <table className="w-full border-collapse text-sm tabular-nums">
              <tbody>
                {SPECS.map(([k, v]) => (
                  <tr key={k} className="border-b border-dashed border-[#3a281f]/30">
                    <th scope="row" className="w-2/5 py-1.5 pr-2 text-left align-top font-semibold">{k}</th>
                    <td className="py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section aria-labelledby="h-story" className="rounded-3xl border-[3px] border-[#3a281f] bg-[#fffaf0] p-4 shadow-[6px_6px_0_rgba(58,40,31,0.15)] lg:col-span-2">
          <h2 id="h-story" className="mb-2 text-xl font-bold">L’histoire, temps par temps</h2>
          <ol className="grid list-decimal gap-1 pl-6 sm:grid-cols-2">
            {BEATS.map((b) => (
              <li key={b} className="text-pretty">{b}</li>
            ))}
          </ol>
          <h3 className="mb-1 mt-4 font-bold">Exporter vous-même</h3>
          <pre className="overflow-x-auto rounded-xl bg-[#2c211b] p-3 text-[13px] leading-relaxed text-[#fbe9cf]">
            <code>{`./scripts/export-video.sh web/preview.html final/animation.mp4
./scripts/export-video.sh web/preview.html final/animation.webm
./scripts/export-video.sh render/frames final/depuis-images.mp4 --fps 24
ffmpeg -framerate 24 -i frames/%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart animation.mp4`}</code>
          </pre>
        </section>
      </main>
      <footer className="px-4 pb-8 text-center text-sm opacity-80">Dessiné image par image, au code, avec tendresse.</footer>
    </div>
  );
}
