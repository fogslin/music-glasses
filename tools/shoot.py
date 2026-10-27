"""Headless render check (same approach as Edith's shoot_bt.py).
Serve the folder first:  (cd /workspace/music-glasses && python3 -m http.server 8766)
Run:  /workspace/.pwvenv/bin/python tools/shoot.py [name-filter ...]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE = "http://127.0.0.1:8766/build-guide.html"
OUT = "/workspace/music-glasses/shots/"
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        await pg.goto(BASE + "?play=0", wait_until="load")
        await pg.wait_for_function("document.body.dataset.three === 'ready'", timeout=90000)
        steps = await pg.evaluate("FLAT.STEPS.map(s => [s.id, s.start, s.dur])")
        S = {s[0]: s[1] for s in steps}
        print(json.dumps(steps))
        print(await pg.evaluate("({hw: MG3D.counts(1e3), ver: MG3D.version})"))
        shots = [("01_frames_prep", S["prep"] + 7.5, "room"), ("02_pods_clip", S["pods"] + 9.5, "room"), ("03_mcu", S["mcu"] + 9.5, "room"),
                 ("04_audio", S["audio"] + 11.5, "room"), ("05_touch", S["touch"] + 10.5, "room"), ("06_brow", S["brow"] + 9.5, "room"),
                 ("07_power", S["power"] + 10.5, "room"), ("08_close", S["close"] + 9.6, "room"), ("09_flash", S["flash"] + 6, "room"),
                 ("10_pair_music", S["pair"] + 9.0, "room"), ("11_app", S["app"] + 8.0, "room"), ("12_final", S["done"] + 2.4, "room"), ("12b_final_turn", S["done"] + 13.4, "room"),
                 ("13_layout", S["layout"] + 7.5, "room"), ("14_touch_drawing", S["touch"] + 10.5, "drawing"),
                 ("16_mic", S["mic"] + 9.6, "room")]
        if len(sys.argv) > 1: shots = [s for s in shots if any(a in s[0] for a in sys.argv[1:])]
        for name, t, view in shots:
            await pg.goto(f"{BASE}?play=0&t={t:.2f}&view={view}", wait_until="load")
            await pg.wait_for_function("document.body.dataset.three === 'ready'", timeout=90000)
            await pg.wait_for_timeout(2500)
            await pg.screenshot(path=OUT + name + ".png"); print("shot", name)
        if len(sys.argv) == 1 or "front" in sys.argv:
            # 18 · "as others see her": straight-on front view of the finished glasses at eye level, UI hidden
            await pg.goto(f"{BASE}?play=0&t={S['done'] + 1.5:.2f}&view=room", wait_until="load")
            await pg.wait_for_function("document.body.dataset.three === 'ready'", timeout=90000)
            await pg.wait_for_timeout(2000)
            await pg.add_style_tag(content="body > *:not(#scene){visibility:hidden !important}")
            await pg.evaluate("""() => { FLAT.freeCam = true; const M = window.MG3D, T = M.THREE;
              // stand-in head + long hair (as on the wearer: hair covers the temples and ears)
              const skin = new T.MeshLambertMaterial({ color: 0xe9c3a6 }), hair = new T.MeshLambertMaterial({ color: 0x4a3123 });
              const head = new T.Mesh(new T.SphereGeometry(1, 40, 30), skin); head.scale.set(0.68, 1.0, 0.78); head.position.set(0, 0.12, -0.86); M.rig.add(head);
              const hr = new T.Mesh(new T.SphereGeometry(1, 40, 30), hair); hr.scale.set(0.86, 1.12, 0.92); hr.position.set(0, 0.32, -1.02); M.rig.add(hr);
              [-1, 1].forEach(sx => { const lock = new T.Mesh(new T.CylinderGeometry(0.17, 0.24, 1.7, 20), hair); lock.position.set(sx * 0.70, -0.25, -0.95); M.rig.add(lock); });
              M.rig.updateMatrixWorld(true); const c = M.rig.localToWorld(new T.Vector3(0, 0.33, -0.2));
              M.camera.position.set(c.x, c.y + 0.05, c.z + 15.0); M.camera.lookAt(c); M.camera.fov = 7.2; M.camera.near = 1; M.camera.far = 60; M.camera.updateProjectionMatrix(); }""")
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=OUT + "18_front_inconspicuous.png"); print("shot front")
        if len(sys.argv) == 1 or "find" in sys.argv:
            await pg.goto(BASE + "?play=0&docs=find", wait_until="load"); await pg.wait_for_timeout(2500)
            await pg.screenshot(path=OUT + "17_find.png"); print("shot find")
        if len(sys.argv) == 1 or "docs" in sys.argv:
            await pg.goto(BASE + "?play=0&docs=wiring", wait_until="load"); await pg.wait_for_timeout(2500)
            await pg.screenshot(path=OUT + "docs_wiring.png"); print("shot docs")
            await pg.goto(BASE + "?play=0&t=%.2f&manual=1" % (S["audio"] + 1), wait_until="load"); await pg.wait_for_timeout(2500)
            await pg.screenshot(path=OUT + "manual_audio.png"); print("shot manual")
        await b.close()
    print("ERRORS:", len(errs)); [print(e) for e in errs[:40]]
asyncio.run(main())
