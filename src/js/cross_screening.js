const CrossScreeningManager = {
    elements: {},
    currentFilters: {
        statusList: ['継続', '新規', '除外'],
        marketList: ['ﾌﾟﾗｲﾑ', 'ｽﾀﾝﾀﾞｰﾄﾞ', 'ｸﾞﾛｰｽ'],
        tseIndustryList: [],
        nikkeiIndustryList: [],
        indexNK225: false,
        indexJPX400: false,
        indexTOPIX: false,
        peakUpdate: false,
        newBuyback: false,
        dividendIncrease: false,
        turnoverRate: 0
    },
    tempFilters: null,
    filteredStocks: [],
    CONTINUATION_THRESHOLD: 30141871909,
    currentSort: {
        column: 'cumulativeRatio',
        ascending: true
    },

    defaultColumnOrder: [
        'index', 'status', 'code', 'name', 'market', 'industry',
        'januaryMarketCap', 'floatingMarketCap', 'marketCapChangeRate',
        'currentDividend', 'dividendChangeRate',
        'forecastProfit', 'profitType', 'peakProfit', 'peakUpdate',
        'assumedExchangeRate', 'averageExchangeRate', 'exchangeDivergenceRate',
        'cumulativeRatio', 'oldWeight', 'newWeight', 'weightChange', 'tradingImpact', 'impactDays',
        'liquidity25d', 'marginBuyRatio', 'marginSellRatio',
        'newBuyback2025', 'buybackAmount',
        'requiredGrowth'
    ],

    columnDefinitions: {
        index: { name: '順位', category: 'basic', required: true, sortable: true, description: 'フィルター・ソート適用後の表示順位' },
        status: { name: 'ステータス', category: 'basic', required: true, sortable: true, description: 'TOPIX入替における銘柄の状態（新規採用/継続/除外）' },
        code: { name: '証券コード', category: 'basic', required: true, sortable: false, description: '4桁の証券コード' },
        name: { name: '企業名', category: 'basic', required: true, sortable: false, description: '銘柄の正式名称' },
        market: { name: '市場', category: 'basic', required: false, sortable: false, description: '上場市場区分（プライム/スタンダード/グロース）' },
        industry: { name: '東証業種', category: 'basic', required: true, sortable: false, description: '東証33業種' },
        januaryMarketCap: { name: '1月浮動株時価総額', category: 'marketcap', required: false, sortable: true, description: '2025年1月時点の浮動株時価総額（TOPIX算出用株式数×株価、億円単位）。株式分割調整済み' },
        floatingMarketCap: { name: '10月浮動株時価総額', category: 'marketcap', required: false, sortable: true, description: '2025年10月末時点の浮動株時価総額（TOPIX算出用株式数×株価、億円単位）' },
        marketCapChangeRate: { name: '時価総額変化率', category: 'marketcap', required: false, sortable: true, description: '1月から10月にかけての浮動株時価総額変化率（%）' },
        currentDividend: { name: '今期配当', category: 'dividend', required: false, sortable: true, description: '今期予想の1株あたり配当金額（円）' },
        dividendChangeRate: { name: '増配率', category: 'dividend', required: false, sortable: true, description: '前期比の配当増減率（%）' },
        forecastProfit: { name: '予想利益', category: 'profit', required: false, sortable: true, description: 'QUICKコンセンサス（3社以上）を優先、なければ会社予想の利益（億円単位）。営業利益または純利益' },
        profitType: { name: '利益指標', category: 'profit', required: false, sortable: false, description: '使用している利益指標の種別（営業利益 or 純利益）' },
        peakProfit: { name: '最高利益', category: 'profit', required: false, sortable: true, description: '過去最高の利益（日経会社情報から抽出、億円単位）' },
        peakUpdate: { name: '最高益更新', category: 'characteristic', required: false, sortable: false, description: '予想利益が過去最高を更新する銘柄' },
        cumulativeRatio: { name: '累積比率', category: 'topix', required: false, sortable: true, description: 'TOPIX構成銘柄の時価総額累積比率。上位から何%を占めるか' },
        oldWeight: { name: '旧ウェイト', category: 'topix', required: false, sortable: true, description: '入替前のTOPIX内でのウェイト（構成比率）' },
        newWeight: { name: '新ウェイト', category: 'topix', required: false, sortable: true, description: '入替後のTOPIX内でのウェイト（構成比率）' },
        weightChange: { name: 'ウェイト変化', category: 'topix', required: false, sortable: true, description: 'TOPIXウェイトの変化量<br>（新ウェイト - 旧ウェイト）' },
        tradingImpact: { name: '売買インパクト', category: 'topix', required: false, sortable: true, description: 'TOPIX連動ファンドによる売買額の推定値（億円）。正値は買い、負値は売り' },
        impactDays: { name: 'インパクト日数', category: 'topix', required: false, sortable: true, description: '売買インパクトを消化するのに必要な日数。2025年10月の日次売買代金中央値（円単位）に対する比率で計算' },
        liquidity25d: { name: '25日売買高', category: 'margin', required: false, sortable: true, description: '直近25日間の平均売買高（万株単位、小数点第一位まで表示）。信用残レシオの計算に使用' },
        marginBuyRatio: { name: '信用買残レシオ', category: 'margin', required: false, sortable: true, description: '信用買残（千株） ÷ 25日平均売買高（千株） × 100。高いほど買い方の残高が多い' },
        marginSellRatio: { name: '信用売残レシオ', category: 'margin', required: false, sortable: true, description: '信用売残（千株） ÷ 25日平均売買高（千株） × 100。高いほど売り方の残高が多い' },
        assumedExchangeRate: { name: '想定為替レート', category: 'other', required: false, sortable: true, description: '企業が業績予想で使用している想定USD/JPY為替レート（円/ドル）' },
        averageExchangeRate: { name: '平均実勢レート', category: 'other', required: false, sortable: true, description: '決算期開始から現在までのUSD/JPY為替レートの平均値（円/ドル）' },
        exchangeDivergenceRate: { name: '為替乖離率', category: 'other', required: false, sortable: true, description: '想定レートと実勢レートの乖離率（%）。プラスは円安（上方修正期待）、マイナスは円高（下方修正リスク）' },
        newBuyback2025: { name: '新規自社株買い', category: 'characteristic', required: false, sortable: false, description: '2025年に自社株買いを新規で開始した銘柄（2022-2024年は実施なし）' },
        buybackAmount: { name: '自社株買い金額', category: 'buyback', required: false, sortable: true, description: '2025年の自社株買い取得金額上限の合計（億円単位）' },
        requiredGrowth: { name: '必要株価上昇率', category: 'other', required: false, sortable: true, description: '除外銘柄が継続基準（301億円）を満たすために必要な株価上昇率' }
    },

    visibleColumns: [],

    init() {
        this.loadVisibleColumns();
        this.renderColumnSelectorContent();

        this.elements = {
            crossScreening: document.getElementById('cross-screening'),
            crossScreeningCount: document.getElementById('cross-screening-count'),
            crossScreeningTableBody: document.getElementById('cross-screening-table-body'),
            crossScreeningTable: document.getElementById('cross-screening-table'),
            closeCrossScreening: document.getElementById('close-cross-screening'),
            filterSummary: document.getElementById('filter-summary'),
            openColumnSelector: document.getElementById('open-column-selector'),
            closeColumnSelector: document.getElementById('close-column-selector'),
            cancelColumnSelector: document.getElementById('cancel-column-selector'),
            applyColumnSelector: document.getElementById('apply-column-selector'),
            columnSelectorDialog: document.getElementById('column-selector-dialog'),
            filtersTab: document.getElementById('filters-tab'),
            tseIndustryButtons: document.getElementById('tse-industry-buttons'),
            nikkeiIndustryButtons: document.getElementById('nikkei-industry-buttons'),
            tabButtons: document.querySelectorAll('.tab-button')
        };

        this.initFilterButtons();
        this.bindEvents();
        this.renderTableHeaders();
    },

    initFilterButtons() {
        const tseIndustries = DataManager.getIndustryList('tse');
        tseIndustries.forEach(industry => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = 'tse-industry';
            button.dataset.value = industry.name;
            button.textContent = industry.name;
            this.elements.tseIndustryButtons.appendChild(button);
        });

        const nikkeiIndustries = DataManager.getIndustryList('nikkei-middle');
        nikkeiIndustries.forEach(industry => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = 'nikkei-industry';
            button.dataset.value = industry.name;
            button.textContent = industry.name;
            this.elements.nikkeiIndustryButtons.appendChild(button);
        });
    },

    bindEvents() {
        this.elements.closeCrossScreening.addEventListener('click', () => {
            this.hideCrossScreening();
        });

        this.elements.openColumnSelector.addEventListener('click', () => {
            this.openDialog();
        });

        this.elements.closeColumnSelector.addEventListener('click', () => {
            this.closeDialog();
        });

        this.elements.cancelColumnSelector.addEventListener('click', () => {
            this.closeDialog();
        });

        this.elements.applyColumnSelector.addEventListener('click', () => {
            this.applyDialog();
        });

        this.elements.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.toggleFilterButton(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('column-item')) {
                this.toggleColumnItem(e.target);
            }
        });

        this.elements.crossScreeningTable.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-column]');
            if (th) {
                this.sortByColumn(th.dataset.column);
            }
        });
    },

    openDialog() {
        this.tempFilters = JSON.parse(JSON.stringify(this.currentFilters));
        this.updateDialogFilterButtons();
        this.elements.columnSelectorDialog.classList.remove('hidden');
        this.switchTab('filters');
    },

    closeDialog() {
        this.tempFilters = null;
        this.elements.columnSelectorDialog.classList.add('hidden');
    },

    applyDialog() {
        this.currentFilters = JSON.parse(JSON.stringify(this.tempFilters));
        this.saveVisibleColumns();
        this.applyFilters();
        this.renderTableHeaders();
        this.closeDialog();
    },

    updateDialogFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            const filterType = button.dataset.filter;
            const value = button.dataset.value;

            switch (filterType) {
                case 'status':
                    button.classList.toggle('active', this.tempFilters.statusList.includes(value));
                    break;
                case 'market':
                    button.classList.toggle('active', this.tempFilters.marketList.includes(value));
                    break;
                case 'index':
                    if (value === 'nk225') button.classList.toggle('active', this.tempFilters.indexNK225);
                    if (value === 'jpx400') button.classList.toggle('active', this.tempFilters.indexJPX400);
                    if (value === 'topix') button.classList.toggle('active', this.tempFilters.indexTOPIX);
                    break;
                case 'characteristic':
                    if (value === 'peak-update') button.classList.toggle('active', this.tempFilters.peakUpdate);
                    if (value === 'new-buyback') button.classList.toggle('active', this.tempFilters.newBuyback);
                    if (value === 'dividend-increase') button.classList.toggle('active', this.tempFilters.dividendIncrease);
                    break;
                case 'turnover':
                    const turnoverValue = parseFloat(value);
                    button.classList.toggle('active', this.tempFilters.turnoverRate === turnoverValue);
                    break;
                case 'tse-industry':
                    button.classList.toggle('active', this.tempFilters.tseIndustryList.includes(value));
                    break;
                case 'nikkei-industry':
                    button.classList.toggle('active', this.tempFilters.nikkeiIndustryList.includes(value));
                    break;
            }
        });
    },

    toggleFilterButton(button) {
        const filterType = button.dataset.filter;
        const value = button.dataset.value;

        switch (filterType) {
            case 'status':
                const statusIndex = this.tempFilters.statusList.indexOf(value);
                if (statusIndex > -1) {
                    this.tempFilters.statusList.splice(statusIndex, 1);
                } else {
                    this.tempFilters.statusList.push(value);
                }
                button.classList.toggle('active');
                break;

            case 'market':
                const marketIndex = this.tempFilters.marketList.indexOf(value);
                if (marketIndex > -1) {
                    this.tempFilters.marketList.splice(marketIndex, 1);
                } else {
                    this.tempFilters.marketList.push(value);
                }
                button.classList.toggle('active');
                break;

            case 'index':
                if (value === 'nk225') {
                    this.tempFilters.indexNK225 = !this.tempFilters.indexNK225;
                    button.classList.toggle('active');
                } else if (value === 'jpx400') {
                    this.tempFilters.indexJPX400 = !this.tempFilters.indexJPX400;
                    button.classList.toggle('active');
                } else if (value === 'topix') {
                    this.tempFilters.indexTOPIX = !this.tempFilters.indexTOPIX;
                    button.classList.toggle('active');
                }
                break;

            case 'characteristic':
                if (value === 'peak-update') {
                    this.tempFilters.peakUpdate = !this.tempFilters.peakUpdate;
                    button.classList.toggle('active');
                } else if (value === 'new-buyback') {
                    this.tempFilters.newBuyback = !this.tempFilters.newBuyback;
                    button.classList.toggle('active');
                } else if (value === 'dividend-increase') {
                    this.tempFilters.dividendIncrease = !this.tempFilters.dividendIncrease;
                    button.classList.toggle('active');
                }
                break;

            case 'turnover':
                const turnoverButtons = document.querySelectorAll('[data-filter="turnover"]');
                turnoverButtons.forEach(btn => btn.classList.remove('active'));
                this.tempFilters.turnoverRate = parseFloat(value);
                button.classList.add('active');
                break;

            case 'tse-industry':
                this.tempFilters.nikkeiIndustryList = [];
                const nikkeiButtons = document.querySelectorAll('[data-filter="nikkei-industry"]');
                nikkeiButtons.forEach(btn => btn.classList.remove('active'));

                const tseIndex = this.tempFilters.tseIndustryList.indexOf(value);
                if (tseIndex > -1) {
                    this.tempFilters.tseIndustryList.splice(tseIndex, 1);
                } else {
                    this.tempFilters.tseIndustryList.push(value);
                }
                button.classList.toggle('active');
                break;

            case 'nikkei-industry':
                this.tempFilters.tseIndustryList = [];
                const tseButtons = document.querySelectorAll('[data-filter="tse-industry"]');
                tseButtons.forEach(btn => btn.classList.remove('active'));

                const nikkeiIndex = this.tempFilters.nikkeiIndustryList.indexOf(value);
                if (nikkeiIndex > -1) {
                    this.tempFilters.nikkeiIndustryList.splice(nikkeiIndex, 1);
                } else {
                    this.tempFilters.nikkeiIndustryList.push(value);
                }
                button.classList.toggle('active');
                break;
        }
    },

    switchTab(tabName) {
        this.elements.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        if (tabName === 'filters') {
            this.elements.filtersTab.style.display = 'block';
            document.getElementById('column-selector-tab-content').querySelectorAll('.column-grid').forEach(grid => {
                grid.style.display = 'none';
            });
        } else {
            this.elements.filtersTab.style.display = 'none';
            this.showColumnTab(tabName);
        }
    },

    showColumnTab(category) {
        const tabContent = document.getElementById('column-selector-tab-content');
        const grids = tabContent.querySelectorAll('.column-grid');
        grids.forEach(grid => {
            grid.style.display = grid.dataset.category === category ? 'grid' : 'none';
        });
    },

    applyFilters() {
        this.filteredStocks = TOPIX_DATA.filter(stock => {
            if (this.currentFilters.statusList.length > 0 && !this.currentFilters.statusList.includes(stock.status)) {
                return false;
            }

            if (this.currentFilters.marketList.length > 0) {
                const hasMatchingMarket = this.currentFilters.marketList.some(market => stock.market.includes(market));
                if (!hasMatchingMarket) {
                    return false;
                }
            }

            const turnoverRate = parseFloat(stock.turnoverRate);
            if (!isNaN(turnoverRate) && turnoverRate < this.currentFilters.turnoverRate) {
                return false;
            }

            if (this.currentFilters.peakUpdate && stock.peakUpdate !== 'はい') {
                return false;
            }

            if (this.currentFilters.newBuyback && stock.newBuyback2025 !== 'はい') {
                return false;
            }

            if (this.currentFilters.dividendIncrease) {
                const dividendChangeRate = parseFloat(stock.dividendChangeRate);
                if (isNaN(dividendChangeRate) || dividendChangeRate <= 0) {
                    return false;
                }
            }

            const needsCompanyData = this.currentFilters.tseIndustryList.length > 0 ||
                                     this.currentFilters.nikkeiIndustryList.length > 0 ||
                                     this.currentFilters.indexNK225 ||
                                     this.currentFilters.indexJPX400 ||
                                     this.currentFilters.indexTOPIX;

            if (needsCompanyData) {
                const company = DataManager.getCompanyByStockCode(stock.code);
                if (!company) {
                    return false;
                }

                if (this.currentFilters.tseIndustryList.length > 0 && !this.currentFilters.tseIndustryList.includes(company.kyokaiIndustry)) {
                    return false;
                }

                if (this.currentFilters.nikkeiIndustryList.length > 0 && !this.currentFilters.nikkeiIndustryList.includes(company.nikkeiIndustryMiddle)) {
                    return false;
                }

                if (this.currentFilters.indexNK225 || this.currentFilters.indexJPX400 || this.currentFilters.indexTOPIX) {
                    let hasIndex = false;
                    if (this.currentFilters.indexNK225 && company.indexAdoption && company.indexAdoption.includes('101')) {
                        hasIndex = true;
                    }
                    if (this.currentFilters.indexJPX400 && company.indexAdoption && company.indexAdoption.includes('105')) {
                        hasIndex = true;
                    }
                    if (this.currentFilters.indexTOPIX && stock.status !== '除外') {
                        hasIndex = true;
                    }
                    if (!hasIndex) {
                        return false;
                    }
                }
            }

            return true;
        });

        this.sortByColumn(this.currentSort.column, this.currentSort.ascending);
        this.renderTable();
        this.updateFilterSummary();
    },

    updateFilterSummary() {
        const conditions = [];

        if (this.currentFilters.statusList.length > 0 && this.currentFilters.statusList.length < 3) {
            conditions.push(`ステータス: ${this.currentFilters.statusList.join(', ')}`);
        }

        if (this.currentFilters.marketList.length > 0 && this.currentFilters.marketList.length < 3) {
            conditions.push(`市場: ${this.currentFilters.marketList.join(', ')}`);
        }

        if (this.currentFilters.tseIndustryList.length > 0) {
            if (this.currentFilters.tseIndustryList.length <= 3) {
                conditions.push(`東証33業種: ${this.currentFilters.tseIndustryList.join(', ')}`);
            } else {
                conditions.push(`東証33業種: ${this.currentFilters.tseIndustryList.length}業種`);
            }
        }

        if (this.currentFilters.nikkeiIndustryList.length > 0) {
            if (this.currentFilters.nikkeiIndustryList.length <= 3) {
                conditions.push(`日経業種: ${this.currentFilters.nikkeiIndustryList.join(', ')}`);
            } else {
                conditions.push(`日経業種: ${this.currentFilters.nikkeiIndustryList.length}業種`);
            }
        }

        const indexConditions = [];
        if (this.currentFilters.indexNK225) indexConditions.push('日経平均');
        if (this.currentFilters.indexJPX400) indexConditions.push('JPX400');
        if (this.currentFilters.indexTOPIX) indexConditions.push('TOPIX');
        if (indexConditions.length > 0) {
            conditions.push(`指数: ${indexConditions.join(', ')}`);
        }

        const charConditions = [];
        if (this.currentFilters.peakUpdate) charConditions.push('最高益更新');
        if (this.currentFilters.newBuyback) charConditions.push('新規自社株買い');
        if (this.currentFilters.dividendIncrease) charConditions.push('今期増配');
        if (charConditions.length > 0) {
            conditions.push(`特性: ${charConditions.join(', ')}`);
        }

        if (this.currentFilters.turnoverRate > 0) {
            conditions.push(`回転率: ${this.currentFilters.turnoverRate}以上`);
        }

        const summaryText = conditions.length > 0
            ? `フィルター条件: ${conditions.join(' | ')}`
            : 'フィルター条件: 全件表示';

        this.elements.filterSummary.querySelector('span').textContent = summaryText;
    },

    sortByColumn(column, forceAscending = null) {
        if (!this.columnDefinitions[column] || !this.columnDefinitions[column].sortable) {
            return;
        }

        if (this.currentSort.column === column && forceAscending === null) {
            this.currentSort.ascending = !this.currentSort.ascending;
        } else {
            this.currentSort.column = column;
            this.currentSort.ascending = forceAscending !== null ? forceAscending : true;
        }

        this.filteredStocks.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            if (aVal === '' || aVal === null || aVal === undefined) return 1;
            if (bVal === '' || bVal === null || bVal === undefined) return -1;

            const aValClean = String(aVal).replace(/,/g, '').replace(/%/g, '');
            const bValClean = String(bVal).replace(/,/g, '').replace(/%/g, '');

            const aNum = parseFloat(aValClean);
            const bNum = parseFloat(bValClean);

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return this.currentSort.ascending ? aNum - bNum : bNum - aNum;
            }

            const aStr = String(aVal);
            const bStr = String(bVal);
            return this.currentSort.ascending ? aStr.localeCompare(bStr, 'ja') : bStr.localeCompare(aStr, 'ja');
        });

        this.renderTableHeaders();
        this.renderTable();
    },

    renderTableHeaders() {
        const thead = this.elements.crossScreeningTable.querySelector('thead');
        thead.innerHTML = '';

        const headerRow = document.createElement('tr');

        this.visibleColumns.forEach(column => {
            const th = document.createElement('th');
            const def = this.columnDefinitions[column];

            if (def.sortable) {
                th.dataset.column = column;
                th.style.cursor = 'pointer';

                let indicator = '';
                if (this.currentSort.column === column) {
                    indicator = this.currentSort.ascending ? ' ▲' : ' ▼';
                }

                th.innerHTML = `${def.name}<span class="sort-indicator">${indicator}</span>`;
            } else {
                th.textContent = def.name;
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
    },

    renderTable() {
        const tbody = this.elements.crossScreeningTableBody;
        tbody.innerHTML = '';

        this.filteredStocks.forEach((stock, index) => {
            const tr = document.createElement('tr');

            this.visibleColumns.forEach(column => {
                const td = document.createElement('td');
                const value = this.formatCellValue(column, stock, index);
                td.innerHTML = value;

                if (column === 'code') {
                    td.style.cursor = 'pointer';
                    td.addEventListener('click', () => {
                        window.location.hash = `company/${stock.code}`;
                    });
                }

                if (column === 'forecastProfit' && stock.peakUpdate === 'はい') {
                    td.classList.add('peak-profit-cell');
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        this.elements.crossScreeningCount.textContent = `(${this.filteredStocks.length}銘柄)`;
    },

    formatCellValue(column, stock, index) {
        const value = stock[column];

        if (column === 'index') {
            return index + 1;
        }

        if (column === 'code') {
            return `<a href="#${stock.code}" class="company-link">${value}</a>`;
        }

        if (column === 'name') {
            return value;
        }

        if (column === 'market') {
            const company = DataManager.getCompanyByStockCode(stock.code);
            if (company && company.listedMarkets) {
                return UIManager.generateMarketBadges(company.listedMarkets);
            }
            return '-';
        }

        if (column === 'status') {
            const colorMap = {
                '新規': '#28a745',
                '継続': '#007bff',
                '除外': '#dc3545'
            };
            const color = colorMap[value] || '#000';
            return `<span style="color: ${color}; font-weight: bold;">${value}</span>`;
        }

        if (column === 'industry') {
            const company = DataManager.getCompanyByStockCode(stock.code);
            if (company && company.kyokaiIndustry) {
                return company.kyokaiIndustry;
            }
            return '-';
        }

        if (column === 'requiredGrowth') {
            if (stock.status === '除外') {
                const continuationThreshold = 30100000000;
                const floatingMarketCapStr = String(stock.floatingMarketCap || '').replace(/,/g, '');
                const floatingMarketCap = parseFloat(floatingMarketCapStr);

                if (!isNaN(floatingMarketCap) && floatingMarketCap > 0) {
                    const requiredGrowth = ((continuationThreshold - floatingMarketCap) / floatingMarketCap) * 100;
                    return requiredGrowth.toFixed(2);
                }
            }
            return '-';
        }

        if (value === '' || value === null || value === undefined) {
            return '-';
        }

        const def = this.columnDefinitions[column];

        if (column === 'peakUpdate') {
            if (value === 'はい') {
                return '<span class="peak-update-badge">最高益更新</span>';
            }
            return '-';
        }

        if (column === 'newBuyback2025') {
            if (value === 'はい') {
                return '<span class="buyback-badge">新規自社株買い</span>';
            }
            return '-';
        }

        if (['januaryMarketCap', 'floatingMarketCap'].includes(column)) {
            const cleanValue = String(value).replace(/,/g, '');
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue)) {
                const billions = (numValue / 100000000).toFixed(0);
                return parseFloat(billions).toLocaleString('ja-JP');
            }
        }

        if (['forecastProfit', 'peakProfit', 'buybackAmount'].includes(column)) {
            const cleanValue = String(value).replace(/,/g, '');
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue)) {
                const billions = (numValue / 100).toFixed(0);
                return parseFloat(billions).toLocaleString('ja-JP');
            }
        }

        if (column === 'liquidity25d') {
            const cleanValue = String(value).replace(/,/g, '');
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue)) {
                const manKabu = (numValue / 100).toFixed(1);
                return parseFloat(manKabu).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            }
        }

        if (['assumedExchangeRate', 'averageExchangeRate'].includes(column)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                return numValue.toFixed(2);
            }
        }

        if (column === 'exchangeDivergenceRate') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                const sign = numValue > 0 ? '+' : '';
                return `${sign}${numValue.toFixed(2)}`;
            }
        }

        if (['marketCapChangeRate', 'dividendChangeRate', 'cumulativeRatio', 'oldWeight', 'newWeight', 'weightChange',
             'marginBuyRatio', 'marginSellRatio', 'requiredGrowth'].includes(column)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                return numValue.toFixed(2);
            }
        }

        if (column === 'tradingImpact') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                const formatted = (numValue / 100000000).toFixed(1);
                return numValue > 0 ? `+${formatted}` : formatted;
            }
        }

        if (column === 'impactDays') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                return numValue.toFixed(1);
            }
        }

        return value;
    },

    loadVisibleColumns() {
        const saved = localStorage.getItem('crossScreeningVisibleColumns');
        if (saved) {
            try {
                this.visibleColumns = JSON.parse(saved);
            } catch (e) {
                this.visibleColumns = this.defaultColumnOrder.slice();
            }
        } else {
            this.visibleColumns = this.defaultColumnOrder.slice();
        }

        const requiredColumns = Object.keys(this.columnDefinitions).filter(
            col => this.columnDefinitions[col].required
        );
        requiredColumns.forEach(col => {
            if (!this.visibleColumns.includes(col)) {
                const index = this.defaultColumnOrder.indexOf(col);
                if (index !== -1) {
                    this.visibleColumns.splice(index, 0, col);
                } else {
                    this.visibleColumns.push(col);
                }
            }
        });
    },

    saveVisibleColumns() {
        const items = document.querySelectorAll('.column-item');
        this.visibleColumns = [];

        items.forEach(item => {
            if (item.classList.contains('active')) {
                this.visibleColumns.push(item.dataset.column);
            }
        });

        localStorage.setItem('crossScreeningVisibleColumns', JSON.stringify(this.visibleColumns));
    },

    renderColumnSelectorContent() {
        const tabContent = document.getElementById('column-selector-tab-content');

        const categories = ['basic', 'marketcap', 'dividend', 'profit', 'topix', 'margin', 'buyback', 'other'];

        categories.forEach(category => {
            const grid = document.createElement('div');
            grid.className = 'column-grid';
            grid.dataset.category = category;
            grid.style.display = 'none';

            let itemIndex = 0;

            Object.entries(this.columnDefinitions).forEach(([key, def]) => {
                if (def.category === category) {
                    const item = document.createElement('div');
                    item.className = 'column-item';
                    item.dataset.column = key;

                    if (this.visibleColumns.includes(key)) {
                        item.classList.add('active');
                    }

                    if (def.required) {
                        item.classList.add('disabled');
                    }

                    const icon = document.createElement('span');
                    icon.className = 'column-icon';
                    icon.textContent = this.visibleColumns.includes(key) ? '✓' : '□';
                    item.appendChild(icon);

                    const name = document.createElement('span');
                    name.className = 'column-name';
                    name.textContent = def.name;
                    item.appendChild(name);

                    if (def.description) {
                        const helpIcon = document.createElement('span');
                        helpIcon.className = 'column-help-icon';
                        helpIcon.textContent = '?';

                        const tooltip = document.createElement('div');
                        tooltip.className = 'column-description-tooltip';

                        if (itemIndex % 2 === 1) {
                            tooltip.classList.add('left');
                        }

                        tooltip.innerHTML = def.description;
                        helpIcon.appendChild(tooltip);

                        item.appendChild(helpIcon);
                    }

                    grid.appendChild(item);
                    itemIndex++;
                }
            });

            tabContent.appendChild(grid);
        });
    },

    toggleColumnItem(item) {
        if (item.classList.contains('disabled')) {
            return;
        }

        item.classList.toggle('active');
        const icon = item.querySelector('.column-icon');
        icon.textContent = item.classList.contains('active') ? '✓' : '□';
    },

    showCrossScreening() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const companyDetail = document.getElementById('company-detail');
        const industryList = document.getElementById('industry-list');
        const industryCompanies = document.getElementById('industry-companies');
        const shareholderDetail = document.getElementById('shareholder-detail');
        const earningsCalendar = document.getElementById('earnings-calendar');
        const upwardRevisionRanking = document.getElementById('upward-revision-ranking');

        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (companyDetail) companyDetail.classList.add('hidden');
        if (industryList) industryList.classList.add('hidden');
        if (industryCompanies) industryCompanies.classList.add('hidden');
        if (shareholderDetail) shareholderDetail.classList.add('hidden');
        if (earningsCalendar) earningsCalendar.classList.add('hidden');
        if (upwardRevisionRanking) upwardRevisionRanking.classList.add('hidden');

        this.applyFilters();
        this.elements.crossScreening.classList.remove('hidden');
    },

    hideCrossScreening() {
        this.elements.crossScreening.classList.add('hidden');
        window.location.hash = '';
    }
};

function showCrossScreening() {
    CrossScreeningManager.showCrossScreening();
}
