#!/usr/bin/env python3
"""Genera el PDF corporativo del Manual de Usuario de Clinic Flow 360.

Convierte ``MANUAL_DE_USUARIO.md`` a HTML con python-markdown, lo envuelve en
una plantilla propia estilo Bento (azul de marca #2563eb, portada con gradiente
y chip, H2 con filete, tablas con cabecera tintada, callouts con borde de
marca) y lo imprime a PDF A4 con Chrome headless.

Uso:
    python3 build-manual-pdf.py [--output /ruta/salida.pdf]

Por defecto escribe en ``docs/MANUAL_DE_USUARIO.pdf`` (relativo al repo
front-clinic). Funciona ejecutado desde cualquier cwd: todas las rutas se
resuelven relativas a la ubicacion de este script (``scripts/``).

Imagenes: cada ``![alt](docs/manual-assets/<id>.png)`` del manual se incrusta
si el PNG existe; si no, se renderiza un placeholder elegante con el texto de
la figura ("Vista de referencia").

PROHIBIDO reintroducir un pie de pagina con ``position: fixed``: Chrome no
reserva espacio para elementos fijos al imprimir y el pie ENMASCARA el
contenido del fondo de cada pagina (bug ya sufrido en la seccion 15 del
manual, punto "Pantalla a la vista"). La numeracion de pagina esta diferida
(T-25: requiere weasyprint/wkhtmltopdf).
"""

from __future__ import annotations

import argparse
import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import markdown
except ImportError:  # pragma: no cover
    sys.exit("Falta el modulo 'markdown' (pip install markdown==3.5.2).")

# ---------------------------------------------------------------------------
# Rutas (relativas al repo front-clinic; el script vive en scripts/)
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
MANUAL_MD = REPO_ROOT / "MANUAL_DE_USUARIO.md"
DEFAULT_OUTPUT = REPO_ROOT / "docs" / "MANUAL_DE_USUARIO.pdf"
CHROME_BIN = "google-chrome"

BRAND = "#2563eb"

