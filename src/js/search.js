const SearchEngine = {
    zenkakuAlphanumericToHankaku(str) {
        return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => {
            return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        });
    },

    hiraganaToKatakana(str) {
        return str.replace(/[\u3041-\u3096]/g, ch =>
            String.fromCharCode(ch.charCodeAt(0) + 0x60)
        );
    },

    zenkakuKatakanaToHankaku(str) {
        const mapping = {
            'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
            'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
            'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
            'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
            'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
            'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
            'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
            'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
            'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
            'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ',
            'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
            'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
            'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
            'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
            'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
            'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ',
            'ャ': 'ｬ', 'ュ': 'ｭ', 'ョ': 'ｮ',
            'ッ': 'ｯ',
            'ヴ': 'ｳﾞ',
            '－': 'ｰ', 'ー': 'ｰ',
            '　': ' '
        };

        let result = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            result += mapping[char] || char;
        }
        return result;
    },

    normalizeSmallKana(str) {
        const mapping = {
            'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
            'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
            'ヮ': 'ワ',
            'ッ': 'ツ',
            'ｧ': 'ｱ', 'ｨ': 'ｲ', 'ｩ': 'ｳ', 'ｪ': 'ｴ', 'ｫ': 'ｵ',
            'ｬ': 'ﾔ', 'ｭ': 'ﾕ', 'ｮ': 'ﾖ',
            'ｯ': 'ﾂ'
        };

        let result = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            result += mapping[char] || char;
        }
        return result;
    },

    normalizeForSearch(str) {
        let normalized = str;
        normalized = this.zenkakuAlphanumericToHankaku(normalized);
        normalized = this.hiraganaToKatakana(normalized);
        normalized = this.normalizeSmallKana(normalized);
        normalized = this.zenkakuKatakanaToHankaku(normalized);
        normalized = normalized.toUpperCase();
        return normalized;
    },

    searchCompanies(query, companies) {
        if (!query || query.trim() === '') {
            return [];
        }

        const normalizedQuery = this.normalizeForSearch(query);
        const exactMatches = [];
        const partialMatches = [];

        companies.forEach(company => {
            const searchTargets = [
                { field: company.formalName, normalized: this.normalizeForSearch(company.formalName) },
                { field: company.qr1ShortName, normalized: this.normalizeForSearch(company.qr1ShortName) },
                { field: company.kana, normalized: company.kana },
                { field: company.englishName, normalized: company.englishName.toUpperCase() },
                { field: company.englishShortName, normalized: company.englishShortName.toUpperCase() },
                { field: company.stockCode, normalized: company.stockCode },
                { field: company.oldName, normalized: this.normalizeForSearch(company.oldName || '') }
            ];

            let isExactMatch = false;
            let isPartialMatch = false;

            for (const target of searchTargets) {
                if (target.normalized === normalizedQuery) {
                    isExactMatch = true;
                    break;
                }
                if (target.normalized.includes(normalizedQuery)) {
                    isPartialMatch = true;
                }
            }

            if (isExactMatch) {
                exactMatches.push(company);
            } else if (isPartialMatch) {
                partialMatches.push(company);
            }
        });

        return [...exactMatches, ...partialMatches];
    }
};
