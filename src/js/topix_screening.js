const TopixScreeningManager = {
    elements: {},
    currentFilters: {
        statusList: ['継続', '新規', '除外'],
        market: 'all',
        turnoverRate: 0
    },
    filteredStocks: [],
    CONTINUATION_THRESHOLD: 30141871909,
    currentSort: {
        column: 'cumulativeRatio',
        ascending: true
    },

    defaultColumnOrder: [
        'index', 'status', 'code', 'name', 'market',
        'januaryMarketCap', 'floatingMarketCap', 'marketCapChangeRate',
        'currentDividend', 'dividendChangeRate',
        'forecastProfit', 'profitType', 'peakProfit', 'peakUpdate',
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
        januaryMarketCap: { name: '1月浮動株時価総額', category: 'marketcap', required: false, sortable: true, description: '2025年1月時点の浮動株時価総額（TOPIX算出用株式数×株価）。株式分割調整済み' },
        floatingMarketCap: { name: '10月浮動株時価総額', category: 'marketcap', required: false, sortable: true, description: '2025年10月末時点の浮動株時価総額（TOPIX算出用株式数×株価）' },
        marketCapChangeRate: { name: '時価総額変化率', category: 'marketcap', required: false, sortable: true, description: '1月から10月にかけての浮動株時価総額変化率（%）' },
        currentDividend: { name: '今期配当', category: 'dividend', required: false, sortable: true, description: '今期予想の1株あたり配当金額（円）' },
        dividendChangeRate: { name: '増配率', category: 'dividend', required: false, sortable: true, description: '前期比の配当増減率（%）' },
        forecastProfit: { name: '予想利益', category: 'profit', required: false, sortable: true, description: 'QUICKコンセンサス（3社以上）を優先、なければ会社予想の利益（百万円）。営業利益または純利益' },
        profitType: { name: '利益指標', category: 'profit', required: false, sortable: false, description: '使用している利益指標の種別（営業利益 or 純利益）' },
        peakProfit: { name: '最高利益', category: 'profit', required: false, sortable: true, description: '過去最高の利益（日経会社情報から抽出、百万円）' },
        peakUpdate: { name: '最高益更新', category: 'profit', required: false, sortable: false, description: '予想利益が過去最高を更新する銘柄' },
        cumulativeRatio: { name: '累積比率', category: 'topix', required: false, sortable: true, description: 'TOPIX構成銘柄の時価総額累積比率。上位から何%を占めるか' },
        oldWeight: { name: '旧ウェイト', category: 'topix', required: false, sortable: true, description: '入替前のTOPIX内でのウェイト（構成比率）' },
        newWeight: { name: '新ウェイト', category: 'topix', required: false, sortable: true, description: '入替後のTOPIX内でのウェイト（構成比率）' },
        weightChange: { name: 'ウェイト変化', category: 'topix', required: false, sortable: true, description: 'TOPIXウェイトの変化量<br>（新ウェイト - 旧ウェイト）' },
        tradingImpact: { name: '売買インパクト', category: 'topix', required: false, sortable: true, description: 'TOPIX連動ファンドによる売買額の推定値（億円）。正値は買い、負値は売り' },
        impactDays: { name: 'インパクト日数', category: 'topix', required: false, sortable: true, description: '売買インパクトを消化するのに必要な日数。2025年10月の日次売買代金中央値（円単位）に対する比率で計算' },
        liquidity25d: { name: '25日売買高', category: 'margin', required: false, sortable: true, description: '直近25日間の平均売買高（千株単位）。信用残レシオの計算に使用' },
        marginBuyRatio: { name: '信用買残レシオ', category: 'margin', required: false, sortable: true, description: '信用買残（千株） ÷ 25日平均売買高（千株） × 100。高いほど買い方の残高が多い' },
        marginSellRatio: { name: '信用売残レシオ', category: 'margin', required: false, sortable: true, description: '信用売残（千株） ÷ 25日平均売買高（千株） × 100。高いほど売り方の残高が多い' },
        newBuyback2025: { name: '新規自社株買い', category: 'buyback', required: false, sortable: false, description: '2025年に自社株買いを新規で開始した銘柄（2022-2024年は実施なし）' },
        buybackAmount: { name: '自社株買い金額', category: 'buyback', required: false, sortable: true, description: '2025年の自社株買い取得金額上限の合計（百万円単位）' },
        requiredGrowth: { name: '必要株価上昇率', category: 'other', required: false, sortable: true, description: '除外銘柄が継続基準（301億円）を満たすために必要な株価上昇率' }
    },

    visibleColumns: [],

    init() {
        this.loadVisibleColumns();
        this.renderColumnSelectorContent();

        this.elements = {
            topixScreening: document.getElementById('topix-screening'),
            topixScreeningCount: document.getElementById('topix-screening-count'),
            topixScreeningTableBody: document.getElementById('topix-screening-table-body'),
            topixScreeningTable: document.getElementById('topix-screening-table'),
            closeTopixScreening: document.getElementById('close-topix-screening'),
            statusContinuedCheckbox: document.getElementById('topix-status-continued'),
            statusNewCheckbox: document.getElementById('topix-status-new'),
            statusExcludedCheckbox: document.getElementById('topix-status-excluded'),
            marketFilter: document.getElementById('topix-market-filter'),
            turnoverFilter: document.getElementById('topix-turnover-filter'),
            openColumnSelector: document.getElementById('open-column-selector'),
            closeColumnSelector: document.getElementById('close-column-selector'),
            cancelColumnSelector: document.getElementById('cancel-column-selector'),
            applyColumnSelector: document.getElementById('apply-column-selector'),
            columnSelectorDialog: document.getElementById('column-selector-dialog'),
            tabButtons: document.querySelectorAll('.tab-button'),
            columnItems: document.querySelectorAll('.column-item')
        };

        this.bindEvents();
        this.renderTableHeaders();
    },

    bindEvents() {
        this.elements.closeTopixScreening.addEventListener('click', () => {
            this.hideTopixScreening();
        });

        this.elements.statusContinuedCheckbox.addEventListener('change', () => {
            this.updateStatusFilter();
        });

        this.elements.statusNewCheckbox.addEventListener('change', () => {
            this.updateStatusFilter();
        });

        this.elements.statusExcludedCheckbox.addEventListener('change', () => {
            this.updateStatusFilter();
        });

        this.elements.marketFilter.addEventListener('change', (e) => {
            this.currentFilters.market = e.target.value;
            this.applyFilters();
        });

        this.elements.turnoverFilter.addEventListener('change', (e) => {
            this.currentFilters.turnoverRate = parseFloat(e.target.value);
            this.applyFilters();
        });

        this.elements.openColumnSelector.addEventListener('click', () => {
            this.openColumnSelectorDialog();
        });

        this.elements.closeColumnSelector.addEventListener('click', () => {
            this.closeColumnSelectorDialog();
        });

        this.elements.cancelColumnSelector.addEventListener('click', () => {
            this.closeColumnSelectorDialog();
        });

        this.elements.applyColumnSelector.addEventListener('click', () => {
            this.applyColumnSettings();
        });

        this.elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.getAttribute('data-tab'));
            });
        });

        this.elements.columnItems.forEach(item => {
            item.addEventListener('click', () => {
                this.toggleColumn(item);
            });
        });
    },

    updateStatusFilter() {
        const statusList = [];
        if (this.elements.statusContinuedCheckbox.checked) {
            statusList.push('継続');
        }
        if (this.elements.statusNewCheckbox.checked) {
            statusList.push('新規');
        }
        if (this.elements.statusExcludedCheckbox.checked) {
            statusList.push('除外');
        }
        this.currentFilters.statusList = statusList;
        this.applyFilters();
    },

    showTopixScreening() {
        if (!this.elements.topixScreening) {
            console.error('TOPIX screening element not found');
            return;
        }
        UIManager.hideAllScreens();
        this.elements.topixScreening.classList.remove('hidden');
        this.applyFilters();
        this.updateSortArrows();
    },

    hideTopixScreening() {
        this.elements.topixScreening.classList.add('hidden');
        UIManager.elements.welcomeScreen.classList.remove('hidden');
        window.location.hash = '';
    },

    applyFilters() {
        if (typeof TOPIX_DATA === 'undefined' || !Array.isArray(TOPIX_DATA)) {
            console.error('TOPIX_DATA is not available');
            this.filteredStocks = [];
            this.renderTable();
            return;
        }

        this.filteredStocks = TOPIX_DATA.filter(stock => {
            if (!this.currentFilters.statusList.includes(stock.status)) {
                return false;
            }

            if (this.currentFilters.market !== 'all' && !stock.market.includes(this.currentFilters.market)) {
                return false;
            }

            const turnoverRate = parseFloat(stock.turnoverRate);
            if (!isNaN(turnoverRate) && turnoverRate < this.currentFilters.turnoverRate) {
                return false;
            }

            return true;
        });

        this.applySorting();
        this.renderTable();
    },

    sortBy(column) {
        if (this.currentSort.column === column) {
            if (this.currentSort.ascending === true) {
                this.currentSort.ascending = false;
            } else if (this.currentSort.ascending === false) {
                this.currentSort.column = null;
                this.currentSort.ascending = true;
            }
        } else {
            this.currentSort.column = column;
            this.currentSort.ascending = true;
        }
        this.applySorting();
        this.renderTable();
        this.updateSortArrows();
    },

    applySorting() {
        const column = this.currentSort.column;
        const ascending = this.currentSort.ascending;

        if (column === null) {
            return;
        }

        this.filteredStocks.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'index':
                    return 0;

                case 'status':
                    const statusOrder = {'新規': 0, '継続': 1, '除外': 2};
                    valueA = statusOrder[a.status] ?? 999;
                    valueB = statusOrder[b.status] ?? 999;
                    break;

                case 'floatingMarketCap':
                    valueA = parseFloat(a.floatingMarketCap.replace(/,/g, ''));
                    valueB = parseFloat(b.floatingMarketCap.replace(/,/g, ''));
                    break;

                case 'cumulativeRatio':
                    valueA = parseFloat(a.cumulativeRatio.replace('%', ''));
                    valueB = parseFloat(b.cumulativeRatio.replace('%', ''));
                    break;

                case 'oldWeight':
                    valueA = parseFloat(a.oldWeight);
                    valueB = parseFloat(b.oldWeight);
                    break;

                case 'newWeight':
                    valueA = parseFloat(a.newWeight);
                    valueB = parseFloat(b.newWeight);
                    break;

                case 'weightChange':
                    valueA = parseFloat(a.weightChange);
                    valueB = parseFloat(b.weightChange);
                    break;

                case 'tradingImpact':
                    valueA = parseFloat(a.tradingImpact.replace(/,/g, ''));
                    valueB = parseFloat(b.tradingImpact.replace(/,/g, ''));
                    break;

                case 'impactDays':
                    valueA = parseFloat(a.impactDays) || 0;
                    valueB = parseFloat(b.impactDays) || 0;
                    break;

                case 'requiredGrowth':
                    valueA = this.parseRequiredGrowth(a);
                    valueB = this.parseRequiredGrowth(b);
                    break;

                case 'januaryMarketCap':
                    valueA = parseFloat(a.januaryMarketCap.replace(/,/g, '')) || 0;
                    valueB = parseFloat(b.januaryMarketCap.replace(/,/g, '')) || 0;
                    break;

                case 'marketCapChangeRate':
                    valueA = parseFloat(a.marketCapChangeRate) || 0;
                    valueB = parseFloat(b.marketCapChangeRate) || 0;
                    break;

                case 'currentDividend':
                    valueA = parseFloat(a.currentDividend) || 0;
                    valueB = parseFloat(b.currentDividend) || 0;
                    break;

                case 'dividendChangeRate':
                    valueA = parseFloat(a.dividendChangeRate) || 0;
                    valueB = parseFloat(b.dividendChangeRate) || 0;
                    break;

                case 'forecastProfit':
                    valueA = parseFloat(a.forecastProfit) || 0;
                    valueB = parseFloat(b.forecastProfit) || 0;
                    break;

                case 'peakProfit':
                    valueA = parseFloat(a.peakProfit) || 0;
                    valueB = parseFloat(b.peakProfit) || 0;
                    break;

                case 'liquidity25d':
                    valueA = parseFloat(a.liquidity25d) || 0;
                    valueB = parseFloat(b.liquidity25d) || 0;
                    break;

                case 'marginBuyRatio':
                    valueA = parseFloat(a.marginBuyRatio) || 0;
                    valueB = parseFloat(b.marginBuyRatio) || 0;
                    break;

                case 'marginSellRatio':
                    valueA = parseFloat(a.marginSellRatio) || 0;
                    valueB = parseFloat(b.marginSellRatio) || 0;
                    break;

                case 'buybackAmount':
                    valueA = parseFloat(a.buybackAmount) || 0;
                    valueB = parseFloat(b.buybackAmount) || 0;
                    break;

                default:
                    valueA = parseFloat(a.cumulativeRatio.replace('%', ''));
                    valueB = parseFloat(b.cumulativeRatio.replace('%', ''));
            }

            if (valueA < valueB) return ascending ? -1 : 1;
            if (valueA > valueB) return ascending ? 1 : -1;
            return 0;
        });
    },

    parseRequiredGrowth(stock) {
        if (stock.status !== '除外') {
            return -999999;
        }
        const cleaned = stock.floatingMarketCap.replace(/,/g, '');
        const currentMarketCap = parseFloat(cleaned);
        if (isNaN(currentMarketCap) || currentMarketCap === 0) {
            return 999999;
        }
        const requiredMarketCap = this.CONTINUATION_THRESHOLD;
        const growthRate = ((requiredMarketCap - currentMarketCap) / currentMarketCap) * 100;
        return growthRate <= 0 ? -999999 : growthRate;
    },

    updateSortArrows() {
        const tableHeaders = this.elements.topixScreeningTable.querySelectorAll('th.sortable');
        tableHeaders.forEach(header => {
            const arrow = header.querySelector('.sort-arrow');
            const column = header.getAttribute('data-column');

            if (column === this.currentSort.column) {
                arrow.textContent = this.currentSort.ascending ? ' ▲' : ' ▼';
            } else {
                arrow.textContent = '';
            }
        });
    },

    renderTable() {
        const tbody = this.elements.topixScreeningTableBody;
        tbody.innerHTML = '';

        this.elements.topixScreeningCount.textContent = `${this.filteredStocks.length}銘柄`;

        this.filteredStocks.forEach((stock, index) => {
            const row = this.renderTableRow(stock, index);
            row.className = 'company-row';
            row.setAttribute('data-stock-code', stock.code);
            tbody.appendChild(row);
        });
    },

    getStatusClass(status) {
        switch(status) {
            case '新規':
                return 'status-badge-new';
            case '継続':
                return 'status-badge-continued';
            case '除外':
                return 'status-badge-excluded';
            default:
                return '';
        }
    },

    formatMarketCap(marketCapString) {
        const cleaned = marketCapString.replace(/,/g, '');
        const value = parseFloat(cleaned);

        if (isNaN(value)) {
            return marketCapString;
        }

        if (value >= 1e12) {
            return `${(value / 1e12).toFixed(2)}兆円`;
        } else if (value >= 1e8) {
            return `${(value / 1e8).toFixed(0)}億円`;
        } else {
            return `${value.toLocaleString()}円`;
        }
    },

    calculateRequiredGrowth(stock) {
        if (stock.status !== '除外') {
            return '-';
        }

        const cleaned = stock.floatingMarketCap.replace(/,/g, '');
        const currentMarketCap = parseFloat(cleaned);

        if (isNaN(currentMarketCap) || currentMarketCap === 0) {
            return '-';
        }

        const requiredMarketCap = this.CONTINUATION_THRESHOLD;
        const growthRate = ((requiredMarketCap - currentMarketCap) / currentMarketCap) * 100;

        if (growthRate <= 0) {
            return '基準内';
        }

        return `+${growthRate.toFixed(2)}%`;
    },

    formatWeight(weightString) {
        const weight = parseFloat(weightString);

        if (isNaN(weight)) {
            return '-';
        }

        if (weight === 0) {
            return '0.0000%';
        }

        return `${weight.toFixed(4)}%`;
    },

    formatWeightChange(weightChangeString) {
        const weightChange = parseFloat(weightChangeString);

        if (isNaN(weightChange)) {
            return '-';
        }

        if (weightChange > 0) {
            return `+${weightChange.toFixed(4)}%`;
        } else if (weightChange < 0) {
            return `${weightChange.toFixed(4)}%`;
        } else {
            return '0.0000%';
        }
    },

    formatTradingImpact(tradingImpactString) {
        const cleaned = tradingImpactString.replace(/,/g, '');
        const value = parseFloat(cleaned);

        if (isNaN(value)) {
            return '-';
        }

        if (value === 0) {
            return '0億円';
        }

        const valueInOku = value / 1e8;

        if (value > 0) {
            return `+${valueInOku.toFixed(0)}億円`;
        } else {
            return `${valueInOku.toFixed(0)}億円`;
        }
    },

    formatImpactDays(impactDaysString) {
        const days = parseFloat(impactDaysString);

        if (isNaN(days) || impactDaysString === '') {
            return '-';
        }

        if (days < 1) {
            return `${days.toFixed(2)}日`;
        } else if (days < 10) {
            return `${days.toFixed(1)}日`;
        } else {
            return `${days.toFixed(0)}日`;
        }
    },

    formatPercent(percentString) {
        const percent = parseFloat(percentString);

        if (isNaN(percent) || percentString === '') {
            return '-';
        }

        if (percent > 0) {
            return `+${percent.toFixed(2)}%`;
        } else if (percent < 0) {
            return `${percent.toFixed(2)}%`;
        } else {
            return '0.00%';
        }
    },

    formatDividend(dividendString) {
        const dividend = parseFloat(dividendString);

        if (isNaN(dividend) || dividendString === '') {
            return '-';
        }

        return `${dividend.toFixed(2)}円`;
    },

    formatLiquidity(liquidityString) {
        const liquidity = parseFloat(liquidityString);

        if (isNaN(liquidity) || liquidityString === '') {
            return '-';
        }

        return `${liquidity.toFixed(0)}千株`;
    },

    formatMarginRatio(ratioString) {
        const ratio = parseFloat(ratioString);

        if (isNaN(ratio) || ratioString === '') {
            return '-';
        }

        return `${ratio.toFixed(2)}%`;
    },

    formatBuybackFlag(flagString) {
        if (flagString === 'はい') {
            return '<span class="buyback-badge">新規自社株買い</span>';
        }
        return '-';
    },

    formatBuybackAmount(amountString) {
        const amount = parseFloat(amountString);

        if (isNaN(amount) || amountString === '') {
            return '-';
        }

        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}兆円`;
        } else if (amount >= 100) {
            return `${(amount / 100).toFixed(1)}億円`;
        } else {
            return `${amount.toFixed(0)}百万円`;
        }
    },

    formatProfit(profitString) {
        const profit = parseFloat(profitString);

        if (isNaN(profit) || profitString === '') {
            return '-';
        }

        if (profit >= 100000) {
            return `${(profit / 100).toFixed(0)}億円`;
        } else if (profit >= 1000) {
            return `${(profit / 100).toFixed(1)}億円`;
        } else {
            return `${profit.toFixed(0)}百万円`;
        }
    },

    formatPeakUpdate(peakUpdateString) {
        if (peakUpdateString === 'はい') {
            return '<span class="peak-update-badge">最高益更新</span>';
        }
        return '-';
    },

    loadVisibleColumns() {
        const saved = localStorage.getItem('topixVisibleColumns');
        let savedColumns = [];

        if (saved) {
            savedColumns = JSON.parse(saved);
        } else {
            savedColumns = this.defaultColumnOrder.slice();
        }

        this.visibleColumns = this.defaultColumnOrder.filter(col => savedColumns.includes(col));
    },

    saveVisibleColumns() {
        localStorage.setItem('topixVisibleColumns', JSON.stringify(this.visibleColumns));
    },

    renderColumnSelectorContent() {
        const tabContent = document.getElementById('column-selector-tab-content');
        if (!tabContent) return;

        const categories = {
            basic: [],
            marketcap: [],
            dividend: [],
            profit: [],
            topix: [],
            margin: [],
            buyback: [],
            other: []
        };

        Object.keys(this.columnDefinitions).forEach(columnKey => {
            const def = this.columnDefinitions[columnKey];
            categories[def.category].push({ key: columnKey, def: def });
        });

        Object.keys(categories).forEach(category => {
            const panel = document.createElement('div');
            panel.className = 'tab-panel' + (category === 'basic' ? ' active' : '');
            panel.setAttribute('data-tab', category);

            const grid = document.createElement('div');
            grid.className = 'column-grid';

            categories[category].forEach(({ key, def }) => {
                const button = document.createElement('button');
                button.className = 'column-item';
                button.setAttribute('data-column', key);

                if (def.required) {
                    button.classList.add('disabled');
                } else {
                    button.classList.add('active');
                }

                const icon = document.createElement('span');
                icon.className = 'column-icon';
                icon.textContent = def.required ? '✓' : '+';

                const name = document.createElement('span');
                name.className = 'column-name';
                name.textContent = def.name;

                button.appendChild(icon);
                button.appendChild(name);

                if (!def.required) {
                    const helpIcon = document.createElement('span');
                    helpIcon.className = 'column-help-icon';
                    helpIcon.textContent = '?';

                    const tooltip = document.createElement('div');
                    tooltip.className = 'column-description-tooltip';
                    tooltip.innerHTML = def.description;

                    helpIcon.addEventListener('mouseenter', () => {
                        const tabContent = document.getElementById('column-selector-tab-content');
                        const iconRect = helpIcon.getBoundingClientRect();
                        const tabContentRect = tabContent.getBoundingClientRect();
                        const spaceRight = tabContentRect.right - iconRect.right;
                        const spaceLeft = iconRect.left - tabContentRect.left;

                        if (spaceRight < 400 && spaceLeft > spaceRight) {
                            tooltip.classList.add('left');
                        } else {
                            tooltip.classList.remove('left');
                        }
                    });

                    helpIcon.appendChild(tooltip);
                    button.appendChild(helpIcon);
                }

                grid.appendChild(button);
            });

            panel.appendChild(grid);
            tabContent.appendChild(panel);
        });
    },

    openColumnSelectorDialog() {
        this.syncColumnSelectorState();
        this.elements.columnSelectorDialog.classList.remove('hidden');
    },

    closeColumnSelectorDialog() {
        this.elements.columnSelectorDialog.classList.add('hidden');
    },

    syncColumnSelectorState() {
        this.elements.columnItems.forEach(item => {
            const column = item.getAttribute('data-column');
            if (this.visibleColumns.includes(column)) {
                item.classList.add('active');
                item.querySelector('.column-icon').textContent = '+';
            } else {
                item.classList.remove('active');
                item.querySelector('.column-icon').textContent = '+';
            }
        });
    },

    switchTab(tabName) {
        this.elements.tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            if (panel.getAttribute('data-tab') === tabName) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    },

    toggleColumn(item) {
        if (item.classList.contains('disabled')) {
            return;
        }

        const column = item.getAttribute('data-column');
        const isActive = item.classList.contains('active');

        if (isActive) {
            item.classList.remove('active');
            item.querySelector('.column-icon').textContent = '+';
        } else {
            item.classList.add('active');
            item.querySelector('.column-icon').textContent = '+';
        }
    },

    applyColumnSettings() {
        this.visibleColumns = [];

        Object.keys(this.columnDefinitions).forEach(column => {
            const def = this.columnDefinitions[column];
            if (def.required) {
                this.visibleColumns.push(column);
            }
        });

        this.elements.columnItems.forEach(item => {
            const column = item.getAttribute('data-column');
            const isActive = item.classList.contains('active');
            const isRequired = this.columnDefinitions[column]?.required;

            if (!isRequired && isActive) {
                this.visibleColumns.push(column);
            }
        });

        this.saveVisibleColumns();
        this.renderTableHeaders();
        this.renderTable();
        this.closeColumnSelectorDialog();
    },

    renderTableHeaders() {
        const thead = this.elements.topixScreeningTable.querySelector('thead');
        thead.innerHTML = '';

        const headerRow = document.createElement('tr');

        this.visibleColumns.forEach(column => {
            const def = this.columnDefinitions[column];
            if (!def) return;

            const th = document.createElement('th');
            th.textContent = def.name;

            if (def.sortable) {
                th.classList.add('sortable');
                th.setAttribute('data-column', column);
                th.innerHTML = `${def.name} <span class="sort-arrow"></span>`;

                th.addEventListener('click', () => {
                    this.sortBy(column);
                });
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        this.updateSortArrows();
    },

    renderTableRow(stock, index) {
        const row = document.createElement('tr');

        const statusClass = this.getStatusClass(stock.status);
        const statusBadge = `<span class="status-badge ${statusClass}">${stock.status}</span>`;

        const company = DataManager.getCompanyByStockCode(stock.code);
        const marketBadges = company ? UIManager.generateMarketBadges(company.listedMarkets) : stock.market;

        const floatingMarketCapFormatted = this.formatMarketCap(stock.floatingMarketCap);
        const januaryMarketCapFormatted = this.formatMarketCap(stock.januaryMarketCap);
        const marketCapChangeRateFormatted = this.formatPercent(stock.marketCapChangeRate);
        const currentDividendFormatted = this.formatDividend(stock.currentDividend);
        const dividendChangeRateFormatted = this.formatPercent(stock.dividendChangeRate);

        const requiredGrowth = this.calculateRequiredGrowth(stock);

        const oldWeightFormatted = this.formatWeight(stock.oldWeight);
        const newWeightFormatted = this.formatWeight(stock.newWeight);
        const weightChangeFormatted = this.formatWeightChange(stock.weightChange);
        const tradingImpactFormatted = this.formatTradingImpact(stock.tradingImpact);
        const impactDaysFormatted = this.formatImpactDays(stock.impactDays);

        const liquidity25dFormatted = this.formatLiquidity(stock.liquidity25d);
        const marginBuyRatioFormatted = this.formatMarginRatio(stock.marginBuyRatio);
        const marginSellRatioFormatted = this.formatMarginRatio(stock.marginSellRatio);

        const buybackFlagFormatted = this.formatBuybackFlag(stock.newBuyback2025);
        const buybackAmountFormatted = this.formatBuybackAmount(stock.buybackAmount);

        const forecastProfitFormatted = this.formatProfit(stock.forecastProfit);
        const profitTypeFormatted = stock.profitType || '-';
        const peakProfitFormatted = this.formatProfit(stock.peakProfit);
        const peakUpdateFormatted = this.formatPeakUpdate(stock.peakUpdate);

        const valueMap = {
            index: `<td class="text-center">${index + 1}</td>`,
            status: `<td class="text-center">${statusBadge}</td>`,
            code: `<td class="text-center">${stock.code}</td>`,
            name: `<td>${stock.name}</td>`,
            market: `<td class="text-center">${marketBadges}</td>`,
            floatingMarketCap: `<td class="text-right">${floatingMarketCapFormatted}</td>`,
            januaryMarketCap: `<td class="text-right">${januaryMarketCapFormatted}</td>`,
            marketCapChangeRate: `<td class="text-right">${marketCapChangeRateFormatted}</td>`,
            currentDividend: `<td class="text-right">${currentDividendFormatted}</td>`,
            dividendChangeRate: `<td class="text-right">${dividendChangeRateFormatted}</td>`,
            forecastProfit: `<td class="text-right">${forecastProfitFormatted}</td>`,
            profitType: `<td class="text-center">${profitTypeFormatted}</td>`,
            peakProfit: `<td class="text-right">${peakProfitFormatted}</td>`,
            peakUpdate: `<td class="text-center">${peakUpdateFormatted}</td>`,
            cumulativeRatio: `<td class="text-right">${stock.cumulativeRatio}</td>`,
            oldWeight: `<td class="text-right">${oldWeightFormatted}</td>`,
            newWeight: `<td class="text-right">${newWeightFormatted}</td>`,
            weightChange: `<td class="text-right">${weightChangeFormatted}</td>`,
            tradingImpact: `<td class="text-right">${tradingImpactFormatted}</td>`,
            impactDays: `<td class="text-right">${impactDaysFormatted}</td>`,
            liquidity25d: `<td class="text-right">${liquidity25dFormatted}</td>`,
            marginBuyRatio: `<td class="text-right">${marginBuyRatioFormatted}</td>`,
            marginSellRatio: `<td class="text-right">${marginSellRatioFormatted}</td>`,
            newBuyback2025: `<td class="text-center">${buybackFlagFormatted}</td>`,
            buybackAmount: `<td class="text-right">${buybackAmountFormatted}</td>`,
            requiredGrowth: `<td class="text-right">${requiredGrowth}</td>`
        };

        let rowHTML = '';
        this.visibleColumns.forEach(column => {
            if (valueMap[column]) {
                rowHTML += valueMap[column];
            }
        });

        row.innerHTML = rowHTML;
        return row;
    }
};

function showTopixScreening() {
    TopixScreeningManager.showTopixScreening();
}