# ---------------------------------------------------------------------------
# CSS de la plantilla (estilo Bento). SIN position:fixed (ver docstring).
# ---------------------------------------------------------------------------
CSS = """
@page { size: A4; margin: 16.5mm 16mm 17mm; }

* { box-sizing: border-box; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    "Noto Sans", "Liberation Sans", sans-serif;
  font-size: 13.2px;
  line-height: 1.5;
  color: #1f2937;
}

a { color: %(brand)s; text-decoration: none; }

p { margin: 8px 0; }

ul, ol { margin: 8px 0; padding-left: 26px; }
li { margin: 3px 0; }
li > ul, li > ol { margin: 4px 0; }

hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 15px 0 0;
}

/* ----- Portada ----- */
.cover {
  position: relative;
  overflow: hidden;
  height: 214mm;
  border-radius: 12px;
  padding: 52px 56px 92px;
  color: #ffffff;
  background: linear-gradient(140deg, #3d74e0 0%%, %(brand)s 38%%, #1d3f94 72%%, #14235a 100%%);
  display: flex;
  flex-direction: column;
  page-break-after: always;
}
.cover::before,
.cover::after {
  content: "";
  position: absolute;
  border-radius: 50%%;
  background: rgba(255, 255, 255, 0.055);
}
.cover::before { width: 520px; height: 520px; top: -70px; right: -150px; }
.cover::after { width: 380px; height: 380px; bottom: -130px; left: -90px; }
.cover > * { position: relative; z-index: 1; }
.cover-chip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  align-self: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 9px 19px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.cover-chip .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%%;
  background: #ffffff;
}
.cover-spacer-a { flex: 1.15; }
.cover-spacer-b { flex: 0.85; }
.cover h1 {
  margin: 0 0 22px;
  font-size: 46px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.cover .cover-sub {
  margin: 0;
  max-width: 470px;
  font-size: 16.5px;
  line-height: 1.62;
  color: #dbeafe;
}
.cover-meta {
  display: flex;
  justify-content: space-between;
  gap: 48px;
  border-top: 1px solid rgba(255, 255, 255, 0.32);
  padding-top: 15px;
  font-size: 11.5px;
  line-height: 1.55;
  color: #c7d7f5;
}
.cover-meta .meta-left { max-width: 62%%; }
.cover-meta .meta-right { max-width: 30%%; }
.cover-meta strong { color: #ffffff; }

/* ----- Indice ----- */
.toc-title {
  border-top: none;
  padding-top: 0;
  margin: 4px 0 14px;
  font-size: 21px;
  font-weight: 700;
  color: #111827;
}
.toc-cols { display: flex; gap: 52px; }
.toc-cols ol {
  flex: 1;
  margin: 0;
  padding-left: 24px;
  font-size: 12.5px;
  line-height: 1.8;
  color: #374151;
}
.toc-cols li { margin: 1px 0; }

/* ----- Encabezados ----- */
h2 {
  border-top: 1px solid #e5e7eb;
  padding-top: 13px;
  margin: 14px 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: %(brand)s;
  page-break-after: avoid;
}
h3 {
  margin: 20px 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  page-break-after: avoid;
}
h4 {
  margin: 16px 0 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: #111827;
  page-break-after: avoid;
}

/* ----- Tablas ----- */
table {
  width: 100%%;
  border-collapse: collapse;
  margin: 14px 0;
  font-size: 12.5px;
}
thead { display: table-header-group; }
th, td {
  border: 1px solid #e5ebf3;
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
}
thead th {
  background: #dbeafe;
  color: #334155;
  font-weight: 700;
}
tbody tr:nth-child(even) td { background: #f8fafc; }
tr { page-break-inside: avoid; }

/* ----- Callouts (blockquotes) ----- */
blockquote {
  margin: 13px 0;
  padding: 10px 15px;
  background: #eff6ff;
  border-left: 3px solid %(brand)s;
  border-radius: 8px;
  color: #334155;
  font-size: 12.5px;
  page-break-inside: avoid;
}
blockquote p { margin: 4px 0; }

/* ----- Figuras ----- */
.figure-placeholder {
  margin: 15px 0 8px;
  padding: 24px 44px 22px;
  border: 1.5px dashed #a8c7f8;
  border-radius: 10px;
  background: #f2f7ff;
  text-align: center;
  page-break-inside: avoid;
}
.figure-placeholder .ph-icon { line-height: 0; }
.figure-placeholder .ph-kicker {
  margin: 9px 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #3b82f6;
}
.figure-placeholder .ph-alt {
  margin: 0 auto;
  max-width: 470px;
  font-size: 11px;
  line-height: 1.55;
  color: #7c8aa0;
}
figure.shot {
  margin: 16px 0 8px;
  text-align: center;
  page-break-inside: avoid;
}
figure.shot img {
  max-width: 100%%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
}
.figure-caption {
  margin: 6px 0 14px;
  font-size: 12px;
  color: #374151;
}

/* ----- Nota final del documento ----- */
.doc-footnote {
  margin: 10px 0 0;
  font-size: 11.5px;
  color: #64748b;
  text-align: center;
}
""" % {"brand": BRAND}

PLACEHOLDER_ICON_SVG = (
    '<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">'
    '<g fill="#93c5fd">'
    '<rect x="1" y="1" width="5" height="5" rx="1"/><rect x="7.5" y="1" width="5" height="5" rx="1"/>'
    '<rect x="14" y="1" width="5" height="5" rx="1"/><rect x="20.5" y="1" width="5" height="5" rx="1"/>'
    '<rect x="1" y="7.5" width="5" height="5" rx="1"/><rect x="7.5" y="7.5" width="5" height="5" rx="1"/>'
    '<rect x="14" y="7.5" width="5" height="5" rx="1"/><rect x="20.5" y="7.5" width="5" height="5" rx="1"/>'
    '<rect x="1" y="14" width="5" height="5" rx="1"/><rect x="7.5" y="14" width="5" height="5" rx="1"/>'
    '<rect x="14" y="14" width="5" height="5" rx="1"/><rect x="20.5" y="14" width="5" height="5" rx="1"/>'
    '<rect x="1" y="20.5" width="5" height="5" rx="1"/><rect x="7.5" y="20.5" width="5" height="5" rx="1"/>'
    '<rect x="14" y="20.5" width="5" height="5" rx="1"/><rect x="20.5" y="20.5" width="5" height="5" rx="1"/>'
    "</g></svg>"
)


