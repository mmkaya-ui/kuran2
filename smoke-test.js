/**
 * Kuran Uygulaması — Smoke Test Script
 * 
 * Kullanım: Browser console'a yapıştır veya Node.js ile çalıştır.
 * Pure utility fonksiyonlarını izole test eder, DOM/React'a ihtiyaç duymaz.
 * 
 *   node smoke-test.js
 */

// ─── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}`);
        console.error(`     ${e.message}`);
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Inline copies of pure functions from index.html ─────────────────────────

const normalizeText = (text) => {
    if (!text) return '';
    return text
        .replace(/İ/g, 'i').replace(/I/g, 'i') // must happen BEFORE toLowerCase
        .toLowerCase()
        .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, ' ').trim();
};

const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const fetchWithRetry = async (url, options = {}, retries = 3, delayMs = 10) => {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
        }
    }
};

const sortMatches = (matches, type) => {
    const REVELATION_ORDER_MAP = { 1: 5, 2: 87, 3: 89, 36: 41, 112: 22 };
    return [...matches].sort((a, b) => {
        if (type === 'mushaf') return (a.surah.number - b.surah.number) || (a.numberInSurah - b.numberInSurah);
        const orderA = REVELATION_ORDER_MAP[a.surah.number] || 999;
        const orderB = REVELATION_ORDER_MAP[b.surah.number] || 999;
        return (orderA - orderB) || (a.numberInSurah - b.numberInSurah);
    });
};

// navRegex — same as in handleSearch
const navRegex = /^(.+?)[\s\:\-]+(\d+)$/;

// diyanetUrl normalizer — same as in AyahCard
const normalizeSurahName = (name) => name.toLowerCase()
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n── normalizeText ──────────────────────────────────────────');

test('Türkçe büyük harfler küçültülüyor', () => {
    assertEqual(normalizeText('İNSAN'), 'insan');
});
test('ş → s dönüşümü', () => {
    assertEqual(normalizeText('şükür'), 'sukur');
});
test('ç → c dönüşümü', () => {
    assertEqual(normalizeText('çiçek'), 'cicek');
});
test('ğ → g dönüşümü', () => {
    assertEqual(normalizeText('ğ'), 'g');
});
test('ı → i dönüşümü', () => {
    assertEqual(normalizeText('ışık'), 'isik');
});
test('ö → o dönüşümü', () => {
    assertEqual(normalizeText('öğle'), 'ogle');
});
test('ü → u dönüşümü', () => {
    assertEqual(normalizeText('üzüm'), 'uzum');
});
test('Boş string güvenli', () => {
    assertEqual(normalizeText(''), '');
});
test('null/undefined güvenli', () => {
    assertEqual(normalizeText(null), '');
    assertEqual(normalizeText(undefined), '');
});
test('Çoklu boşluk normalize ediliyor', () => {
    assertEqual(normalizeText('ali   imran'), 'ali imran');
});

console.log('\n── formatTime ─────────────────────────────────────────────');

test('0 saniye → "0:00"', () => {
    assertEqual(formatTime(0), '0:00');
});
test('65 saniye → "1:05"', () => {
    assertEqual(formatTime(65), '1:05');
});
test('3600 saniye → "60:00"', () => {
    assertEqual(formatTime(3600), '60:00');
});
test('NaN → "00:00"', () => {
    assertEqual(formatTime(NaN), '00:00');
});
test('9 saniye → "0:09" (sıfır dolgu)', () => {
    assertEqual(formatTime(9), '0:09');
});

console.log('\n── navRegex ────────────────────────────────────────────────');

test('"Bakara 255" eşleşiyor', () => {
    const m = 'Bakara 255'.match(navRegex);
    assert(m, 'eşleşmedi');
    assertEqual(m[1], 'Bakara');
    assertEqual(m[2], '255');
});
test('"Ali İmran 94" eşleşiyor', () => {
    const m = 'Ali İmran 94'.match(navRegex);
    assert(m, 'eşleşmedi');
    assertEqual(m[2], '94');
});
test('"Bakara:5" kolon ile eşleşiyor', () => {
    const m = 'Bakara:5'.match(navRegex);
    assert(m, 'eşleşmedi');
    assertEqual(m[1], 'Bakara');
});
test('"namaz" tek kelime eşleşmiyor (text search)', () => {
    const m = 'namaz'.match(navRegex);
    assert(!m, 'eşleşmemeli');
});
test('"42" sadece sayı eşleşiyor (sure no)', () => {
    const m = '42'.match(navRegex);
    assert(!m, 'navRegex eşleşmemeli, sayı ayrıca işleniyor');
});

