#!/usr/bin/env python3
"""Builds ../build-guide.html (the animated 3D Music Glasses guide) the same way the Edith guide is built:
classic scripts tools/flat/{geo,steps,manual,docs,ui}.js + an ES module from tools/flat/3d/s*.js,
docs drawer HTML from tools/docs_content.html with code slots filled from the real files.
Run:  python3 tools/build_site.py"""
import html, re, shutil
from pathlib import Path

T = Path(__file__).resolve().parent
FL, ROOT = T / "flat", T.parent


def scope_css(css: str, pre: str = "#docs") -> str:          # same as Edith's tools/build_site.py
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        sel = css[i:j].strip()
        depth, k = 1, j + 1
        while depth and k < n:
            if css[k] == "{": depth += 1
            elif css[k] == "}": depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if sel.startswith("@media"):
            out.append(sel + "{" + scope_css(body, pre) + "}")
        elif sel.startswith("@keyframes") or sel.startswith("@font-face"):
            out.append(sel + "{" + body + "}")
        else:
            parts = []
            for s in sel.split(","):
                s = s.strip()
                if not s or s == "html":
                    continue
                if s in (":root", "body"):
                    parts.append(pre)
                elif s.startswith("body"):
                    parts.append(pre + s[4:])
                elif s == "*":
                    parts.append(pre + " *")
                else:
                    parts.append(pre + " " + s)
            if parts:
                out.append(",".join(parts) + "{" + body + "}")
        i = k
    return "\n".join(out)


def codeblock(title: str, text: str) -> str:                  # same markup as Edith's build_guide.codeblock
    long = text.count("\n") > 40
    return (f'<div class="codeblock{" collapsed" if long else ""}"><div class="cb-head"><span>{html.escape(title)}</span><span>'
            + (f'<button class="btn sm expand">⤢ Expand</button> ' if long else "")
            + f'<button class="btn sm copy">⧉ Copy</button></span></div><pre><code>{html.escape(text)}</code></pre></div>')


def docs_parts():
    css = (T / "docs_style.css").read_text()
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    scoped = scope_css(css) + "\n#docs{background:#080c14;min-height:100%}#docs section{max-width:1000px}"
    body = (T / "docs_content.html").read_text()
    body = re.sub(r'<div class="code-slot" data-file="([^"]+)"></div>', lambda m: codeblock(m.group(1), (ROOT / m.group(1)).read_text()), body)
    return scoped, body


def main():
    css, docs_html = docs_parts()
    head = (FL / "head.html").read_text().replace("__DOCS_CSS__", css)
    body = (FL / "body.html").read_text().replace("__DOCS_HTML__", docs_html)
    classic_js = "\n".join((FL / f).read_text() for f in ("geo.js", "steps.js", "manual.js", "docs.js", "ui.js", "music.js"))
    module_js = "\n".join(p.read_text() for p in sorted((FL / "3d").glob("s*.js")))
    watchdog = """
setTimeout(function () {
  if (!window.MG3D) {
    var l = document.getElementById("ui-loading"); if (l) l.remove();
    var n = document.getElementById("ui-noGL");
    if (n && n.hidden) { n.hidden = false; n.innerHTML = "The 3D room couldn't load (no access to unpkg.com for Three.js, or WebGL is blocked). The step cards, manual and Docs &amp; code still work."; }
  }
}, 12000);
"""
    for x in (classic_js, module_js):
        assert "</script" not in x
    out = (head + body + "\n<script>\n" + classic_js + watchdog + "</script>\n"
           + '<script type="module">\n' + module_js + "\n</script>\n</body>\n</html>\n")
    (ROOT / "build-guide.html").write_text(out, encoding="utf-8")
    shutil.copyfile(ROOT / "build-guide.html", ROOT / "index.html")
    (ROOT / ".nojekyll").write_text("")
    print("wrote build-guide.html", len(out), "bytes (+ index.html copy)")


if __name__ == "__main__":
    main()