# ---------------------------------------------------------------------------
# Extraccion de la portada desde el markdown
# ---------------------------------------------------------------------------
def extract_cover(md_text: str) -> tuple[dict, str]:
    """Separa titulo/subtitulo/version (portada) del cuerpo del manual."""
    lines = md_text.splitlines()

    title = "Manual de Usuario"
    brand_name = "Clinic Flow 360"
    subtitle_parts: list[str] = []
    version_line = ""
    body_start = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("# ") and not title_seen(subtitle_parts, version_line):
            heading = stripped[2:].strip()
            if "—" in heading:
                title, brand_name = (p.strip() for p in heading.split("—", 1))
            else:
                title = heading
        elif stripped.startswith(">"):
            subtitle_parts.append(stripped.lstrip("> ").strip())
        elif stripped.startswith("**Versión del documento:**"):
            version_line = stripped
        elif stripped == "---":
            body_start = i + 1
            break

    subtitle = " ".join(p for p in subtitle_parts if p)
    version_text = version_line.replace("**", "")

    company_match = re.search(r"\(([^)]+)\)\s*$", version_text)
    company = company_match.group(1) if company_match else "Kodewave Solutions"

    cover = {
        "title": title,
        "brand": brand_name,
        "subtitle": subtitle,
        "version": version_text,
        "company": company,
    }
    return cover, "\n".join(lines[body_start:])


def title_seen(subtitle_parts: list, version_line: str) -> bool:
    """El H1 solo se toma antes de encontrar subtitulo o version."""
    return bool(subtitle_parts or version_line)


def build_cover_html(cover: dict) -> str:
    return (
        '<div class="cover">'
        f'<span class="cover-chip"><span class="dot"></span>{html.escape(cover["brand"])}</span>'
        '<div class="cover-spacer-a"></div>'
        f"<h1>{html.escape(cover['title'])}</h1>"
        f'<p class="cover-sub">{html.escape(cover["subtitle"])}</p>'
        '<div class="cover-spacer-b"></div>'
        '<div class="cover-meta">'
        f'<div class="meta-left">{html.escape(cover["version"])}</div>'
        f'<div class="meta-right"><strong>{html.escape(cover["brand"])}</strong>'
        f" · {html.escape(cover['company'])}</div>"
        "</div></div>"
    )


# ---------------------------------------------------------------------------
# Post-procesos del HTML generado por python-markdown
# ---------------------------------------------------------------------------
def transform_toc(html_body: str) -> str:
    """'Índice' en oscuro + lista repartida en dos columnas (1-9 / 10-19)."""
    match = re.search(
        r"<h2>Índice</h2>\s*<ol>(?P<items>.*?)</ol>",
        html_body,
        flags=re.DOTALL,
    )
    if not match:
        return html_body

    items = re.findall(r"<li>.*?</li>", match.group("items"), flags=re.DOTALL)
    split_at = (len(items) + 1) // 2  # 19 items -> 10... la referencia parte en 9
    if len(items) == 19:
        split_at = 9
    left = "\n".join(items[:split_at])
    right = "\n".join(items[split_at:])
    toc_html = (
        '<section class="toc"><h2 class="toc-title">Índice</h2>'
        '<div class="toc-cols">'
        f"<ol>{left}</ol>"
        f'<ol start="{split_at + 1}">{right}</ol>'
        "</div></section>"
    )
    return html_body[: match.start()] + toc_html + html_body[match.end():]