console.log('\n── normalizeSurahName (diyanetUrl) ────────────────────────');

test('"Al-i İmran" → "al-i-imran"', () => {
    assertEqual(normalizeSurahName('Al-i İmran'), 'al-i-imran');
});
test('"Âl-i İmrân" → "al-i-imran"', () => {
    assertEqual(normalizeSurahName('Âl-i İmrân'), 'al-i-imran');
});
test('"Şuara" → "suara"', () => {
    assertEqual(normalizeSurahName('Şuara'), 'suara');
});
test('"Zümer" → "zumer"', () => {
    assertEqual(normalizeSurahName('Zümer'), 'zumer');
});
test('"Çöp" → "cop"', () => {
    assertEqual(normalizeSurahName('Çöp'), 'cop');
});

console.log('\n── sortMatches ─────────────────────────────────────────────');

const mockMatches = [
    { surah: { number: 3 }, numberInSurah: 5 },
    { surah: { number: 1 }, numberInSurah: 2 },
    { surah: { number: 2 }, numberInSurah: 1 },
];

test('mushaf sırası: 1, 2, 3', () => {
    const sorted = sortMatches(mockMatches, 'mushaf');
    assertEqual(sorted[0].surah.number, 1);
    assertEqual(sorted[1].surah.number, 2);
    assertEqual(sorted[2].surah.number, 3);
});
test('revelation sırası: sure 1 (iniş:5) önce', () => {
    const sorted = sortMatches(mockMatches, 'revelation');
    assertEqual(sorted[0].surah.number, 1); // iniş 5 — en erken
});
test('Aynı surede numberInSurah sıralaması', () => {
    const same = [
        { surah: { number: 2 }, numberInSurah: 10 },
        { surah: { number: 2 }, numberInSurah: 3 },
    ];
    const sorted = sortMatches(same, 'mushaf');
    assertEqual(sorted[0].numberInSurah, 3);
});

console.log('\n── fetchWithRetry ──────────────────────────────────────────');

// Mock fetch for Node.js environment
const isBrowser = typeof window !== 'undefined';

if (!isBrowser) {
    let callCount = 0;
    global.fetch = async (url) => {
        callCount++;
        if (url === 'fail://always') throw new Error('Network error');
        if (url === 'fail://twice' && callCount < 3) throw new Error('Temporary error');
        return { ok: true, status: 200 };
    };

    (async () => {
        callCount = 0;
        await test('Başarılı istek geçiyor', async () => {
            const res = await fetchWithRetry('ok://test', {}, 3, 1);
            assert(res.ok, 'ok olmalı');
        });

        callCount = 0;
        await test('3 denemeden sonra hata fırlatıyor', async () => {
            let threw = false;
            try { await fetchWithRetry('fail://always', {}, 3, 1); }
            catch (e) { threw = true; }
            assert(threw, 'hata fırlatmalı');
        });

        callCount = 0;
        await test('2 başarısız sonra 3. denemede geçiyor', async () => {
            const res = await fetchWithRetry('fail://twice', {}, 3, 1);
            assert(res.ok, '3. denemede ok olmalı');
        });

        printSummary();
    })();
} else {
    console.log('  ⚠️  fetchWithRetry testleri Node.js ortamında çalışır, tarayıcıda atlandı.');
    printSummary();
}

function printSummary() {
    console.log('\n──────────────────────────────────────────────────────────');
    console.log(`Sonuç: ${passed} geçti, ${failed} başarısız`);
    if (failed === 0) console.log('🎉 Tüm testler geçti!');
    else console.log('⚠️  Başarısız testler var, kontrol et.');
    console.log('──────────────────────────────────────────────────────────\n');
}

if (isBrowser) printSummary();
