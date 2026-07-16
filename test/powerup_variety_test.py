"""Focused regression test for powerup variety: freeze / gun / coin + all icons render."""

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:8777/"
ALL_TYPES = ["life", "speed", "shield", "power", "shovel", "bomb", "star", "freeze", "gun", "coin"]


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
        page.wait_for_function("() => window.__game.state !== 'START'", timeout=5000)

        # 1. 全部 10 種寶物圖示都能渲染（含三種新寶物），且掉落表齊全
        icons = page.evaluate("""(types) => {
            const g = window.__game;
            g.powerups = types.map((t, i) => new Powerup(t, 100 + i * 60, 300));
            g.render();
            const dropTypes = POWERUP_DROPS.map(([t]) => t);
            return { drawn: g.powerups.length, dropTypes };
        }""", ALL_TYPES)
        assert icons["drawn"] == len(ALL_TYPES), icons
        assert sorted(icons["dropTypes"]) == sorted(ALL_TYPES), icons

        # 2. 冰凍：敵人原地凍結（位置不變、不開火），計時器倒數
        page.evaluate("""() => {
            const g = window.__game;
            g.state = STATE.PLAYING;
            g.spawnList = []; g.spawnWarns = []; g.bullets = []; g.powerups = [];
            g.enemies = [new Enemy('fast', 480, 240)];
            g._applyPowerup({ type: 'freeze', x: 400, y: 400 });
            window.__frozenPos = [g.enemies[0].x, g.enemies[0].y];
        }""")
        page.wait_for_timeout(600)
        frozen = page.evaluate("""() => {
            const g = window.__game;
            return {
                timer: g.freezeTimer,
                moved: g.enemies.length === 0
                    || g.enemies[0].x !== window.__frozenPos[0]
                    || g.enemies[0].y !== window.__frozenPos[1],
                enemyBullets: g.bullets.filter(b => b.owner === 'enemy').length,
            };
        }""")
        assert 0 < frozen["timer"] < 8, frozen
        assert frozen["moved"] is False, frozen
        assert frozen["enemyBullets"] == 0, frozen

        # 3. 解凍後敵人恢復行動
        thawed = page.evaluate("""() => {
            const g = window.__game;
            g.freezeTimer = 0;
            return true;
        }""")
        page.wait_for_timeout(600)
        moved = page.evaluate("""() => {
            const g = window.__game;
            return g.enemies.length === 0
                || g.enemies[0].x !== window.__frozenPos[0]
                || g.enemies[0].y !== window.__frozenPos[1];
        }""")
        assert moved is True, "enemy did not resume after thaw"

        # 4. 機關槍：計時器啟動、射擊冷卻縮短
        gun = page.evaluate("""() => {
            const g = window.__game;
            g._applyPowerup({ type: 'gun', x: 400, y: 400 });
            const base = CONST.PLAYER.cooldown;
            return { timer: g.player.gunTimer, base, mult: CONST.POWERUP.gunCooldownMult };
        }""")
        assert gun["timer"] == 8, gun
        assert gun["mult"] < 1, gun

        # 5. 金幣：即時 +500 分
        coin = page.evaluate("""() => {
            const g = window.__game;
            const before = g.score;
            g._applyPowerup({ type: 'coin', x: 400, y: 400 });
            return g.score - before;
        }""")
        assert coin == 500, coin

        # 6. 玩家死亡重置機關槍 buff
        reset = page.evaluate("""() => {
            const g = window.__game;
            g.player.gunTimer = 5;
            g.player.respawn();
            return g.player.gunTimer;
        }""")
        assert reset == 0, reset

        assert errors == [], errors
        browser.close()
        print("powerup variety: PASS")


if __name__ == "__main__":
    main()
