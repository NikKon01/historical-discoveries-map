// Пересобрано scripts/build_dataset.mjs (Wikipedia + GeoHack).
const explorersInfo = {
    "Эрик Рыжий": {
        "country": "Норвегия",
        "flag": "🇳🇴",
        "years": "ок. 950–1003",
        "image": "images/explorers/erik-the-red.png",
        "source": "https://ru.wikipedia.org/wiki/%D0%AD%D1%80%D0%B8%D0%BA_%D0%A0%D1%8B%D0%B6%D0%B8%D0%B9"
    },
    "Лейф Эрикссон": {
        "country": "Норвегия",
        "flag": "🇳🇴",
        "years": "ок. 970–1020",
        "image": "images/explorers/leif-erikson.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9B%D0%B5%D0%B9%D1%84"
    },
    "Марко Поло": {
        "country": "Италия",
        "flag": "🇮🇹",
        "years": "1254–1324",
        "image": "images/explorers/marco-polo.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9F%D0%BE%D0%BB%D0%BE%2C_%D0%9C%D0%B0%D1%80%D0%BA%D0%BE"
    },
    "Генрих Мореплаватель": {
        "country": "Португалия",
        "flag": "🇵🇹",
        "years": "1394–1460",
        "image": "images/explorers/henry-the-navigator.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%93%D0%B5%D0%BD%D1%80%D0%B8%D1%85_%D0%9C%D0%BE%D1%80%D0%B5%D0%BF%D0%BB%D0%B0%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C"
    },
    "Бартоломеу Диаш": {
        "country": "Португалия",
        "flag": "🇵🇹",
        "years": "ок. 1450–1500",
        "image": "images/explorers/bartolomeu-dias.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%94%D0%B8%D0%B0%D1%88%2C_%D0%91%D0%B0%D1%80%D1%82%D0%BE%D0%BB%D0%BE%D0%BC%D0%B5%D1%83"
    },
    "Христофор Колумб": {
        "country": "Испания",
        "flag": "🇪🇸",
        "years": "1451–1506",
        "image": "images/explorers/christopher-columbus.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9A%D0%BE%D0%BB%D1%83%D0%BC%D0%B1%2C_%D0%A5%D1%80%D0%B8%D1%81%D1%82%D0%BE%D1%84%D0%BE%D1%80"
    },
    "Джон Кабот": {
        "country": "Англия",
        "flag": "🏴",
        "years": "ок. 1450–1499",
        "image": "images/explorers/john-cabot.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D0%B1%D0%BE%D1%82%2C_%D0%94%D0%B6%D0%BE%D0%BD"
    },
    "Васко да Гама": {
        "country": "Португалия",
        "flag": "🇵🇹",
        "years": "ок. 1460–1524",
        "image": "images/explorers/vasco-da-gama.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%92%D0%B0%D1%81%D0%BA%D0%BE_%D0%B4%D0%B0_%D0%93%D0%B0%D0%BC%D0%B0"
    },
    "Америго Веспуччи": {
        "country": "Италия",
        "flag": "🇮🇹",
        "years": "1454–1512",
        "image": "images/explorers/amerigo-vespucci.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%92%D0%B5%D1%81%D0%BF%D1%83%D1%87%D1%87%D0%B8%2C_%D0%90%D0%BC%D0%B5%D1%80%D0%B8%D0%B3%D0%BE"
    },
    "Педру Алвариш Кабрал": {
        "country": "Португалия",
        "flag": "🇵🇹",
        "years": "ок. 1467–1520",
        "image": "images/explorers/pedro-cabral.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D0%B1%D1%80%D0%B0%D0%BB%2C_%D0%9F%D0%B5%D0%B4%D1%80%D1%83"
    },
    "Васко Нуньес де Бальбоа": {
        "country": "Испания",
        "flag": "🇪🇸",
        "years": "1475–1519",
        "image": "images/explorers/vasco-nunez-de-balboa.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9D%D1%83%D0%BD%D1%8C%D0%B5%D1%81_%D0%B4%D0%B5_%D0%91%D0%B0%D0%BB%D1%8C%D0%B1%D0%BE%D0%B0%2C_%D0%92%D0%B0%D1%81%D0%BA%D0%BE"
    },
    "Фернан Магеллан": {
        "country": "Португалия / Испания",
        "flag": "🇵🇹 🇪🇸",
        "years": "1480–1521",
        "image": "images/explorers/ferdinand-magellan.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9C%D0%B0%D0%B3%D0%B5%D0%BB%D0%BB%D0%B0%D0%BD%2C_%D0%A4%D0%B5%D1%80%D0%BD%D0%B0%D0%BD"
    },
    "Джованни да Верраццано": {
        "country": "Италия / Франция",
        "flag": "🇮🇹 🇫🇷",
        "years": "1485–1528",
        "image": "images/explorers/giovanni-verrazzano.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%92%D0%B5%D1%80%D1%80%D0%B0%D1%86%D1%86%D0%B0%D0%BD%D0%BE%2C_%D0%94%D0%B6%D0%BE%D0%B2%D0%B0%D0%BD%D0%BD%D0%B8_%D0%B4%D0%B0"
    },
    "Жак Картье": {
        "country": "Франция",
        "flag": "🇫🇷",
        "years": "1491–1557",
        "image": "images/explorers/jacques-cartier.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D1%80%D1%82%D1%8C%D0%B5%2C_%D0%96%D0%B0%D0%BA"
    },
    "Хуан Родригес Кабрильо": {
        "country": "Испания",
        "flag": "🇪🇸",
        "years": "ок. 1499–1543",
        "image": "images/explorers/juan-rodriguez-cabrillo.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A0%D0%BE%D0%B4%D1%80%D0%B8%D0%B3%D0%B5%D1%81_%D0%9A%D0%B0%D0%B1%D1%80%D0%B8%D0%BB%D1%8C%D0%BE%2C_%D0%A5%D1%83%D0%B0%D0%BD"
    },
    "Фрэнсис Дрейк": {
        "country": "Англия",
        "flag": "🏴",
        "years": "ок. 1540–1596",
        "image": "images/explorers/francis-drake.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%94%D1%80%D0%B5%D0%B9%D0%BA%2C_%D0%A4%D1%80%D1%8D%D0%BD%D1%81%D0%B8%D1%81"
    },
    "Виллем Баренц": {
        "country": "Нидерланды",
        "flag": "🇳🇱",
        "years": "ок. 1550–1597",
        "image": "images/explorers/willem-barentsz.png",
        "source": "https://ru.wikipedia.org/wiki/%D0%92%D0%B8%D0%BB%D0%BB%D0%B5%D0%BC_%D0%91%D0%B0%D1%80%D0%B5%D0%BD%D1%86"
    },
    "Виллем Янсзон": {
        "country": "Нидерланды",
        "flag": "🇳🇱",
        "years": "ок. 1570–1630",
        "image": "images/explorers/willem-janszoon.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%AF%D0%BD%D1%81%D0%B7%D0%BE%D0%BD%2C_%D0%92%D0%B8%D0%BB%D0%BB%D0%B5%D0%BC"
    },
    "Генри Гудзон": {
        "country": "Англия",
        "flag": "🏴",
        "years": "ок. 1565–1611",
        "image": "images/explorers/henry-hudson.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%93%D1%83%D0%B4%D0%B7%D0%BE%D0%BD%2C_%D0%93%D0%B5%D0%BD%D1%80%D0%B8"
    },
    "Виллем Схаутен": {
        "country": "Нидерланды",
        "flag": "🇳🇱",
        "years": "ок. 1567–1625",
        "image": "images/explorers/willem-schouten.png",
        "source": "https://ru.wikipedia.org/wiki/%D0%A1%D1%85%D0%B0%D1%83%D1%82%D0%B5%D0%BD%2C_%D0%92%D0%B8%D0%BB%D0%BB%D0%B5%D0%BC_%D0%9A%D0%BE%D1%80%D0%BD%D0%B5%D0%BB%D0%B8%D1%81"
    },
    "Абел Тасман": {
        "country": "Нидерланды",
        "flag": "🇳🇱",
        "years": "1603–1659",
        "image": "images/explorers/abel-tasman.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A2%D0%B0%D1%81%D0%BC%D0%B0%D0%BD%2C_%D0%90%D0%B1%D0%B5%D0%BB%D1%8C_%D0%AF%D0%BD%D1%81%D0%B7%D0%BE%D0%BD"
    },
    "Семён Дежнёв": {
        "country": "Россия",
        "flag": "🇷🇺",
        "years": "ок. 1605–1673",
        "image": "images/explorers/semyon-dezhnev.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%94%D0%B5%D0%B6%D0%BD%D1%91%D0%B2%2C_%D0%A1%D0%B5%D0%BC%D1%91%D0%BD_%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2%D0%B8%D1%87"
    },
    "Витус Беринг": {
        "country": "Дания / Россия",
        "flag": "🇩🇰 🇷🇺",
        "years": "1681–1741",
        "image": "images/explorers/vitus-bering.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%91%D0%B5%D1%80%D0%B8%D0%BD%D0%B3%2C_%D0%92%D0%B8%D1%82%D1%83%D1%81_%D0%98%D0%BE%D0%BD%D0%B0%D1%81%D1%81%D0%B5%D0%BD"
    },
    "Алексей Чириков": {
        "country": "Россия",
        "flag": "🇷🇺",
        "years": "1703–1748",
        "image": "images/explorers/alexey-chirikov.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A7%D0%B8%D1%80%D0%B8%D0%BA%D0%BE%D0%B2%2C_%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B5%D0%B9_%D0%98%D0%BB%D1%8C%D0%B8%D1%87"
    },
    "Джеймс Кук": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1728–1779",
        "image": "images/explorers/james-cook.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9A%D1%83%D0%BA%2C_%D0%94%D0%B6%D0%B5%D0%B9%D0%BC%D1%81"
    },
    "Жан-Франсуа Лаперуз": {
        "country": "Франция",
        "flag": "🇫🇷",
        "years": "1741–1788",
        "image": "images/explorers/laperouse.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9B%D0%B0%D0%BF%D0%B5%D1%80%D1%83%D0%B7%2C_%D0%96%D0%B0%D0%BD-%D0%A4%D1%80%D0%B0%D0%BD%D1%81%D1%83%D0%B0_%D0%B4%D0%B5"
    },
    "Александр Гумбольдт": {
        "country": "Германия",
        "flag": "🇩🇪",
        "years": "1769–1859",
        "image": "images/explorers/alexander-humboldt.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%93%D1%83%D0%BC%D0%B1%D0%BE%D0%BB%D1%8C%D0%B4%D1%82%2C_%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B0%D0%BD%D0%B4%D1%80_%D1%84%D0%BE%D0%BD"
    },
    "Иван Крузенштерн": {
        "country": "Россия",
        "flag": "🇷🇺",
        "years": "1770–1846",
        "image": "images/explorers/ivan-krusenstern.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9A%D1%80%D1%83%D0%B7%D0%B5%D0%BD%D1%88%D1%82%D0%B5%D1%80%D0%BD%2C_%D0%98%D0%B2%D0%B0%D0%BD_%D0%A4%D1%91%D0%B4%D0%BE%D1%80%D0%BE%D0%B2%D0%B8%D1%87"
    },
    "Мериуэзер Льюис и Уильям Кларк": {
        "country": "США",
        "flag": "🇺🇸",
        "years": "1774–1809 / 1770–1838",
        "image": "images/explorers/lewis-and-clark.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9B%D1%8C%D1%8E%D0%B8%D1%81%2C_%D0%9C%D0%B5%D1%80%D0%B8%D1%83%D1%8D%D0%B7%D0%B5%D1%80"
    },
    "Джон Франклин": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1786–1847",
        "image": "images/explorers/john-franklin.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D0%BB%D0%B8%D0%BD%2C_%D0%94%D0%B6%D0%BE%D0%BD"
    },
    "Фаддей Беллинсгаузен и Михаил Лазарев": {
        "country": "Россия",
        "flag": "🇷🇺",
        "years": "1778–1852 / 1788–1851",
        "image": "images/explorers/bellingshausen-lazarev.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%91%D0%B5%D0%BB%D0%BB%D0%B8%D0%BD%D1%81%D0%B3%D0%B0%D1%83%D0%B7%D0%B5%D0%BD%2C_%D0%A4%D0%B0%D0%B4%D0%B4%D0%B5%D0%B9_%D0%A4%D0%B0%D0%B4%D0%B4%D0%B5%D0%B5%D0%B2%D0%B8%D1%87"
    },
    "Чарльз Стерт": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1795–1869",
        "image": "images/explorers/charles-sturt.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A1%D1%82%D0%B5%D1%80%D1%82%2C_%D0%A7%D0%B0%D1%80%D0%BB%D0%B7"
    },
    "Джеймс Кларк Росс": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1800–1862",
        "image": "images/explorers/james-clark-ross.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A0%D0%BE%D1%81%D1%81%2C_%D0%94%D0%B6%D0%B5%D0%B9%D0%BC%D1%81_%D0%9A%D0%BB%D0%B0%D1%80%D0%BA"
    },
    "Давид Ливингстон": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1813–1873",
        "image": "images/explorers/david-livingstone.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9B%D0%B8%D0%B2%D0%B8%D0%BD%D0%B3%D1%81%D1%82%D0%BE%D0%BD%2C_%D0%94%D0%B0%D0%B2%D0%B8%D0%B4"
    },
    "Джон Хеннинг Спик": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1827–1864",
        "image": "images/explorers/john-hanning-speke.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A1%D0%BF%D0%B8%D0%BA%2C_%D0%94%D0%B6%D0%BE%D0%BD_%D0%A5%D0%B5%D0%BD%D0%BD%D0%B8%D0%BD%D0%B3"
    },
    "Роберт Бёрк и Уильям Уиллс": {
        "country": "Австралия / Великобритания",
        "flag": "🇦🇺 🇬🇧",
        "years": "1821–1861 / 1834–1861",
        "image": "images/explorers/burke-and-wills.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%91%D1%91%D1%80%D0%BA%D1%81%2C_%D0%A0%D0%BE%D0%B1%D0%B5%D1%80%D1%82"
    },
    "Генри Стэнли": {
        "country": "Великобритания / США",
        "flag": "🇬🇧 🇺🇸",
        "years": "1841–1904",
        "image": "images/explorers/henry-stanley.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A1%D1%82%D1%8D%D0%BD%D0%BB%D0%B8%2C_%D0%93%D0%B5%D0%BD%D1%80%D0%B8_%D0%9C%D0%BE%D1%80%D1%82%D0%BE%D0%BD"
    },
    "Адольф Эрик Норденшёльд": {
        "country": "Швеция",
        "flag": "🇸🇪",
        "years": "1832–1901",
        "image": "images/explorers/adolf-erik-nordenskiold.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9D%D0%BE%D1%80%D0%B4%D0%B5%D0%BD%D1%88%D0%B5%D0%BB%D1%8C%D0%B4%2C_%D0%90%D0%B4%D0%BE%D0%BB%D1%8C%D1%84_%D0%AD%D1%80%D0%B8%D0%BA"
    },
    "Фритьоф Нансен": {
        "country": "Норвегия",
        "flag": "🇳🇴",
        "years": "1861–1930",
        "image": "images/explorers/fridtjof-nansen.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9D%D0%B0%D0%BD%D1%81%D0%B5%D0%BD%2C_%D0%A4%D1%80%D0%B8%D1%82%D1%8C%D0%BE%D1%84"
    },
    "Адриен де Жерлаш": {
        "country": "Бельгия",
        "flag": "🇧🇪",
        "years": "1866–1934",
        "image": "images/explorers/adrien-de-gerlache.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%96%D0%B5%D1%80%D0%BB%D0%B0%D1%88%2C_%D0%90%D0%B4%D1%80%D0%B8%D0%B5%D0%BD_%D0%B4%D0%B5"
    },
    "Роберт Пири": {
        "country": "США",
        "flag": "🇺🇸",
        "years": "1856–1920",
        "image": "images/explorers/robert-peary.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%9F%D0%B8%D1%80%D0%B8%2C_%D0%A0%D0%BE%D0%B1%D0%B5%D1%80%D1%82"
    },
    "Руаль Амундсен": {
        "country": "Норвегия",
        "flag": "🇳🇴",
        "years": "1872–1928",
        "image": "images/explorers/roald-amundsen.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%90%D0%BC%D1%83%D0%BD%D0%B4%D1%81%D0%B5%D0%BD%2C_%D0%A0%D1%83%D0%B0%D0%BB%D1%8C"
    },
    "Роберт Скотт": {
        "country": "Великобритания",
        "flag": "🇬🇧",
        "years": "1868–1912",
        "image": "images/explorers/robert-scott.jpg",
        "source": "https://ru.wikipedia.org/wiki/%D0%A1%D0%BA%D0%BE%D1%82%D1%82%2C_%D0%A0%D0%BE%D0%B1%D0%B5%D1%80%D1%82"
    }
};