def transform_figures(html_body: str) -> str:
    """Incrusta cada PNG existente; si falta, renderiza un placeholder.

    En el markdown la imagen y su caption en cursiva ("*Figura N. ...*") van
    en lineas consecutivas, por lo que python-markdown las funde en el MISMO
    parrafo: ``<p><img .../>\\n<em>Figura N. ...</em></p>``.
    """

    def replace(match: re.Match) -> str:
        alt = match.group("alt")
        src = match.group("src")
        caption = match.group("cap")
        image_path = (REPO_ROOT / src).resolve()
        if image_path.is_file():
            figure = (
                '<figure class="shot">'
                f'<img src="{image_path.as_uri()}" alt="{alt}">'
                "</figure>"
            )
        else:
            figure = (
                '<div class="figure-placeholder">'
                f'<div class="ph-icon">{PLACEHOLDER_ICON_SVG}</div>'
                '<div class="ph-kicker">Vista de referencia</div>'
                f'<p class="ph-alt">{alt}</p>'
                "</div>"
            )
        if caption:
            figure += f'<p class="figure-caption"><em>{caption}</em></p>'
        return figure

    html_body = re.sub(
        r'<p><img alt="(?P<alt>[^"]*)" src="(?P<src>[^"]+)"\s*/?>'
        r"\s*(?:<em>(?P<cap>Figura\s.*?)</em>)?\s*</p>",
        replace,
        html_body,
        flags=re.DOTALL,
    )
    # Caption suelto (por si el markdown lo separa con linea en blanco).
    html_body = re.sub(
        r"<p>(<em>Figura \d+\..*?</em>)</p>",
        r'<p class="figure-caption">\1</p>',
        html_body,
    )
    # Nota final del documento (parrafo en cursiva de cierre).
    html_body = re.sub(
        r"<p>(<em>Documento elaborado.*?</em>)</p>",
        r'<p class="doc-footnote">\1</p>',
        html_body,
        flags=re.DOTALL,
    )
    return html_body


# ---------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------
def build_html() -> str:
    md_text = MANUAL_MD.read_text(encoding="utf-8")
    cover, body_md = extract_cover(md_text)

    body_html = markdown.markdown(body_md, extensions=["tables", "fenced_code"])
    body_html = transform_toc(body_html)
    body_html = transform_figures(body_html)

    return (
        "<!DOCTYPE html>\n"
        '<html lang="es"><head><meta charset="utf-8">'
        f"<title>{html.escape(cover['title'])} — {html.escape(cover['brand'])}</title>"
        f"<style>{CSS}</style></head><body>"
        f"{build_cover_html(cover)}"
        f"{body_html}"
        "</body></html>"
    )


def render_pdf(html_text: str, output: Path) -> None:
    chrome = shutil.which(CHROME_BIN)
    if not chrome:
        sys.exit(f"No se encontro '{CHROME_BIN}' en el PATH.")

    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="manual-pdf-") as tmp:
        html_file = Path(tmp) / "manual.html"
        html_file.write_text(html_text, encoding="utf-8")
        cmd = [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--virtual-time-budget=8000",
            f"--print-to-pdf={output}",
            html_file.as_uri(),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 or not output.is_file():
            sys.stderr.write(result.stdout + result.stderr)
            sys.exit(f"Chrome fallo al generar el PDF (codigo {result.returncode}).")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Genera el PDF corporativo del Manual de Usuario (Bento, A4).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Ruta del PDF de salida (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    if not MANUAL_MD.is_file():
        sys.exit(f"No existe el manual markdown: {MANUAL_MD}")

    output = args.output.resolve()
    html_text = build_html()

    missing = re.findall(r'class="figure-placeholder"', html_text)
    embedded = re.findall(r'<figure class="shot">', html_text)

    render_pdf(html_text, output)

    print(f"PDF generado: {output}")
    print(f"Figuras incrustadas: {len(embedded)} · placeholders: {len(missing)}")


if __name__ == "__main__":
    main()
