from pathlib import Path
from tempfile import TemporaryDirectory
import re
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
GAMER_HTML = """
<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>測試作品頁</title></head><body><main>
<h1>果然我的青春戀愛喜劇搞錯了。完 [10]</h1>
<dl><dt>首播日期</dt><dd>2020/07/09</dd></dl>
</main></body></html>
"""
DATABASE_HTML = """
<!doctype html><html><head><meta charset="utf-8"><title>MAL fixture</title></head>
<body><main><h1>My Teen Romantic Comedy SNAFU Climax!</h1></main></body></html>
"""


def panel(page):
    return page.locator("#anibridge-extension-root").locator(".panel")


def main() -> None:
    with TemporaryDirectory() as profile:
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                profile,
                channel="chromium",
                headless=True,
                args=[
                    f"--disable-extensions-except={ROOT}",
                    f"--load-extension={ROOT}",
                ],
            )
            workers = context.service_workers
            if not workers:
                workers = [context.wait_for_event("serviceworker", timeout=10_000)]
            worker = workers[0]
            assert worker.evaluate("chrome.runtime.getManifest().manifest_version") == 3
            assert worker.evaluate("typeof matchAnime") == "function"
            assert worker.evaluate("typeof OpenCC.Converter") == "function"
            extension_id = worker.url.split("/")[2]

            context.route(
                "https://ani.gamer.com.tw/animeVideo.php*",
                lambda route: route.fulfill(status=200, content_type="text/html", body=GAMER_HTML),
            )
            context.route(
                "https://myanimelist.net/anime/39547*",
                lambda route: route.fulfill(status=200, content_type="text/html", body=DATABASE_HTML),
            )

            page = context.new_page()
            page.goto("https://ani.gamer.com.tw/animeVideo.php?sn=49944")
            panel(page).get_by_role("button", name="展開 AniBridge").click()
            panel(page).get_by_text("MyAnimeList", exact=False).first.wait_for(timeout=20_000)
            assert panel(page).get_by_text("日本語", exact=True).count() == 1
            mal_link = panel(page).get_by_role("link", name=re.compile(r"^MyAnimeList"))
            assert "39547" in mal_link.get_attribute("href")
            panel(page).get_by_text("作品官方資訊", exact=True).wait_for(timeout=10_000)

            page.goto("https://myanimelist.net/anime/39547/test")
            panel(page).get_by_text("多語標題", exact=False).wait_for(timeout=10_000)
            assert panel(page).get_by_text("果然我的青春戀愛喜劇搞錯了。完", exact=True).count() >= 1
            assert panel(page).get_by_text("日本語", exact=True).count() == 1
            assert panel(page).get_by_text("作品官方資訊", exact=True).count() == 1
            assert panel(page).get_by_text("串流平台搜尋", exact=True).count() == 1
            gamer_search = panel(page).get_by_role("link", name="巴哈姆特動畫瘋 搜尋 ↗")
            assert gamer_search.count() == 1
            assert "ani.gamer.com.tw/search.php?keyword=" in gamer_search.get_attribute("href")
            netflix_search = panel(page).get_by_role("link", name="Netflix 搜尋 ↗")
            assert "netflix.com/search?q=" in netflix_search.get_attribute("href")

            options = context.new_page()
            options.goto(f"chrome-extension://{extension_id}/options/options.html")
            options.get_by_role("heading", name="選擇要顯示的平台").wait_for()
            assert options.locator('input[name="mal"]').is_checked()
            assert not options.locator('input[name="filmarks"]').is_checked()
            assert options.locator('input[name="animegamer"]').is_checked()
            assert options.locator('input[name="netflix"]').is_checked()
            assert not options.locator('input[name="hamivideo"]').is_checked()
            mal_card = options.locator(".platform").filter(has_text="MyAnimeList").first
            mal_home = options.get_by_role("link", name="在新分頁開啟 MyAnimeList")
            assert mal_home.get_attribute("href") == "https://myanimelist.net/"
            assert mal_home.get_attribute("target") == "_blank"
            assert mal_home.evaluate("node => node.closest('label') === null")
            mal_card.locator(".platform-main").click()
            assert not options.locator('input[name="mal"]').is_checked()
            mal_card.locator(".platform-main").click()
            assert options.locator('input[name="mal"]').is_checked()
            assert options.get_by_text("連結在新分頁開啟", exact=True).count() == 0
            options.locator('input[name="filmarks"]').check()
            options.get_by_role("button", name="儲存設定").click()
            options.get_by_text("設定已儲存", exact=True).wait_for()
            assert worker.evaluate(
                "chrome.storage.sync.get('platformVisibility').then(x => x.platformVisibility.filmarks)"
            ) is True
            assert worker.evaluate(
                "chrome.storage.sync.get('platformOpenInNewTab').then(x => x.platformOpenInNewTab)"
            ) is None
            assert worker.evaluate(
                "chrome.storage.sync.get('streamingVisibility').then(x => x.streamingVisibility.netflix)"
            ) is True
            context.close()

            restarted_context = playwright.chromium.launch_persistent_context(
                profile,
                channel="chromium",
                headless=True,
                args=[
                    f"--disable-extensions-except={ROOT}",
                    f"--load-extension={ROOT}",
                ],
            )
            restarted_workers = restarted_context.service_workers
            if not restarted_workers:
                restarted_workers = [restarted_context.wait_for_event("serviceworker", timeout=10_000)]
            restarted_worker = restarted_workers[0]
            restarted_extension_id = restarted_worker.url.split("/")[2]
            restarted_options = restarted_context.new_page()
            restarted_options.goto(f"chrome-extension://{restarted_extension_id}/options/options.html")
            restarted_options.get_by_role("heading", name="選擇要顯示的平台").wait_for()
            assert restarted_options.locator('input[name="filmarks"]').is_checked()
            assert restarted_options.locator('input[name="netflix"]').is_checked()
            assert restarted_worker.evaluate(
                "chrome.storage.sync.get('platformVisibility').then(x => x.platformVisibility.filmarks)"
            ) is True
            restarted_context.close()


if __name__ == "__main__":
    main()
