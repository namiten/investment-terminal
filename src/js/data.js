const DataManager = {
    companies: [],
    headers: [],
    isLoaded: false,

    async loadCSV() {
        try {
            const response = await fetch('../data/companies.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            this.parseCSV(text);
            this.isLoaded = true;
            console.log(`CSVデータ読み込み完了: ${this.companies.length}社`);
            return true;
        } catch (error) {
            console.error('CSV読み込みエラー:', error);
            return false;
        }
    },

    parseCSV(csvText) {
        let cleanText = csvText;
        if (cleanText.charCodeAt(0) === 0xFEFF) {
            cleanText = cleanText.substring(1);
        }

        const rows = this.parseCSVRows(cleanText);
        if (rows.length === 0) return;

        this.headers = rows[0].map((header, index) => {
            let cleaned = header.trim();

            if (index === 0 && cleaned.charCodeAt(0) === 0xFEFF) {
                cleaned = cleaned.substring(1);
            }

            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }

            return cleaned;
        });
        console.log('CSVヘッダー:', this.headers);
        console.log('最初のヘッダー charCode:', this.headers[0] ? this.headers[0].charCodeAt(0) : 'none');

        const headerMap = {
            '証券コード': 'stockCode',
            'CSV略称': 'csvShortName',
            '正式企業名(和)': 'formalName',
            'Qr1略称(和)': 'qr1ShortName',
            'カナ': 'kana',
            '正式企業名(英)': 'englishName',
            '略称(英)': 'englishShortName',
            'FACTSET業種': 'factsetIndustry',
            '旧社名・旧商号': 'oldName',
            'EDINETコード': 'edinetCode',
            '新証券コード': 'newStockCode',
            '協会業種': 'kyokaiIndustry',
            '日経業種(小分類)': 'nikkeiIndustry',
            '優先市場': 'primaryMarket',
            '配信開始日': 'listingDate',
            '売買単位': 'tradingUnit',
            '発行済株式総数': 'outstandingShares',
            'HPアドレス': 'website',
            '決算期': 'fiscalPeriod',
            '配当基準日': 'dividendDate',
            '決算発表予定日': 'earningsSchedule',
            '決算発表履歴': 'earningsHistory',
            '企業情報': 'companyDescription',
            '日経会社情報': 'nikkeiDescription',
            '日経業種（中分類）_抽出': 'nikkeiIndustryMiddle',
            '上場市場名_抽出': 'listedMarkets',
            '指数採用_抽出': 'indexAdoption'
        };

        const headerIndices = {};
        this.headers.forEach((header, index) => {
            if (headerMap[header]) {
                headerIndices[headerMap[header]] = index;
            }
        });

        console.log('ヘッダーマッピング:', headerIndices);

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            if (values.length < this.headers.length) continue;

            const company = {};
            Object.keys(headerIndices).forEach(key => {
                const index = headerIndices[key];
                company[key] = values[index] || '';
            });

            if (!company.nikkeiIndustryMiddle) {
                company.nikkeiIndustryMiddle = '';
            }
            if (!company.listedMarkets) {
                company.listedMarkets = '';
            }
            if (!company.indexAdoption) {
                company.indexAdoption = '';
            }
            company.shareholders = [];
            company.shareholderDistribution = null;
            company.revenueComposition = null;
            company.exchangeRateInfo = null;

            this.companies.push(company);
        }
    },

    parseShareholders(shareholderText) {
        const shareholders = [];
        const lines = shareholderText.split('\n');
        const shareholderPattern = /^([^\d\s][^\d]*?)\s+(\d+(?:,\d+)*(?:\.\d+)?)\(([^\)]+)\)/;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (!trimmedLine || trimmedLine.match(/^\d{4}\/\d{2}\[/) || trimmedLine.startsWith('監査役')) {
                continue;
            }

            const match = shareholderPattern.exec(trimmedLine);
            if (match) {
                const name = match[1].trim();
                const shares = match[2].replace(/,/g, '');
                const percentage = parseFloat(match[3].trim());

                if (name && name.length > 1 && !isNaN(percentage)) {
                    shareholders.push({
                        name: name,
                        shares: parseInt(shares),
                        percentage: percentage
                    });
                }
            }
        }

        return shareholders;
    },

    extractAllValuesFromLine(line, labelLength) {
        const valueText = line.substring(labelLength).trim();
        const values = [];

        const pattern = /(\d+(?:,\d+)*(?:\.\d+)?)\(([^\)]+)\)|\(\s*\)/g;
        let match;

        while ((match = pattern.exec(valueText)) !== null) {
            if (match[0].trim() === '()' || /^\(\s*\)$/.test(match[0])) {
                values.push(null);
            } else if (match[1] && match[2]) {
                values.push({
                    shares: parseInt(match[1].replace(/,/g, '')),
                    percentage: parseFloat(match[2].trim())
                });
            }
        }

        return values;
    },

    parseShareholderDistribution(distributionText) {
        const lines = distributionText.split('\n');

        let dates = [];
        if (lines.length > 0) {
            const datePattern = /(\d{4}\/\d{2})\[[^\]]+\]/g;
            let match;
            while ((match = datePattern.exec(lines[0])) !== null) {
                dates.push(match[1]);
            }
        }

        const dataByPeriod = dates.map(date => ({
            date: date,
            ownShares: { shares: 0, percentage: 0 },
            financialInstitutions: { shares: 0, percentage: 0 },
            investmentTrusts: { shares: 0, percentage: 0 },
            corporations: { shares: 0, percentage: 0 },
            foreigners: { shares: 0, percentage: 0 },
            individuals: { shares: 0, percentage: 0 },
            totalFinancialShares: 0,
            totalFinancialPercentage: 0,
            validItemCount: 0
        }));

        for (const line of lines) {
            const trimmedLine = line.trim();
            let values = [];
            let label = '';

            if (trimmedLine.startsWith('自己株数')) {
                label = 'ownShares';
                values = this.extractAllValuesFromLine(trimmedLine, '自己株数'.length);
            } else if (trimmedLine.startsWith('金融機関持株数')) {
                label = 'financialTotal';
                values = this.extractAllValuesFromLine(trimmedLine, '金融機関持株数'.length);
            } else if (trimmedLine.startsWith('うち証券投資信託株数')) {
                label = 'investmentTrusts';
                values = this.extractAllValuesFromLine(trimmedLine, 'うち証券投資信託株数'.length);
            } else if (trimmedLine.startsWith('法人株数')) {
                label = 'corporations';
                values = this.extractAllValuesFromLine(trimmedLine, '法人株数'.length);
            } else if (trimmedLine.startsWith('外国人株数')) {
                label = 'foreigners';
                values = this.extractAllValuesFromLine(trimmedLine, '外国人株数'.length);
            } else if (trimmedLine.startsWith('個人株数')) {
                label = 'individuals';
                values = this.extractAllValuesFromLine(trimmedLine, '個人株数'.length);
            }

            if (label && values.length > 0) {
                values.forEach((value, index) => {
                    if (index < dataByPeriod.length && value) {
                        if (label === 'financialTotal') {
                            dataByPeriod[index].totalFinancialShares = value.shares;
                            dataByPeriod[index].totalFinancialPercentage = value.percentage;
                            dataByPeriod[index].validItemCount++;
                        } else {
                            dataByPeriod[index][label] = value;
                            dataByPeriod[index].validItemCount++;
                        }
                    }
                });
            }
        }

        dataByPeriod.forEach(period => {
            if (period.totalFinancialShares > 0 && period.totalFinancialShares >= period.investmentTrusts.shares) {
                period.financialInstitutions.shares = period.totalFinancialShares - period.investmentTrusts.shares;
                period.financialInstitutions.percentage = period.totalFinancialPercentage - period.investmentTrusts.percentage;
            }
        });

        let bestPeriod = dataByPeriod[0];
        for (let i = 1; i < dataByPeriod.length; i++) {
            if (dataByPeriod[i].validItemCount > bestPeriod.validItemCount) {
                bestPeriod = dataByPeriod[i];
            }
        }

        if (!bestPeriod) {
            return {
                date: '',
                ownShares: { shares: 0, percentage: 0 },
                financialInstitutions: { shares: 0, percentage: 0 },
                investmentTrusts: { shares: 0, percentage: 0 },
                corporations: { shares: 0, percentage: 0 },
                foreigners: { shares: 0, percentage: 0 },
                individuals: { shares: 0, percentage: 0 }
            };
        }

        return {
            date: bestPeriod.date,
            ownShares: bestPeriod.ownShares,
            financialInstitutions: bestPeriod.financialInstitutions,
            investmentTrusts: bestPeriod.investmentTrusts,
            corporations: bestPeriod.corporations,
            foreigners: bestPeriod.foreigners,
            individuals: bestPeriod.individuals
        };
    },

    parseRevenueComposition(compositionText) {
        const lines = compositionText.split('\n');
        const segments = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('単位:')) {
                continue;
            }

            const match = trimmedLine.match(/^([^\s]+)\s+[\d,]+\(\s*(\d+)\)/);
            if (match) {
                const segmentName = match[1].trim();
                const percentage = parseInt(match[2]);

                if (percentage > 0) {
                    segments.push({
                        name: segmentName,
                        percentage: percentage
                    });
                }
            }
        }

        if (segments.length === 0) {
            return null;
        }

        const totalPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0);

        if (totalPercentage < 100) {
            segments.push({
                name: 'その他・不明',
                percentage: 100 - totalPercentage
            });
        }

        return segments;
    },

    parseExchangeRateInfo(nikkeiDescription) {
        const exchangeRateMatch = nikkeiDescription.match(/【為替レート】影響度:百万円\s*([\s\S]*?)(?=\n【|$)/m);
        if (!exchangeRateMatch) {
            return null;
        }

        const extractedText = exchangeRateMatch[1];
        const lines = extractedText.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('ドル')) {
                continue;
            }

            const match = trimmedLine.match(/ドル\s+(\d+)円\((円高|円安)\s*(\d*)\s*\)/);
            if (match) {
                const assumedRate = parseInt(match[1]);
                const direction = match[2];
                const sensitivityStr = match[3].trim();

                if (!sensitivityStr || sensitivityStr === '') {
                    return {
                        assumedRate: assumedRate,
                        sensitivityDirection: direction,
                        sensitivityValue: null
                    };
                }

                const sensitivityValue = parseInt(sensitivityStr);

                return {
                    assumedRate: assumedRate,
                    sensitivityDirection: direction,
                    sensitivityValue: sensitivityValue
                };
            }

            const noDataMatch = trimmedLine.match(/ドル\s+円\(/);
            if (noDataMatch) {
                return null;
            }
        }

        return null;
    },

    parseCSVRows(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                currentRow.push(currentField);
                currentField = '';
                if (currentRow.some(field => field.trim() !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
            } else {
                currentField += char;
            }
        }

        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim() !== '')) {
                rows.push(currentRow);
            }
        }

        return rows;
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    },

    getCompanyByStockCode(stockCode) {
        return this.companies.find(c => c.stockCode === stockCode);
    },

    getAllCompanies() {
        return this.companies;
    },

    getCompanyCount() {
        return this.companies.length;
    },

    getTseIndustryCodeToNameMapping() {
        return {
            '321': '水産・農林業',
            '322': '鉱業',
            '323': '建設業',
            '324': '食料品',
            '325': '繊維製品',
            '326': 'パルプ・紙',
            '327': '化学',
            '328': '医薬品',
            '329': '石油石炭製品',
            '330': 'ゴム製品',
            '331': 'ｶﾞﾗｽ土石製品',
            '332': '鉄鋼',
            '333': '非鉄金属',
            '334': '金属製品',
            '335': '機械',
            '336': '電気機器',
            '337': '輸送用機器',
            '338': '精密機器',
            '339': 'その他製品',
            '340': '電気・ガス業',
            '341': '陸運業',
            '342': '海運業',
            '343': '空運業',
            '344': '倉庫運輸関連',
            '345': '情報・通信業',
            '346': '卸売業',
            '347': '小売業',
            '348': '銀行業',
            '349': '証券商品先物',
            '350': '保険業',
            '351': 'その他金融業',
            '352': '不動産業',
            '353': 'サービス業'
        };
    },

    getTseIndustryCodeByName(name) {
        const mapping = this.getTseIndustryCodeToNameMapping();
        for (const [code, industryName] of Object.entries(mapping)) {
            if (industryName === name) {
                return code;
            }
        }
        return null;
    },

    getTseIndustryNameByCode(code) {
        const mapping = this.getTseIndustryCodeToNameMapping();
        return mapping[code] || null;
    },

    getNikkeiMiddleIndustryCodeToNameMapping() {
        return {
            '231': '水産',
            '232': '鉱業',
            '233': '建設',
            '234': '食品',
            '235': '繊維',
            '236': 'パルプ・紙',
            '237': '化学',
            '238': '医薬品',
            '239': '石油',
            '240': 'ゴム',
            '241': '窯業',
            '242': '鉄鋼',
            '243': '非鉄金属製品',
            '244': '機械',
            '245': '電気機器',
            '246': '造船',
            '247': '自動車',
            '248': '輸送用機器',
            '249': '精密機器',
            '250': 'その他製造',
            '251': '商社',
            '252': '小売業',
            '253': '銀行',
            '254': 'その他金融',
            '255': '証券',
            '256': '保険',
            '257': '不動産',
            '258': '鉄道・バス',
            '259': '陸運',
            '260': '海運',
            '261': '空運',
            '262': '倉庫',
            '263': '通信',
            '264': '電力',
            '265': 'ガス',
            '266': 'サービス'
        };
    },

    getNikkeiMiddleIndustryCodeByName(name) {
        const mapping = this.getNikkeiMiddleIndustryCodeToNameMapping();
        for (const [code, industryName] of Object.entries(mapping)) {
            if (industryName === name) {
                return code;
            }
        }
        return null;
    },

    getNikkeiMiddleIndustryNameByCode(code) {
        const mapping = this.getNikkeiMiddleIndustryCodeToNameMapping();
        return mapping[code] || null;
    },

    getNikkeiSmallIndustryCodeToNameMapping() {
        return {
            '231341': '水産',
            '232361': '石炭鉱業',
            '232362': 'その他鉱業',
            '233401': '大手建設',
            '233402': '中堅建設',
            '233403': '土木道路浚渫',
            '233404': '電設工事',
            '233405': '住宅',
            '233406': 'その他建設',
            '234001': '飼料',
            '234002': '砂糖',
            '234003': '製粉',
            '234004': '食油',
            '234005': '酒類',
            '234006': '製菓・パン',
            '234007': 'ハム',
            '234008': '調味料',
            '234009': '乳製品',
            '234010': 'その他食品',
            '235021': '化合繊',
            '235022': '綿紡績',
            '235023': '絹紡績',
            '235024': '毛紡績',
            '235025': '繊維二次加工',
            '235026': 'その他繊維',
            '236041': '大手製紙',
            '236042': '他パルプ・紙',
            '237061': '大手化学',
            '237062': '肥料',
            '237063': '塩素・ソーダ',
            '237064': '石油化学',
            '237065': '合成樹脂',
            '237066': '酸素',
            '237067': '油脂・洗剤',
            '237068': '化粧品・歯磨',
            '237069': '塗料・インキ',
            '237070': '農薬・殺虫剤',
            '237071': 'その他化学',
            '238081': '大手医薬品',
            '238082': '医家向医薬品',
            '238083': '大衆向医薬品',
            '239101': '石油精製販売',
            '239102': '石炭石油製品',
            '240121': 'タイヤ',
            '240122': '他ゴム製品',
            '241141': 'ガラス',
            '241142': 'セメント一次',
            '241143': 'セメント二次',
            '241144': '陶器',
            '241145': '耐火煉瓦',
            '241146': 'カーボン・他',
            '242161': '銑鋼一貫',
            '242162': '平電炉・単圧',
            '242163': '特殊鋼',
            '242164': '合金鉄',
            '242165': '鋳鍛鋼',
            '242166': 'ステンレス',
            '242167': 'その他鉄鋼',
            '243181': '大手製錬',
            '243182': 'その他精錬',
            '243183': 'アルミ',
            '243184': '電線ケーブル',
            '243185': '鉄骨鉄塔橋梁',
            '243186': '他金属製品',
            '244201': '工作機械',
            '244202': 'プレス機械',
            '244203': '繊維機械',
            '244204': '運搬建設内燃',
            '244205': '農業機械',
            '244206': '化工機械',
            '244207': 'ミシン・編機',
            '244208': '軸受',
            '244209': '事務機',
            '244210': 'その他機械',
            '245221': '総合電機',
            '245222': '重電',
            '245223': '家庭電器',
            '245224': '通信機',
            '245225': '電子部品',
            '245226': '制御機器',
            '245227': '電池',
            '245228': '自動車関連',
            '245229': '他電気機器',
            '246241': '造船',
            '247261': '自動車',
            '247262': '自動車部品',
            '247263': '車体・その他',
            '248281': '車両',
            '248282': '自転車',
            '248283': '他輸送用機器',
            '249301': '時計',
            '249302': 'カメラ',
            '249303': '計器・その他',
            '250321': '印刷',
            '250322': '楽器',
            '250323': '建材',
            '250324': '事務用品',
            '250325': 'その他製造業',
            '251421': '総合商社',
            '251422': '自動車販売',
            '251423': '食品商社',
            '251424': '繊維商社',
            '251425': '機械金属商社',
            '251426': '化学商社',
            '251427': '建材商社',
            '251428': '電機関連商社',
            '251429': 'その他商社',
            '252441': '百貨店',
            '252442': 'スーパー',
            '252443': '月販店',
            '252444': 'その他小売業',
            '253461': '長期信用銀行',
            '253462': '都市銀行',
            '253463': '地方銀行',
            '253464': '信託銀行',
            '253465': '相互銀行',
            '253466': '証券金融',
            '254511': 'その他金融業',
            '255481': '証券',
            '256501': '保険',
            '257521': '賃貸',
            '257522': '分譲',
            '258541': '大手私鉄',
            '258542': '中小私鉄',
            '258543': 'バス・その他',
            '259561': '陸運',
            '260581': '大手海運',
            '260582': '内航',
            '260583': '外航・その他',
            '261601': '空運',
            '262621': '倉庫',
            '262622': '運輸関連',
            '263641': '通信',
            '264661': '電力',
            '265681': 'ガス',
            '266701': '映画',
            '266702': '娯楽施設',
            '266703': 'ホテル',
            '266704': '他サービス業'
        };
    },

    getNikkeiSmallIndustryCodeByName(name) {
        const mapping = this.getNikkeiSmallIndustryCodeToNameMapping();
        for (const [code, industryName] of Object.entries(mapping)) {
            if (industryName === name) {
                return code;
            }
        }
        return null;
    },

    getNikkeiSmallIndustryNameByCode(code) {
        const mapping = this.getNikkeiSmallIndustryCodeToNameMapping();
        return mapping[code] || null;
    },

    getIndustryList(industryType) {
        const industryMap = new Map();

        this.companies.forEach(company => {
            let industries = [];

            if (industryType === 'nikkei') {
                if (company.nikkeiIndustry && company.nikkeiIndustry.trim() !== '') {
                    industries = [company.nikkeiIndustry];
                }
            } else if (industryType === 'nikkei-middle') {
                if (company.nikkeiIndustryMiddle && company.nikkeiIndustryMiddle.trim() !== '') {
                    industries = [company.nikkeiIndustryMiddle];
                }
            } else if (industryType === 'factset') {
                if (company.factsetIndustry && company.factsetIndustry.trim() !== '') {
                    industries = company.factsetIndustry.split('\n').map(ind => ind.trim()).filter(ind => ind);
                }
            } else if (industryType === 'tse') {
                if (company.kyokaiIndustry && company.kyokaiIndustry.trim() !== '') {
                    industries = [company.kyokaiIndustry.trim()];
                }
            }

            industries.forEach(industry => {
                if (!industryMap.has(industry)) {
                    industryMap.set(industry, 0);
                }
                industryMap.set(industry, industryMap.get(industry) + 1);
            });
        });

        const industries = Array.from(industryMap.entries())
            .map(([name, count]) => ({ name, count }));

        if (industryType === 'tse') {
            industries.sort((a, b) => {
                const codeA = this.getTseIndustryCodeByName(a.name);
                const codeB = this.getTseIndustryCodeByName(b.name);
                if (codeA && codeB) {
                    return parseInt(codeA) - parseInt(codeB);
                }
                return a.name.localeCompare(b.name, 'ja');
            });
        } else if (industryType === 'nikkei-middle') {
            industries.sort((a, b) => {
                const codeA = this.getNikkeiMiddleIndustryCodeByName(a.name);
                const codeB = this.getNikkeiMiddleIndustryCodeByName(b.name);
                if (codeA && codeB) {
                    return parseInt(codeA) - parseInt(codeB);
                }
                return a.name.localeCompare(b.name, 'ja');
            });
        } else if (industryType === 'nikkei') {
            industries.sort((a, b) => {
                const codeA = this.getNikkeiSmallIndustryCodeByName(a.name);
                const codeB = this.getNikkeiSmallIndustryCodeByName(b.name);
                if (codeA && codeB) {
                    return parseInt(codeA) - parseInt(codeB);
                }
                return a.name.localeCompare(b.name, 'ja');
            });
        } else {
            industries.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        }

        return industries;
    },

    getCompaniesByIndustry(industryType, industryName) {
        return this.companies.filter(company => {
            if (industryType === 'nikkei') {
                return company.nikkeiIndustry === industryName;
            } else if (industryType === 'nikkei-middle') {
                return company.nikkeiIndustryMiddle === industryName;
            } else if (industryType === 'factset') {
                if (!company.factsetIndustry) return false;
                const industries = company.factsetIndustry.split('\n').map(ind => ind.trim()).filter(ind => ind);
                return industries.includes(industryName);
            } else if (industryType === 'tse') {
                return company.kyokaiIndustry && company.kyokaiIndustry.trim() === industryName;
            }
            return false;
        }).sort((a, b) => {
            return a.stockCode.localeCompare(b.stockCode);
        });
    },

    getCompaniesByMarket(marketType) {
        const marketKeywords = {
            'prime': 'ﾌﾟﾗｲﾑ',
            'standard': 'ｽﾀﾝﾀﾞｰﾄﾞ',
            'growth': 'ｸﾞﾛｰｽ'
        };

        const keyword = marketKeywords[marketType];
        if (!keyword) return [];

        return this.companies.filter(company => {
            return company.listedMarkets && company.listedMarkets.includes(keyword);
        }).sort((a, b) => {
            return a.stockCode.localeCompare(b.stockCode);
        });
    },

    getCompaniesByIndex(indexCode) {
        const indexKeywords = {
            '101': '日経平均',
            '102': '日経500',
            '103': '日経300',
            '105': 'JPX日経400'
        };

        const keyword = indexKeywords[indexCode];
        if (!keyword) return [];

        return this.companies.filter(company => {
            return company.indexAdoption && company.indexAdoption.includes(keyword);
        }).sort((a, b) => {
            return a.stockCode.localeCompare(b.stockCode);
        });
    },

    getIndexNameByCode(indexCode) {
        const indexNames = {
            '101': '日経平均',
            '102': '日経500',
            '103': '日経300',
            '105': 'JPX日経400'
        };
        return indexNames[indexCode] || null;
    },

    isShareholderExcluded(shareholderName) {
        const excludePatterns = [
            /＜信託口＞/,
            /従業員持株会/,
            /社員持株会/,
            /取引先持株会/,
            /グループ従業員持株会/,
            /グループ社員持株会/
        ];

        return excludePatterns.some(pattern => pattern.test(shareholderName));
    },

    getFilteredShareholders(company) {
        if (!company.shareholders || company.shareholders.length === 0) {
            return [];
        }

        return company.shareholders.filter(shareholder => !this.isShareholderExcluded(shareholder.name));
    },

    getAllMajorShareholders() {
        const shareholderMap = new Map();

        this.companies.forEach(company => {
            const filteredShareholders = this.getFilteredShareholders(company);

            filteredShareholders.forEach(shareholder => {
                if (!shareholderMap.has(shareholder.name)) {
                    shareholderMap.set(shareholder.name, []);
                }

                shareholderMap.get(shareholder.name).push({
                    code: company.stockCode,
                    company: company.qr1ShortName || company.formalName,
                    shares: shareholder.shares,
                    percentage: shareholder.percentage
                });
            });
        });

        const shareholderList = Array.from(shareholderMap.entries()).map(([name, investments]) => ({
            name: name,
            investmentCount: investments.length,
            investments: investments.sort((a, b) => b.percentage - a.percentage)
        }));

        return shareholderList.sort((a, b) => b.investmentCount - a.investmentCount);
    },

    getCompaniesByMajorShareholder(shareholderName) {
        const companies = [];

        this.companies.forEach(company => {
            const shareholder = company.shareholders.find(sh => sh.name === shareholderName);

            if (shareholder) {
                companies.push({
                    code: company.stockCode,
                    name: company.qr1ShortName || company.formalName,
                    shares: shareholder.shares,
                    percentage: shareholder.percentage
                });
            }
        });

        return companies.sort((a, b) => b.percentage - a.percentage);
    },

    calculateAverageExchangeRate(fiscalPeriod, earningsSchedule) {
        if (!fiscalPeriod) return null;

        const match = fiscalPeriod.match(/(\d+)\/末/);
        if (!match) return null;

        const fiscalMonth = parseInt(match[1]);

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        let isAfterAnnouncement = false;

        if (earningsSchedule) {
            const announcementMatch = earningsSchedule.match(/本連:\s*(\d{4})\/(\d{2})\/(\d{2})/);
            if (announcementMatch) {
                const announceYear = parseInt(announcementMatch[1]);
                const announceMonth = parseInt(announcementMatch[2]);
                const announceDay = parseInt(announcementMatch[3]);

                const announceDate = new Date(announceYear, announceMonth - 1, announceDay);
                isAfterAnnouncement = currentDate >= announceDate;
            } else {
                let lastFiscalYear;
                if (currentMonth > fiscalMonth) {
                    lastFiscalYear = currentYear;
                } else {
                    lastFiscalYear = currentYear - 1;
                }

                let estimatedAnnounceMonth = fiscalMonth + 3;
                let estimatedAnnounceYear = lastFiscalYear;

                if (estimatedAnnounceMonth > 12) {
                    estimatedAnnounceMonth -= 12;
                    estimatedAnnounceYear++;
                }

                if (currentYear > estimatedAnnounceYear ||
                    (currentYear === estimatedAnnounceYear && currentMonth >= estimatedAnnounceMonth)) {
                    isAfterAnnouncement = true;
                }
            }
        } else {
            let lastFiscalYear;
            if (currentMonth > fiscalMonth) {
                lastFiscalYear = currentYear;
            } else {
                lastFiscalYear = currentYear - 1;
            }

            let estimatedAnnounceMonth = fiscalMonth + 3;
            let estimatedAnnounceYear = lastFiscalYear;

            if (estimatedAnnounceMonth > 12) {
                estimatedAnnounceMonth -= 12;
                estimatedAnnounceYear++;
            }

            if (currentYear > estimatedAnnounceYear ||
                (currentYear === estimatedAnnounceYear && currentMonth >= estimatedAnnounceMonth)) {
                isAfterAnnouncement = true;
            }
        }

        let fiscalYearStartYear, fiscalYearStartMonth;

        if (isAfterAnnouncement) {
            if (fiscalMonth === 12) {
                fiscalYearStartYear = currentYear;
                fiscalYearStartMonth = 1;
            } else {
                if (currentMonth > fiscalMonth) {
                    fiscalYearStartYear = currentYear;
                    fiscalYearStartMonth = fiscalMonth + 1;
                } else {
                    fiscalYearStartYear = currentYear - 1;
                    fiscalYearStartMonth = fiscalMonth + 1;
                }
            }
        } else {
            if (fiscalMonth === 12) {
                fiscalYearStartYear = currentYear - 1;
                fiscalYearStartMonth = 1;
            } else {
                if (currentMonth > fiscalMonth) {
                    fiscalYearStartYear = currentYear - 1;
                    fiscalYearStartMonth = fiscalMonth + 1;
                } else {
                    fiscalYearStartYear = currentYear - 2;
                    fiscalYearStartMonth = fiscalMonth + 1;
                }
            }
        }

        const rates = [];
        let year = fiscalYearStartYear;
        let month = fiscalYearStartMonth;

        for (let i = 0; i < 12; i++) {
            const key = `${year}-${String(month).padStart(2, '0')}`;

            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                break;
            }

            if (MONTHLY_EXCHANGE_RATES[key] !== undefined) {
                rates.push(MONTHLY_EXCHANGE_RATES[key]);
            }

            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        if (rates.length === 0) return null;

        const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        return {
            averageRate: average,
            dataPoints: rates.length
        };
    },

    calculateExchangeRateImpact(company) {
        if (!company.exchangeRateInfo || !company.exchangeRateInfo.assumedRate) {
            return null;
        }

        if (company.exchangeRateInfo.sensitivityValue === null || company.exchangeRateInfo.sensitivityValue === undefined) {
            return {
                assumedRate: company.exchangeRateInfo.assumedRate,
                averageRate: null,
                rateDifference: null,
                impact: null,
                sensitivityDirection: company.exchangeRateInfo.sensitivityDirection,
                sensitivityValue: null,
                message: '感応度データなし'
            };
        }

        const avgRateInfo = this.calculateAverageExchangeRate(company.fiscalPeriod, company.earningsSchedule);
        if (!avgRateInfo) {
            return {
                assumedRate: company.exchangeRateInfo.assumedRate,
                averageRate: null,
                rateDifference: null,
                impact: null,
                sensitivityDirection: company.exchangeRateInfo.sensitivityDirection,
                sensitivityValue: company.exchangeRateInfo.sensitivityValue,
                message: '会計年度データ取得不可'
            };
        }

        const rateDifference = avgRateInfo.averageRate - company.exchangeRateInfo.assumedRate;

        let impact;
        if (company.exchangeRateInfo.sensitivityDirection === '円安') {
            impact = rateDifference * company.exchangeRateInfo.sensitivityValue;
        } else {
            impact = -rateDifference * company.exchangeRateInfo.sensitivityValue;
        }

        return {
            assumedRate: company.exchangeRateInfo.assumedRate,
            averageRate: avgRateInfo.averageRate,
            rateDifference: rateDifference,
            impact: impact,
            sensitivityDirection: company.exchangeRateInfo.sensitivityDirection,
            sensitivityValue: company.exchangeRateInfo.sensitivityValue,
            dataPoints: avgRateInfo.dataPoints,
            message: null
        };
    },

    async fetchForecastOperatingProfit(stockCode) {
        const API_BASE_URL = 'http://localhost:5001';

        try {
            const response = await fetch(`${API_BASE_URL}/api/earnings/${stockCode}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || 'データ取得に失敗しました',
                    stockCode: stockCode
                };
            }

            const data = await response.json();
            return data;

        } catch (error) {
            return {
                success: false,
                error: `ネットワークエラー: ${error.message}`,
                stockCode: stockCode
            };
        }
    },

    async calculateExchangeRateImpactWithForecast(company) {
        const exchangeImpact = this.calculateExchangeRateImpact(company);

        if (!exchangeImpact || exchangeImpact.message || exchangeImpact.impact === null) {
            return {
                ...exchangeImpact,
                forecastOperatingProfit: null,
                impactRatio: null,
                forecastError: exchangeImpact?.message || '為替影響データなし'
            };
        }

        const forecastData = await this.fetchForecastOperatingProfit(company.stockCode);

        if (!forecastData.success) {
            return {
                ...exchangeImpact,
                forecastOperatingProfit: null,
                impactRatio: null,
                forecastError: forecastData.error
            };
        }

        const impactRatio = (exchangeImpact.impact / forecastData.operatingProfit) * 100;

        return {
            ...exchangeImpact,
            forecastOperatingProfit: forecastData.operatingProfit,
            fiscalPeriod: forecastData.fiscalPeriod,
            impactRatio: impactRatio,
            forecastError: null
        };
    },

    parseEarningsSchedule(earningsScheduleText) {
        if (!earningsScheduleText || earningsScheduleText.trim() === '') {
            return [];
        }

        const schedules = [];
        const lines = earningsScheduleText.split('\n').map(line => line.trim()).filter(line => line);

        const schedulePattern = /^([^:：]+)[：:]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/;

        for (const line of lines) {
            const match = schedulePattern.exec(line);
            if (match) {
                const quarter = match[1].trim();
                const year = parseInt(match[2]);
                const month = parseInt(match[3]);
                const day = parseInt(match[4]);
                const hour = match[5] ? parseInt(match[5]) : null;
                const minute = match[6] ? parseInt(match[6]) : null;

                const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                schedules.push({
                    quarter: quarter,
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute,
                    dateString: dateString,
                    fullText: line
                });
            }
        }

        return schedules;
    },

    getEarningsCalendar(year, month) {
        const calendarData = {
            year: year,
            month: month,
            days: [],
            firstDayOfWeek: null,
            totalDays: null
        };

        const firstDate = new Date(year, month - 1, 1);
        const lastDate = new Date(year, month, 0);

        calendarData.firstDayOfWeek = firstDate.getDay();
        calendarData.totalDays = lastDate.getDate();

        const dateToCompaniesMap = new Map();

        this.companies.forEach((company) => {
            const schedules = this.parseEarningsSchedule(company.earningsSchedule);

            schedules.forEach(schedule => {
                if (schedule.year === year && schedule.month === month) {
                    const key = schedule.dateString;

                    if (!dateToCompaniesMap.has(key)) {
                        dateToCompaniesMap.set(key, []);
                    }

                    dateToCompaniesMap.get(key).push({
                        stockCode: company.stockCode,
                        name: company.qr1ShortName || company.formalName,
                        quarter: schedule.quarter,
                        hour: schedule.hour,
                        minute: schedule.minute,
                        listedMarkets: company.listedMarkets
                    });
                }
            });
        });

        for (let day = 1; day <= calendarData.totalDays; day++) {
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const companies = dateToCompaniesMap.get(dateString) || [];

            companies.sort((a, b) => {
                const aHasTime = a.hour !== null && a.minute !== null;
                const bHasTime = b.hour !== null && b.minute !== null;

                if (aHasTime && !bHasTime) return -1;
                if (!aHasTime && bHasTime) return 1;

                if (aHasTime && bHasTime) {
                    const aMinutes = a.hour * 60 + a.minute;
                    const bMinutes = b.hour * 60 + b.minute;
                    if (aMinutes !== bMinutes) return aMinutes - bMinutes;
                }

                if (!a.stockCode || !b.stockCode) return 0;
                return a.stockCode.localeCompare(b.stockCode);
            });

            calendarData.days.push({
                day: day,
                dateString: dateString,
                count: companies.length,
                companies: companies
            });
        }

        return calendarData;
    },

    getCompaniesByEarningsDate(dateString) {
        const companies = [];

        this.companies.forEach(company => {
            const schedules = this.parseEarningsSchedule(company.earningsSchedule);

            const hasScheduleOnDate = schedules.some(schedule => schedule.dateString === dateString);

            if (hasScheduleOnDate) {
                const schedule = schedules.find(s => s.dateString === dateString);

                const hasExchangeImpact = company.exchangeRateInfo && company.exchangeRateInfo.assumedRate !== null;
                const isNikkei225 = company.indexAdoption && company.indexAdoption.includes('日経平均');

                companies.push({
                    stockCode: company.stockCode,
                    name: company.qr1ShortName || company.formalName,
                    quarter: schedule.quarter,
                    hour: schedule.hour,
                    minute: schedule.minute,
                    listedMarkets: company.listedMarkets,
                    primaryMarket: company.primaryMarket,
                    hasExchangeImpact: hasExchangeImpact,
                    isNikkei225: isNikkei225
                });
            }
        });

        return companies.sort((a, b) => {
            const aHasTime = a.hour !== null && a.minute !== null;
            const bHasTime = b.hour !== null && b.minute !== null;

            if (aHasTime && !bHasTime) return -1;
            if (!aHasTime && bHasTime) return 1;

            if (aHasTime && bHasTime) {
                const aMinutes = a.hour * 60 + a.minute;
                const bMinutes = b.hour * 60 + b.minute;
                if (aMinutes !== bMinutes) return aMinutes - bMinutes;
            }

            if (!a.stockCode || !b.stockCode) return 0;
            return a.stockCode.localeCompare(b.stockCode);
        });
    }
};
