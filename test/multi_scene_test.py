"""Focused regression test for automatic scene rotation between waves."""

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:8777/"


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1100, "height": 900})
        errors = []
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(str(error)))

        page.goto(BASE_URL)
        page.wait_for_function("() => window.__game !== undefined", timeout=5000)
        page.keyboard.press("Enter")

        initial = page.evaluate("""() => {
            const g = window.__game;
            return {
                sceneCount: g.map.sceneCount || 0,
                sceneIndex: g.map.sceneIndex,
                sceneName: g.map.sceneName,
            };
        }""")
        assert initial == {
            "sceneCount": 6,
            "sceneIndex": 0,
            "sceneName": "經典戰場",
        }, initial

        transition = page.evaluate("""() => {
            const g = window.__game;
            g.state = STATE.PLAYING;
            g.score = 1250;
            g.player.lives = 4;
            g.player.starTier = 2;
            g.player.speedBoost = 5;
            g.bullets.push(new Bullet(100, 100, DIR.DOWN, 300, 'player', g.player));
            g.powerups.push(new Powerup('shield', 200, 200));
            g.enemies = [];
            g.spawnList = [];
            g.spawnWarns = [];
            g._checkWaveComplete();
            return {
                state: g.state,
                waveIndex: g.waveIndex,
                sceneIndex: g.map.sceneIndex,
                sceneName: g.map.sceneName,
                score: g.score,
                lives: g.player.lives,
                starTier: g.player.starTier,
                speedBoost: g.player.speedBoost,
                bullets: g.bullets.length,
                powerups: g.powerups.length,
            };
        }""")
        assert transition["state"] == "WAVE_TRANSITION", transition
        assert transition["waveIndex"] == 1, transition
        assert transition["sceneIndex"] == 1, transition
        assert transition["sceneName"] == "河川要塞", transition
        assert transition["score"] == 1550, transition
        assert transition["lives"] == 4, transition
        assert transition["starTier"] == 2, transition
        assert transition["speedBoost"] == 5, transition
        assert transition["bullets"] == 0, transition
        assert transition["powerups"] == 0, transition

        sequence = page.evaluate("""() => {
            const g = window.__game;
            return [2, 3, 4, 5].map(wave => {
                g._enterWave(wave);
                return [g.map.sceneIndex, g.map.sceneName];
            });
        }""")
        assert sequence == [
            [2, "鋼鐵迷宮"],
            [3, "沙洲運河"],
            [4, "密林突擊"],
            [5, "最終防線"],
        ], sequence
        assert errors == [], errors

        browser.close()
        print("multi-scene rotation: PASS")


if __name__ == "__main__":
    main()
