const UIManager = {
    elements: {},
    currentResults: [],

    init() {
        this.elements = {
            searchInput: document.getElementById('search-input'),
            searchResults: document.getElementById('search-results'),
            welcomeScreen: document.getElementById('welcome-screen'),
            companyDetail: document.getElementById('company-detail'),
            closeDetailButton: document.getElementById('close-detail'),
            companyCount: document.getElementById('company-count'),
            industryList: document.getElementById('industry-list'),
            industryListTitle: document.getElementById('industry-list-title'),
            industryContent: document.getElementById('industry-content'),
            closeIndustryListButton: document.getElementById('close-industry-list'),
            industryCompanies: document.getElementById('industry-companies'),
            industryCompaniesTitle: document.getElementById('industry-companies-title'),
            industryCompaniesCount: document.getElementById('industry-companies-count'),
            companiesTableBody: document.getElementById('companies-table-body'),
            closeIndustryCompaniesButton: document.getElementById('close-industry-companies'),
            shareholderDetail: document.getElementById('shareholder-detail'),
            shareholderName: document.getElementById('shareholder-name'),
            shareholderInvestmentCount: document.getElementById('shareholder-investment-count'),
            shareholderInvestmentsBody: document.getElementById('shareholder-investments-body'),
            closeShareholderDetailButton: document.getElementById('close-shareholder-detail')
        };

        this.bindEvents();
        this.updateCompanyCount();
        this.handleInitialHash();
    },

    bindEvents() {
        this.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleEnterKey();
            }
        });

        this.elements.closeDetailButton.addEventListener('click', () => {
            this.hideCompanyDetail();
        });

        this.elements.closeIndustryListButton.addEventListener('click', () => {
            this.hideIndustryList();
        });

        this.elements.closeIndustryCompaniesButton.addEventListener('click', () => {
            this.hideIndustryCompanies();
        });

        this.elements.closeShareholderDetailButton.addEventListener('click', () => {
            this.hideShareholderDetail();
        });

        document.getElementById('close-earnings-calendar').addEventListener('click', () => {
            this.hideAllScreens();
            this.elements.welcomeScreen.classList.remove('hidden');
            window.location.hash = '';
        });

        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });

        document.addEventListener('keydown', (e) => {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.isContentEditable
            );

            if (isInputFocused) return;

            if (e.ctrlKey || e.altKey || e.metaKey) return;

            if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') return;

            if (e.key.length === 1) {
                this.elements.searchInput.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.elements.searchInput.contains(e.target) &&
                !this.elements.searchResults.contains(e.target)) {
                this.hideSearchResults();
            }

            if (e.target.classList.contains('industry-link-btn')) {
                const industryType = e.target.getAttribute('data-industry-type');
                this.showIndustryList(industryType);
            }

            if (e.target.classList.contains('earnings-calendar-link-btn')) {
                EarningsCalendarManager.showEarningsCalendar();
            }

            const industryItem = e.target.closest('.industry-item');
            if (industryItem) {
                const industryType = industryItem.getAttribute('data-industry-type');
                const industryName = industryItem.getAttribute('data-industry-name');
                this.showIndustryCompanies(industryType, industryName);
            }

            const companyRow = e.target.closest('.company-row');
            if (companyRow) {
                const stockCode = companyRow.getAttribute('data-stock-code');
                this.showCompanyDetail(stockCode);
            }

            if (e.target.classList.contains('industry-link')) {
                e.preventDefault();
                const industryType = e.target.getAttribute('data-industry-type');
                const industryName = e.target.getAttribute('data-industry-name');
                this.showIndustryCompanies(industryType, industryName);
            }
        });
    },

    handleSearchInput(query) {
        if (!query || query.trim() === '') {
            this.hideSearchResults();
            this.currentResults = [];
            return;
        }

        const results = SearchEngine.searchCompanies(query, DataManager.getAllCompanies());
        this.currentResults = results;
        this.showSearchResults(results);

        if (results.length === 1) {
            this.showCompanyDetail(results[0].stockCode);
            this.hideSearchResults();
        }
    },

    handleEnterKey() {
        if (this.currentResults.length === 1) {
            this.showCompanyDetail(this.currentResults[0].stockCode);
            this.hideSearchResults();
        } else if (this.currentResults.length > 1) {
            this.showCompanyDetail(this.currentResults[0].stockCode);
            this.hideSearchResults();
        }
    },

    showSearchResults(results) {
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = '<div class="search-result-item no-result">該当する企業が見つかりません</div>';
            this.elements.searchResults.classList.remove('hidden');
            return;
        }

        const maxResults = 20;
        const displayResults = results.slice(0, maxResults);

        const html = displayResults.map(company => {
            const displayName = company.qr1ShortName || company.formalName;
            const marketBadges = this.generateMarketBadges(company.listedMarkets);
            const indexBadges = this.generateIndexBadges(company.indexAdoption);
            return `
                <div class="search-result-item" data-stock-code="${company.stockCode}">
                    <span class="result-code">${company.stockCode}</span>
                    <span class="result-name">${displayName}</span>
                    <span class="result-market">${marketBadges}${indexBadges}</span>
                </div>
            `;
        }).join('');

        const countMessage = results.length > maxResults
            ? `<div class="search-result-count">${results.length}件中${maxResults}件を表示</div>`
            : '';

        this.elements.searchResults.innerHTML = countMessage + html;
        this.elements.searchResults.classList.remove('hidden');

        this.elements.searchResults.querySelectorAll('.search-result-item[data-stock-code]').forEach(item => {
            item.addEventListener('click', () => {
                const stockCode = item.getAttribute('data-stock-code');
                this.showCompanyDetail(stockCode);
                this.hideSearchResults();
            });
        });
    },

    hideSearchResults() {
        this.elements.searchResults.classList.add('hidden');
        this.elements.searchResults.innerHTML = '';
    },

    showCompanyDetail(stockCode) {
        const company = DataManager.getCompanyByStockCode(stockCode);
        if (!company) return;

        this.hideAllScreens();
        this.elements.companyDetail.classList.remove('hidden');

        this.populateCompanyDetail(company);
        window.location.hash = stockCode;
    },

    populateCompanyDetail(company) {
        document.getElementById('detail-company-name').textContent = company.qr1ShortName || company.formalName;
        document.getElementById('detail-stock-code').textContent = company.stockCode;

        const marketBadges = this.generateMarketBadges(company.listedMarkets);
        const indexBadges = this.generateIndexBadges(company.indexAdoption);
        const upwardRevisionBadge = this.generateUpwardRevisionBadge(company.stockCode);
        const quarterlyPatternBadge = this.generateQuarterlyPatternBadge(company.stockCode);
        const peakProfitUpdateBadge = this.generatePeakProfitUpdateBadge(company.stockCode);
        document.getElementById('detail-market-badges').innerHTML = marketBadges + indexBadges + upwardRevisionBadge + quarterlyPatternBadge + peakProfitUpdateBadge;

        const topixStatusBadge = this.generateTopixStatusBadge(company.stockCode);
        document.getElementById('detail-topix-badge').innerHTML = topixStatusBadge;

        document.getElementById('info-stock-code').textContent = company.stockCode;
        document.getElementById('info-formal-name').textContent = company.formalName;
        document.getElementById('info-short-name').textContent = company.qr1ShortName;
        document.getElementById('info-kana').textContent = company.kana;
        document.getElementById('info-english-name').textContent = company.englishName;

        const factsetCell = document.getElementById('info-factset-industry');
        if (company.factsetIndustry) {
            const industries = company.factsetIndustry.split('\n').map(ind => ind.trim()).filter(ind => ind);
            factsetCell.innerHTML = industries.map(ind =>
                `<a href="#" class="industry-link" data-industry-type="factset" data-industry-name="${ind}">${ind}</a>`
            ).join('<br>');
        } else {
            factsetCell.textContent = '';
        }

        const kyokaiCell = document.getElementById('info-kyokai-industry');
        if (company.kyokaiIndustry && company.kyokaiIndustry.trim() !== '') {
            kyokaiCell.innerHTML = `<a href="#" class="industry-link" data-industry-type="tse" data-industry-name="${company.kyokaiIndustry}">${company.kyokaiIndustry}</a>`;
        } else {
            kyokaiCell.textContent = '';
        }

        const nikkeiMiddleCell = document.getElementById('info-nikkei-industry-middle');
        if (company.nikkeiIndustryMiddle) {
            nikkeiMiddleCell.innerHTML = `<a href="#" class="industry-link" data-industry-type="nikkei-middle" data-industry-name="${company.nikkeiIndustryMiddle}">${company.nikkeiIndustryMiddle}</a>`;
        } else {
            nikkeiMiddleCell.textContent = '';
        }

        const nikkeiCell = document.getElementById('info-nikkei-industry');
        if (company.nikkeiIndustry) {
            nikkeiCell.innerHTML = `<a href="#" class="industry-link" data-industry-type="nikkei" data-industry-name="${company.nikkeiIndustry}">${company.nikkeiIndustry}</a>`;
        } else {
            nikkeiCell.textContent = '';
        }

        document.getElementById('info-primary-market').textContent = company.primaryMarket;
        document.getElementById('info-trading-unit').textContent = company.tradingUnit;
        document.getElementById('info-outstanding-shares').textContent = company.outstandingShares;
        document.getElementById('info-listing-date').textContent = company.listingDate;

        document.getElementById('info-edinet-code').textContent = company.edinetCode;
        document.getElementById('info-new-code').textContent = company.newStockCode;

        const websiteCell = document.getElementById('info-website');
        if (company.website) {
            websiteCell.innerHTML = `<a href="${company.website}" target="_blank" rel="noopener noreferrer">${company.website}</a>`;
        } else {
            websiteCell.textContent = '';
        }

        document.getElementById('info-old-name').textContent = company.oldName;

        document.getElementById('info-fiscal-period').textContent = company.fiscalPeriod;
        document.getElementById('info-dividend-date').textContent = company.dividendDate;
        document.getElementById('info-earnings-schedule').textContent = company.earningsSchedule;

        const earningsHistory = company.earningsHistory.replace(/\n/g, '<br>');
        document.getElementById('info-earnings-history').innerHTML = earningsHistory;

        if (APP_CONFIG.isPublicVersion) {
            const companyDescElement = document.getElementById('info-company-description');
            if (companyDescElement) {
                companyDescElement.innerHTML = '<div class="restricted-message-inline">権限がありません。著作権関係から表示できません。</div>';
            }

            const nikkeiDescElement = document.getElementById('info-nikkei-description');
            if (nikkeiDescElement) {
                nikkeiDescElement.innerHTML = '<div class="restricted-message-inline">権限がありません。著作権関係から表示できません。</div>';
            }

            const shareholderSection = document.getElementById('shareholder-info-section');
            if (shareholderSection) {
                const shareholderContent = shareholderSection.querySelector('.shareholder-content');
                if (shareholderContent) {
                    this.showRestrictedContent(shareholderContent, '株主情報');
                }
            }

            const revenueSection = document.getElementById('revenue-composition-section');
            if (revenueSection) {
                const revenueContent = revenueSection.querySelector('.revenue-composition-content');
                if (revenueContent) {
                    this.showRestrictedContent(revenueContent, '収益構成');
                }
            }

            const exchangeSection = document.getElementById('exchange-rate-section');
            if (exchangeSection) {
                const exchangeContent = exchangeSection.querySelector('.exchange-rate-content');
                if (exchangeContent) {
                    this.showRestrictedContent(exchangeContent, '為替感応度分析');
                }
            }

            const quarterlySection = document.getElementById('quarterly-pattern-section');
            if (quarterlySection) {
                const quarterlyContent = quarterlySection.querySelector('.quarterly-pattern-content');
                if (quarterlyContent) {
                    this.showRestrictedContent(quarterlyContent, '四半期業績パターン分析');
                }
            }

            const parentChildSection = document.getElementById('parent-child-relation-section');
            if (parentChildSection) {
                const parentChildContent = document.getElementById('parent-child-relation-content');
                if (parentChildContent) {
                    this.showRestrictedContent(parentChildContent, '親子上場関係');
                }
            }

            const chartSection = document.getElementById('performance-chart-section');
            if (chartSection) {
                this.showRestrictedContent(chartSection, '業績推移');
            }
        } else {
            const companyDesc = company.companyDescription.replace(/\n/g, '<br>');
            document.getElementById('info-company-description').innerHTML = companyDesc;

            const nikkeiDesc = company.nikkeiDescription.replace(/\n/g, '<br>');
            document.getElementById('info-nikkei-description').innerHTML = nikkeiDesc;

            this.populateShareholderInfo(company);
            this.populateRevenueComposition(company);
            this.populateExchangeRateInfo(company);
            this.populateQuarterlyPattern(company);
            this.populateParentChildRelation(company);
            PerformanceChartManager.renderPerformanceCharts(company.stockCode);
        }
    },

    populateQuarterlyPattern(company) {
        if (typeof drawQuarterlyPatternChart === 'function') {
            drawQuarterlyPatternChart('quarterly-pattern-chart', company.stockCode);
        }
    },

    populateShareholderInfo(company) {
        if (company.shareholderDistribution) {
            this.drawShareholderDistributionChart(company.shareholderDistribution);
        } else {
            const canvas = document.getElementById('shareholder-chart');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const shareholdersContainer = document.getElementById('major-shareholders-list');
        const allShareholders = company.shareholders || [];

        if (allShareholders.length > 0) {
            const displayShareholders = allShareholders.slice(0, 10);
            const html = displayShareholders.map(shareholder => {
                const isExcluded = DataManager.isShareholderExcluded(shareholder.name);

                if (isExcluded) {
                    return `
                        <tr>
                            <td>${shareholder.name}</td>
                            <td class="text-right">${shareholder.percentage.toFixed(1)}%</td>
                        </tr>
                    `;
                } else {
                    return `
                        <tr>
                            <td><a href="#shareholder/${encodeURIComponent(shareholder.name)}" class="shareholder-link">${shareholder.name}</a></td>
                            <td class="text-right">${shareholder.percentage.toFixed(1)}%</td>
                        </tr>
                    `;
                }
            }).join('');
            shareholdersContainer.innerHTML = html;
        } else {
            shareholdersContainer.innerHTML = '<tr><td colspan="2">大株主情報がありません</td></tr>';
        }
    },

    drawShareholderDistributionChart(distribution) {
        const canvas = document.getElementById('shareholder-chart');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const data = [
            { label: '自己株', percentage: distribution.ownShares.percentage, color: '#A0A0A0' },
            { label: '金融機関', percentage: distribution.financialInstitutions.percentage, color: '#6699CC' },
            { label: '証券投資信託', percentage: distribution.investmentTrusts.percentage, color: '#5588BB' },
            { label: '法人', percentage: distribution.corporations.percentage, color: '#99CC99' },
            { label: '外国人', percentage: distribution.foreigners.percentage, color: '#CC9966' },
            { label: '個人', percentage: distribution.individuals.percentage, color: '#9999CC' }
        ].filter(item => item.percentage > 0);

        const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0);
        const unknownPercentage = 100 - totalPercentage;

        if (unknownPercentage > 0) {
            data.push({
                label: '不明',
                percentage: unknownPercentage,
                color: '#D0D0D0'
            });
        }

        let startAngle = -Math.PI / 2;

        data.forEach(item => {
            const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            startAngle = endAngle;
        });

        let legendY = 10;
        data.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(10, legendY, 15, 15);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, legendY, 15, 15);

            ctx.fillStyle = '#000000';
            ctx.font = '12px "MS Gothic", "MS ゴシック", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.label}: ${item.percentage.toFixed(1)}%`, 30, legendY + 12);

            legendY += 20;
        });

        if (distribution.date) {
            ctx.fillStyle = '#808080';
            ctx.font = '11px "MS Gothic", "MS ゴシック", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`基準日: ${distribution.date}`, canvas.width - 10, canvas.height - 10);
        }
    },

    populateRevenueComposition(company) {
        if (company.revenueComposition) {
            this.drawRevenueCompositionChart(company.revenueComposition);
            this.populateRevenueLegend(company.revenueComposition);
        } else {
            const canvas = document.getElementById('revenue-composition-chart');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const legendContainer = document.getElementById('revenue-legend-list');
            legendContainer.innerHTML = '';
        }
    },

    drawRevenueCompositionChart(segments) {
        const canvas = document.getElementById('revenue-composition-chart');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const colors = [
            '#6699CC', '#99CC99', '#CC9966', '#9999CC', '#CC6699',
            '#66CC99', '#CC9999', '#9966CC', '#99CCCC', '#A0A0A0'
        ];

        let startAngle = -Math.PI / 2;

        segments.forEach((segment, index) => {
            const sliceAngle = (segment.percentage / 100) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

            ctx.fillStyle = '#000000';
            ctx.font = '11px "MS Gothic", "MS ゴシック", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${segment.percentage}%`, labelX, labelY);

            startAngle = endAngle;
        });
    },

    populateRevenueLegend(segments) {
        const colors = [
            '#6699CC', '#99CC99', '#CC9966', '#9999CC', '#CC6699',
            '#66CC99', '#CC9999', '#9966CC', '#99CCCC', '#A0A0A0'
        ];

        const legendContainer = document.getElementById('revenue-legend-list');
        const html = segments.map((segment, index) => {
            const color = colors[index % colors.length];
            return `
                <tr>
                    <td><span style="display: inline-block; width: 15px; height: 15px; background-color: ${color}; border: 1px solid #808080; margin-right: 5px; vertical-align: middle;"></span>${segment.name}</td>
                    <td class="text-right">${segment.percentage}%</td>
                </tr>
            `;
        }).join('');
        legendContainer.innerHTML = html;
    },

    async populateExchangeRateInfo(company) {
        const container = document.getElementById('exchange-rate-data');

        console.log('為替感応度分析デバッグ:', {
            stockCode: company.stockCode,
            fiscalPeriod: company.fiscalPeriod,
            exchangeRateInfo: company.exchangeRateInfo
        });

        if (!company.exchangeRateInfo || !company.exchangeRateInfo.assumedRate) {
            console.log('為替感応度データなし（exchangeRateInfo不在）');
            container.innerHTML = '<tr><td colspan="2" class="text-center">為替感応度データなし</td></tr>';
            return;
        }

        container.innerHTML = '<tr><td colspan="2" class="text-center">株探データ取得中...</td></tr>';

        const impact = await DataManager.calculateExchangeRateImpactWithForecast(company);
        console.log('計算結果（株探含む）:', impact);

        if (!impact) {
            console.log('為替感応度データなし（impact計算失敗）');
            container.innerHTML = '<tr><td colspan="2" class="text-center">為替感応度データなし</td></tr>';
            return;
        }

        let html = '';

        html += `
            <tr>
                <th>想定為替レート</th>
                <td>${impact.assumedRate.toFixed(2)}円/USD</td>
            </tr>
        `;

        if (impact.message) {
            html += `
                <tr>
                    <th>営業利益への影響</th>
                    <td>${impact.message}</td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <th>平均実勢レート</th>
                    <td>${impact.averageRate.toFixed(2)}円/USD（${impact.dataPoints}ヶ月平均）</td>
                </tr>
                <tr>
                    <th>レート差異</th>
                    <td>${impact.rateDifference > 0 ? '+' : ''}${impact.rateDifference.toFixed(2)}円</td>
                </tr>
                <tr>
                    <th>感応度</th>
                    <td>${impact.sensitivityDirection} 1円あたり ${impact.sensitivityValue.toLocaleString()}百万円</td>
                </tr>
            `;

            const impactClass = impact.impact > 0 ? 'positive-impact' : impact.impact < 0 ? 'negative-impact' : '';
            const impactSign = impact.impact > 0 ? '+' : '';

            html += `
                <tr class="impact-row">
                    <th>営業利益への影響</th>
                    <td class="${impactClass}">${impactSign}${impact.impact.toLocaleString()}百万円</td>
                </tr>
            `;

            if (impact.forecastError) {
                html += `
                    <tr>
                        <th>予想営業利益への影響率</th>
                        <td>${impact.forecastError}</td>
                    </tr>
                `;
            } else if (impact.forecastOperatingProfit !== null && impact.impactRatio !== null) {
                html += `
                    <tr>
                        <th>予想営業利益</th>
                        <td>${impact.forecastOperatingProfit.toLocaleString()}百万円（${impact.fiscalPeriod}期）</td>
                    </tr>
                `;

                const ratioClass = impact.impactRatio > 0 ? 'positive-impact' : impact.impactRatio < 0 ? 'negative-impact' : '';
                const ratioSign = impact.impactRatio > 0 ? '+' : '';

                html += `
                    <tr class="impact-row">
                        <th>予想営業利益への影響率</th>
                        <td class="${ratioClass}"><strong>${ratioSign}${impact.impactRatio.toFixed(2)}%</strong></td>
                    </tr>
                `;
            }
        }

        container.innerHTML = html;
    },

    populateParentChildRelation(company) {
        if (typeof getParentCompanies !== 'function' || typeof getChildCompanies !== 'function') {
            return;
        }

        const parents = getParentCompanies(company.stockCode);
        const children = getChildCompanies(company.stockCode);

        const section = document.getElementById('parent-child-relation-section');
        const parentContainer = document.getElementById('parent-companies-container');
        const childContainer = document.getElementById('child-companies-container');
        const parentList = document.getElementById('parent-companies-list');
        const childList = document.getElementById('child-companies-list');

        if (parents.length === 0 && children.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        if (parents.length > 0) {
            parentContainer.style.display = 'block';
            const parentHtml = parents.map(parent => `
                <tr class="parent-child-row" data-stock-code="${parent.stockCode}">
                    <td>${parent.stockCode}</td>
                    <td>${parent.name}</td>
                    <td class="text-right">${parent.ownershipPercentage.toFixed(1)}%</td>
                </tr>
            `).join('');
            parentList.innerHTML = parentHtml;

            parentList.querySelectorAll('.parent-child-row').forEach(row => {
                row.addEventListener('click', () => {
                    const stockCode = row.getAttribute('data-stock-code');
                    window.location.hash = stockCode;
                });
            });
        } else {
            parentContainer.style.display = 'none';
        }

        if (children.length > 0) {
            childContainer.style.display = 'block';
            const childHtml = children.map(child => `
                <tr class="parent-child-row" data-stock-code="${child.stockCode}">
                    <td>${child.stockCode}</td>
                    <td>${child.name}</td>
                    <td class="text-right">${child.ownershipPercentage.toFixed(1)}%</td>
                </tr>
            `).join('');
            childList.innerHTML = childHtml;

            childList.querySelectorAll('.parent-child-row').forEach(row => {
                row.addEventListener('click', () => {
                    const stockCode = row.getAttribute('data-stock-code');
                    window.location.hash = stockCode;
                });
            });
        } else {
            childContainer.style.display = 'none';
        }
    },

    hideCompanyDetail() {
        this.hideAllScreens();
        this.elements.welcomeScreen.classList.remove('hidden');
        window.location.hash = '';
    },

    showShareholderDetail(shareholderName) {
        const companies = DataManager.getCompaniesByMajorShareholder(shareholderName);

        if (companies.length === 0) {
            return;
        }

        this.hideAllScreens();
        this.elements.shareholderDetail.classList.remove('hidden');

        this.elements.shareholderName.textContent = shareholderName;
        this.elements.shareholderInvestmentCount.textContent = `投資先: ${companies.length}社`;

        const html = companies.map(company => `
            <tr>
                <td><a href="#${company.code}" class="company-link">${company.code}</a></td>
                <td><a href="#${company.code}" class="company-link">${company.name}</a></td>
                <td class="text-right">${company.percentage.toFixed(1)}%</td>
            </tr>
        `).join('');

        this.elements.shareholderInvestmentsBody.innerHTML = html;
    },

    hideShareholderDetail() {
        this.hideAllScreens();
        this.elements.welcomeScreen.classList.remove('hidden');
        window.location.hash = '';
    },

    handleInitialHash() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.handleHashRoute(hash);
        }
    },

    handleHashChange() {
        const hash = window.location.hash.slice(1);
        if (!hash) {
            this.hideAllScreens();
            this.elements.welcomeScreen.classList.remove('hidden');
        } else {
            this.handleHashRoute(hash);
        }
    },

    handleHashRoute(hash) {
        const code = parseInt(hash);

        if (code >= 321 && code <= 353) {
            const industryName = DataManager.getTseIndustryNameByCode(hash);
            if (industryName) {
                this.showIndustryCompanies('tse', industryName);
                return;
            }
        }

        if (code >= 231 && code <= 266) {
            const industryName = DataManager.getNikkeiMiddleIndustryNameByCode(hash);
            if (industryName) {
                this.showIndustryCompanies('nikkei-middle', industryName);
                return;
            }
        }

        if (code >= 231341 && code <= 266704) {
            const industryName = DataManager.getNikkeiSmallIndustryNameByCode(hash);
            if (industryName) {
                this.showIndustryCompanies('nikkei', industryName);
                return;
            }
        }

        if (hash.startsWith('earnings-calendar')) {
            const parts = hash.split('/');
            if (parts.length === 2) {
                const [year, month] = parts[1].split('-').map(num => parseInt(num));
                EarningsCalendarManager.showEarningsCalendar(year, month);
            } else {
                EarningsCalendarManager.showEarningsCalendar();
            }
            return;
        }

        if (hash === 'cross-screening') {
            showCrossScreening();
        } else if (hash === 'upward-revision') {
            this.showUpwardRevisionRankingPage();
        } else if (hash === 'is') {
            this.showIndustryList('tse');
        } else if (hash === 'ns') {
            this.showIndustryList('nikkei-middle');
        } else if (hash === 'nss') {
            this.showIndustryList('nikkei');
        } else if (hash === 'fs') {
            this.showIndustryList('factset');
        } else if (hash === 'tp') {
            this.showMarketCompanies('prime');
        } else if (hash === 'ts') {
            this.showMarketCompanies('standard');
        } else if (hash === 'tg') {
            this.showMarketCompanies('growth');
        } else if (hash === '101' || hash === '102' || hash === '103' || hash === '105') {
            this.showIndexCompanies(hash);
        } else if (hash.startsWith('industry/')) {
            const parts = hash.split('/');
            if (parts.length === 3) {
                const industryType = parts[1];
                const industryName = decodeURIComponent(parts[2]);
                this.showIndustryCompanies(industryType, industryName);
            }
        } else if (hash.startsWith('shareholder/')) {
            const shareholderName = decodeURIComponent(hash.substring('shareholder/'.length));
            this.showShareholderDetail(shareholderName);
        } else {
            this.showCompanyDetail(hash);
        }
    },

    hideAllScreens() {
        this.elements.welcomeScreen.classList.add('hidden');
        this.elements.companyDetail.classList.add('hidden');
        this.elements.industryList.classList.add('hidden');
        this.elements.industryCompanies.classList.add('hidden');
        this.elements.shareholderDetail.classList.add('hidden');
        document.getElementById('earnings-calendar').classList.add('hidden');
        document.getElementById('cross-screening').classList.add('hidden');
        const upwardRevisionRanking = document.getElementById('upward-revision-ranking');
        if (upwardRevisionRanking) {
            upwardRevisionRanking.classList.add('hidden');
        }
    },

    showIndustryList(industryType) {
        this.hideAllScreens();
        this.elements.industryList.classList.remove('hidden');

        const typeNames = {
            'tse': '東証33業種',
            'nikkei': '日経業種（小分類）',
            'nikkei-middle': '日経業種（中分類）',
            'factset': 'FACTSET業種'
        };

        this.elements.industryListTitle.textContent = typeNames[industryType] + '一覧';

        const industries = DataManager.getIndustryList(industryType);

        const html = industries.map(industry => {
            return `
                <div class="industry-item" data-industry-type="${industryType}" data-industry-name="${industry.name}">
                    <span class="industry-name">${industry.name}</span>
                    <span class="industry-count">${industry.count}社</span>
                </div>
            `;
        }).join('');

        this.elements.industryContent.innerHTML = html;

        const urlMapping = {
            'tse': 'is',
            'nikkei-middle': 'ns',
            'nikkei': 'nss',
            'factset': 'fs'
        };
        window.location.hash = urlMapping[industryType];
    },

    hideIndustryList() {
        this.hideAllScreens();
        this.elements.welcomeScreen.classList.remove('hidden');
        window.location.hash = '';
    },

    showIndustryCompanies(industryType, industryName) {
        this.hideAllScreens();
        this.elements.industryCompanies.classList.remove('hidden');

        const typeNames = {
            'tse': '東証33業種',
            'nikkei': '日経業種（小分類）',
            'nikkei-middle': '日経業種（中分類）',
            'factset': 'FACTSET業種'
        };

        this.elements.industryCompaniesTitle.textContent = `${typeNames[industryType]} - ${industryName}`;

        const companies = DataManager.getCompaniesByIndustry(industryType, industryName);
        this.elements.industryCompaniesCount.textContent = `${companies.length}社`;

        const html = companies.map(company => {
            const displayName = company.qr1ShortName || company.formalName;
            const marketBadges = this.generateMarketBadges(company.listedMarkets);
            return `
                <tr class="company-row" data-stock-code="${company.stockCode}">
                    <td>${company.stockCode}</td>
                    <td>${displayName}</td>
                    <td>${marketBadges}</td>
                </tr>
            `;
        }).join('');

        this.elements.companiesTableBody.innerHTML = html;
        this.elements.companiesTableBody.parentElement.scrollTop = 0;

        if (industryType === 'tse') {
            const code = DataManager.getTseIndustryCodeByName(industryName);
            if (code) {
                window.location.hash = code;
            }
        } else if (industryType === 'nikkei-middle') {
            const code = DataManager.getNikkeiMiddleIndustryCodeByName(industryName);
            if (code) {
                window.location.hash = code;
            }
        } else if (industryType === 'nikkei') {
            const code = DataManager.getNikkeiSmallIndustryCodeByName(industryName);
            if (code) {
                window.location.hash = code;
            }
        } else {
            window.location.hash = `industry/${industryType}/${encodeURIComponent(industryName)}`;
        }
    },

    hideIndustryCompanies() {
        this.hideAllScreens();
        this.elements.welcomeScreen.classList.remove('hidden');
        window.location.hash = '';
    },

    showMarketCompanies(marketType) {
        this.hideAllScreens();
        this.elements.industryCompanies.classList.remove('hidden');

        const marketNames = {
            'prime': '東証プライム',
            'standard': '東証スタンダード',
            'growth': '東証グロース'
        };

        const marketHashes = {
            'prime': 'tp',
            'standard': 'ts',
            'growth': 'tg'
        };

        this.elements.industryCompaniesTitle.textContent = `上場市場 - ${marketNames[marketType]}`;

        const companies = DataManager.getCompaniesByMarket(marketType);
        this.elements.industryCompaniesCount.textContent = `${companies.length}社`;

        const html = companies.map(company => {
            const displayName = company.qr1ShortName || company.formalName;
            const marketBadges = this.generateMarketBadges(company.listedMarkets);
            return `
                <tr class="company-row" data-stock-code="${company.stockCode}">
                    <td>${company.stockCode}</td>
                    <td>${displayName}</td>
                    <td>${marketBadges}</td>
                </tr>
            `;
        }).join('');

        this.elements.companiesTableBody.innerHTML = html;
        this.elements.companiesTableBody.parentElement.scrollTop = 0;

        window.location.hash = marketHashes[marketType];
    },

    updateCompanyCount() {
        const count = DataManager.getCompanyCount();
        if (count > 0) {
            this.elements.companyCount.textContent = `登録企業数: ${count.toLocaleString()}社`;
        } else {
            this.elements.companyCount.textContent = 'データ読み込み中...';
        }
    },

    generateMarketBadges(listedMarkets) {
        if (!listedMarkets || listedMarkets.trim() === '') {
            return '';
        }

        const markets = listedMarkets.split(/\s+/);

        const getBadgeClass = (market) => {
            if (market.includes('ﾌﾟﾗｲﾑ')) return 'market-badge-prime';
            if (market.includes('ｽﾀﾝﾀﾞｰﾄﾞ')) return 'market-badge-standard';
            if (market.includes('ｸﾞﾛｰｽ')) return 'market-badge-growth';
            if (market.includes('名証')) return 'market-badge-nagoya';
            if (market.includes('福証')) return 'market-badge-fukuoka';
            if (market.includes('札証')) return 'market-badge-sapporo';
            return 'market-badge-other';
        };

        const isClickable = (market) => {
            return market.includes('ﾌﾟﾗｲﾑ') || market.includes('ｽﾀﾝﾀﾞｰﾄﾞ') || market.includes('ｸﾞﾛｰｽ');
        };

        const getMarketHash = (market) => {
            if (market.includes('ﾌﾟﾗｲﾑ')) return '#tp';
            if (market.includes('ｽﾀﾝﾀﾞｰﾄﾞ')) return '#ts';
            if (market.includes('ｸﾞﾛｰｽ')) return '#tg';
            return '';
        };

        const getDisplayName = (market) => {
            if (market.startsWith('東証')) {
                return market;
            }
            if (market.includes('名証')) {
                return '名証';
            }
            if (market.includes('福証')) {
                return '福証';
            }
            if (market.includes('札証')) {
                return '札証';
            }
            return market;
        };

        return markets.map(market => {
            const badgeClass = getBadgeClass(market);
            const displayName = getDisplayName(market);
            if (isClickable(market)) {
                const hash = getMarketHash(market);
                return `<a href="${hash}" class="market-badge-link"><span class="market-badge ${badgeClass}">${displayName}</span></a>`;
            } else {
                return `<span class="market-badge ${badgeClass}">${displayName}</span>`;
            }
        }).join('');
    },

    generateIndexBadges(indexAdoption) {
        const allIndices = [
            { keyword: '日経平均', shortName: '日経平均', hash: '#101' },
            { keyword: '日経500', shortName: '日経500', hash: '#102' },
            { keyword: '日経300', shortName: '日経300', hash: '#103' },
            { keyword: 'JPX日経400', shortName: 'JPX400', hash: '#105' }
        ];

        const adoptionText = indexAdoption || '';

        return allIndices.map(indexInfo => {
            const isAdopted = adoptionText.includes(indexInfo.keyword);
            const badgeClass = isAdopted ? 'index-badge-adopted' : 'index-badge-not-adopted';

            return `<a href="${indexInfo.hash}" class="index-badge-link"><span class="index-badge ${badgeClass}">${indexInfo.shortName}</span></a>`;
        }).join('');
    },

    generateUpwardRevisionBadge(stockCode) {
        if (typeof upwardRevisionData === 'undefined' || !upwardRevisionData) return '';
        if (typeof getUpwardRevisionByStockCode !== 'function') return '';

        const revisionInfo = getUpwardRevisionByStockCode(stockCode);
        if (!revisionInfo) return '';

        const score = revisionInfo.combinedScore;
        let badgeClass = '';
        let badgeText = '';

        if (score >= 90) {
            badgeClass = 'upward-revision-badge-high';
            badgeText = '上方修正期待（高）';
        } else if (score >= 70) {
            badgeClass = 'upward-revision-badge-medium';
            badgeText = '上方修正期待（中）';
        } else if (score >= 50) {
            badgeClass = 'upward-revision-badge-low';
            badgeText = '上方修正可能性';
        } else {
            return '';
        }

        return `<a href="#upward-revision" class="upward-revision-badge-link"><span class="upward-revision-badge ${badgeClass}">${badgeText}</span></a>`;
    },

    generateQuarterlyPatternBadge(stockCode) {
        if (typeof quarterlyData === 'undefined' || !quarterlyData) return '';
        if (typeof analyzeQuarterlyPattern !== 'function') return '';

        const patternAnalysis = analyzeQuarterlyPattern(stockCode);
        if (!patternAnalysis || patternAnalysis.pattern === 'unknown' || patternAnalysis.pattern === 'insufficient') {
            return '';
        }

        let badgeClass = '';
        let badgeText = '';

        if (patternAnalysis.pattern === 'stable') {
            badgeClass = 'quarterly-pattern-stable';
            badgeText = '偏重なし';
        } else if (patternAnalysis.pattern === 'first-half-heavy') {
            badgeClass = 'quarterly-pattern-first-half';
            badgeText = '上期偏重';
        } else if (patternAnalysis.pattern === 'second-half-heavy') {
            badgeClass = 'quarterly-pattern-second-half';
            badgeText = '下期偏重';
        } else if (patternAnalysis.pattern.startsWith('quarter-heavy-')) {
            badgeClass = 'quarterly-pattern-quarter';
            const quarter = patternAnalysis.pattern.split('-')[2];
            badgeText = `${quarter}偏重`;
        } else if (patternAnalysis.pattern.startsWith('irregular-heavy-')) {
            badgeClass = 'quarterly-pattern-irregular';
            badgeText = '不規則';
        } else {
            return '';
        }

        return `<a href="#quarterly-pattern-section" class="quarterly-pattern-badge-link"><span class="quarterly-pattern-badge ${badgeClass}">${badgeText}</span></a>`;
    },

    generateTopixStatusBadge(stockCode) {
        if (typeof TOPIX_DATA === 'undefined' || typeof getTopixStockByCode !== 'function') {
            return '';
        }

        const topixStock = getTopixStockByCode(stockCode);
        if (!topixStock) return '';

        let badgeClass = '';
        let badgeText = '';

        if (topixStock.status === '継続') {
            badgeClass = 'topix-badge-continued';
            badgeText = '新TOPIX継続';
        } else if (topixStock.status === '新規') {
            badgeClass = 'topix-badge-new';
            badgeText = '新TOPIX新規';
        } else if (topixStock.status === '除外') {
            badgeClass = 'topix-badge-excluded';
            badgeText = '新TOPIX除外';
        } else {
            return '';
        }

        return `<a href="#cross-screening" class="topix-badge-link"><span class="topix-status-badge ${badgeClass}">${badgeText}</span></a>`;
    },

    generatePeakProfitUpdateBadge(stockCode) {
        if (typeof TOPIX_DATA === 'undefined' || typeof getTopixStockByCode !== 'function') {
            return '';
        }

        const topixStock = getTopixStockByCode(stockCode);
        if (!topixStock) return '';

        if (topixStock.peakUpdate !== 'はい') {
            return '';
        }

        let badgeText = '';
        if (topixStock.profitType === '営業利益') {
            badgeText = '営業最高益';
        } else if (topixStock.profitType === '純利益') {
            badgeText = '純利益最高益';
        } else {
            return '';
        }

        const badgeClass = 'peak-profit-update-badge';

        return `<a href="#cross-screening" class="peak-profit-badge-link"><span class="peak-profit-badge ${badgeClass}">${badgeText}</span></a>`;
    },

    showIndexCompanies(indexCode) {
        this.hideAllScreens();
        this.elements.industryCompanies.classList.remove('hidden');

        const indexName = DataManager.getIndexNameByCode(indexCode);
        this.elements.industryCompaniesTitle.textContent = `指数採用 - ${indexName}`;

        const companies = DataManager.getCompaniesByIndex(indexCode);
        this.elements.industryCompaniesCount.textContent = `${companies.length}社`;

        const html = companies.map(company => {
            const displayName = company.qr1ShortName || company.formalName;
            const marketBadges = this.generateMarketBadges(company.listedMarkets);
            return `
                <tr class="company-row" data-stock-code="${company.stockCode}">
                    <td>${company.stockCode}</td>
                    <td>${displayName}</td>
                    <td>${marketBadges}</td>
                </tr>
            `;
        }).join('');

        this.elements.companiesTableBody.innerHTML = html;
        this.elements.companiesTableBody.parentElement.scrollTop = 0;

        window.location.hash = indexCode;
    },

    showUpwardRevisionRankingPage() {
        this.hideAllScreens();
        const rankingSection = document.getElementById('upward-revision-ranking');
        if (rankingSection) {
            rankingSection.classList.remove('hidden');
            const rankingTableBody = document.getElementById('ranking-table-body');
            if (rankingTableBody) {
                this.showRestrictedContent(rankingTableBody.parentElement.parentElement, '上振れ期待ランキング');
            }
        }
    },

    showRestrictedContent(containerElement, title = '制限付きコンテンツ') {
        if (!containerElement) return;

        containerElement.innerHTML = `
            <div class="restricted-content">
                <img src="images/lock.svg" alt="制限" class="lock-icon">
                <div class="restricted-title">${title}</div>
                <div class="restricted-message">
                    <p>権限がありません。著作権関係から表示できません。</p>
                </div>
            </div>
        `;
    }
};
