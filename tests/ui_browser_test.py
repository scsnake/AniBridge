from pathlib import Path
import re
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto((ROOT / "tests" / "ui.fixture.html").as_uri())
        page.wait_for_load_state("networkidle")
        page.add_script_tag(path=str(ROOT / "lib" / "ui.js"))
        page.evaluate(
            """
            AniBridgeUi.renderAnime({
              sourceTitle: '果然我的青春戀愛喜劇搞錯了。完',
              year: 2020,
              confidence: 'high',
              translations: {
                zhtw: '果然我的青春戀愛喜劇搞錯了。完',
                japanese: 'やはり俺の青春ラブコメはまちがっている。完',
                english: 'My Teen Romantic Comedy SNAFU Climax!'
              },
              officialWebsite: { label: '官方網站 · Japanese', url: 'https://example.com/anime/' },
              ratings: [
                { platformId: 'anilist', label: 'AniList', score: 82, scale: 100, rank: '#120 歷年', detail: '加入清單 12,345 人', url: 'https://anilist.co/anime/108489' },
                { platformId: 'bangumi', label: 'Bangumi', score: 7.8, scale: 10, detail: '1,234 則評分', url: 'https://bgm.tv/subject/123' }
              ],
              streamingLinks: [
                { label: '巴哈姆特動畫瘋', url: 'https://ani.gamer.com.tw/search.php?keyword=test', exact: false },
                { label: 'Netflix', url: 'https://www.netflix.com/search?q=test', exact: false }
              ],
              links: [
                { label: 'MyAnimeList', url: 'https://myanimelist.net/anime/39547', exact: true },
                { label: 'AniList', url: 'https://anilist.co/anime/108489', exact: true }
              ],
              warnings: []
            }, { onCorrect: () => {}, onAiAssist: () => {} });
            """
        )

        host = page.locator("#anibridge-extension-root")
        assert host.count() == 1
        shadow = host.locator(".panel")
        assert shadow.get_by_text("多語標題", exact=False).count() == 0
        assert shadow.get_by_role("link", name=re.compile(r"^MyAnimeList")).count() == 1
        assert shadow.get_by_role("link", name=re.compile(r"^MyAnimeList")).get_attribute("target") == "_blank"
        database_anilist = shadow.locator("a.link", has_text="AniList")
        assert database_anilist.count() == 1
        assert database_anilist.get_attribute("target") == "_blank"
        assert shadow.get_by_text("日本語", exact=True).count() == 1
        assert shadow.get_by_text("高可信", exact=True).count() == 1
        assert shadow.get_by_text("評分與排行", exact=True).count() == 1
        anilist_rating = shadow.locator("a.rating", has_text="AniList")
        assert anilist_rating.count() == 1
        assert anilist_rating.get_attribute("href") == "https://anilist.co/anime/108489"
        assert anilist_rating.evaluate("node => getComputedStyle(node).color") == "rgb(23, 32, 42)"
        page.emulate_media(color_scheme="dark")
        assert anilist_rating.evaluate("node => getComputedStyle(node).backgroundColor") == "rgb(34, 42, 45)"
        assert anilist_rating.evaluate("node => getComputedStyle(node).color") == "rgb(238, 245, 245)"
        page.emulate_media(color_scheme="light")
        assert shadow.get_by_role("button", name="使用本機 AI 嘗試別名").count() == 1
        assert shadow.get_by_role("link", name=re.compile(r"^官方網站")).get_attribute("href") == "https://example.com/anime/"

        shadow.get_by_role("button", name=re.compile(r"複製日本語標題")).click()
        assert shadow.get_by_text("已複製", exact=True).count() == 1

        shadow.get_by_role("button", name="不是這部？手動修正").click()
        assert shadow.locator("form.correction.open").count() == 1
        assert shadow.locator('input[name="title"]').input_value().startswith("果然")

        shadow.get_by_role("button", name="關閉 AniBridge").click()
        assert host.locator(".panel").count() == 0

        page.evaluate(
            """
            AniBridgeUi.renderAnime({
              sourceTitle: 'Database fixture', confidence: 'high',
              translations: { japanese: 'データベース作品' },
              streamingLinks: [
                { label: '巴哈姆特動畫瘋', url: 'https://ani.gamer.com.tw/search.php?keyword=test', exact: false },
                { label: 'Netflix', url: 'https://www.netflix.com/search?q=test', exact: false }
              ],
              links: [], warnings: []
            }, { databasePage: true });
            """
        )
        database_card = host.locator(".panel")
        assert database_card.get_by_text("串流平台搜尋", exact=True).count() == 1
        assert database_card.get_by_role("link", name=re.compile(r"^Netflix")).get_attribute("href") == "https://www.netflix.com/search?q=test"
        database_card.get_by_role("button", name="關閉 AniBridge").click()

        page.evaluate(
            """
            AniBridgeUi.renderAnime({
              sourceTitle: 'Drawer fixture', confidence: 'medium',
              translations: { japanese: 'ドロワー' }, links: [], warnings: []
            }, { collapsible: true, onCorrect: () => {}, onOptions: () => {} });
            """
        )
        drawer = host.locator(".panel.docked")
        assert drawer.get_attribute("class").find("collapsed") >= 0
        drawer.get_by_role("button", name="展開 AniBridge").click()
        assert "collapsed" not in (drawer.get_attribute("class") or "")
        browser.close()


if __name__ == "__main__":
    main()
