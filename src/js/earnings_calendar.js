const EarningsCalendarManager = {
    currentYear: null,
    currentMonth: null,
    selectedDate: null,
    currentPage: 1,
    itemsPerPage: 20,
    allCompanies: [],
    filteredCompanies: [],

    init() {
        if (APP_CONFIG.isPublicVersion) {
            return;
        }

        const today = new Date();
        this.currentYear = today.getFullYear();
        this.currentMonth = today.getMonth() + 1;

        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('prev-month-btn').addEventListener('click', () => {
            this.navigateToPreviousMonth();
        });

        document.getElementById('next-month-btn').addEventListener('click', () => {
            this.navigateToNextMonth();
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('quarter-filter') ||
                e.target.classList.contains('market-filter') ||
                e.target.id === 'filter-exchange-impact' ||
                e.target.id === 'filter-upward-revision' ||
                e.target.id === 'filter-nikkei225' ||
                e.target.id === 'filter-pattern-change' ||
                e.target.id === 'filter-parent-same-date') {
                this.applyFilters();
            }
        });
    },

    applyFilters() {
        const selectedQuarters = Array.from(document.querySelectorAll('.quarter-filter:checked')).map(cb => cb.value);
        const selectedMarkets = Array.from(document.querySelectorAll('.market-filter:checked')).map(cb => cb.value);
        const filterExchangeImpact = document.getElementById('filter-exchange-impact')?.checked || false;
        const filterUpwardRevision = document.getElementById('filter-upward-revision')?.checked || false;
        const filterNikkei225 = document.getElementById('filter-nikkei225')?.checked || false;
        const filterPatternChange = document.getElementById('filter-pattern-change')?.checked || false;
        const filterParentSameDate = document.getElementById('filter-parent-same-date')?.checked || false;

        this.filteredCompanies = this.allCompanies.filter(company => {
            if (selectedQuarters.length > 0) {
                const quarterMatches = selectedQuarters.some(q => {
                    if (q === '1Q' && (company.quarter === '1Q連' || company.quarter === '1Q単')) return true;
                    if (q === '2Q' && (company.quarter === '2Q連' || company.quarter === '2Q単')) return true;
                    if (q === '3Q' && (company.quarter === '3Q連' || company.quarter === '3Q単')) return true;
                    if (q === '本決算' && (company.quarter === '本連' || company.quarter === '本単')) return true;
                    return false;
                });
                if (!quarterMatches) return false;
            }

            if (selectedMarkets.length > 0) {
                const hasSelectedMarket = selectedMarkets.some(market => {
                    if (!company.listedMarkets) return false;
                    if (market === 'プライム' && company.listedMarkets.includes('ﾌﾟﾗｲﾑ')) return true;
                    if (market === 'スタンダード' && company.listedMarkets.includes('ｽﾀﾝﾀﾞｰﾄﾞ')) return true;
                    if (market === 'グロース' && company.listedMarkets.includes('ｸﾞﾛｰｽ')) return true;
                    return false;
                });
                if (!hasSelectedMarket) return false;
            }

            if (filterExchangeImpact && !company.hasExchangeImpact) {
                return false;
            }

            if (filterUpwardRevision && !company.hasUpwardRevision) {
                return false;
            }

            if (filterNikkei225 && !company.isNikkei225) {
                return false;
            }

            if (filterPatternChange && !company.hasPatternChange) {
                return false;
            }

            if (filterParentSameDate && !company.hasParentSameDate) {
                return false;
            }

            return true;
        });

        this.currentPage = 1;
        this.renderCompaniesTable();
    },

    showEarningsCalendar(year = null, month = null) {
        UIManager.hideAllScreens();
        const earningsCalendar = document.getElementById('earnings-calendar');
        earningsCalendar.classList.remove('hidden');

        if (APP_CONFIG.isPublicVersion) {
            const calendarGrid = document.getElementById('calendar-grid');
            if (calendarGrid) {
                UIManager.showRestrictedContent(calendarGrid.parentElement, '決算発表予定');
            }
            return;
        }

        if (year) this.currentYear = year;
        if (month) this.currentMonth = month;

        this.renderCalendar();

        const monthString = String(this.currentMonth).padStart(2, '0');
        window.location.hash = `earnings-calendar/${this.currentYear}-${monthString}`;
    },

    renderCalendar() {
        const calendarData = DataManager.getEarningsCalendar(this.currentYear, this.currentMonth);

        document.getElementById('calendar-year-month').textContent =
            `${this.currentYear}年${this.currentMonth}月`;

        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.innerHTML = this.generateCalendarHTML(calendarData);

        this.attachCalendarEventListeners();
    },

    generateCalendarHTML(calendarData) {
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let html = '<div class="calendar-weekdays">';
        ['日', '月', '火', '水', '木', '金', '土'].forEach((dayName, index) => {
            const dayClass = index === 0 ? 'sunday' : index === 6 ? 'saturday' : '';
            html += `<div class="calendar-weekday ${dayClass}">${dayName}</div>`;
        });
        html += '</div>';

        html += '<div class="calendar-days-grid">';

        for (let i = 0; i < calendarData.firstDayOfWeek; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        calendarData.days.forEach(dayData => {
            const isToday = dayData.dateString === todayString;
            const hasEarnings = dayData.count > 0;

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (hasEarnings) dayClass += ' has-earnings';
            if (this.selectedDate === dayData.dateString) dayClass += ' selected';

            html += `
                <div class="${dayClass}" data-date="${dayData.dateString}">
                    <div class="day-number">${dayData.day}</div>
                    ${hasEarnings ? `<div class="earnings-count">(${dayData.count})</div>` : ''}
                </div>
            `;
        });

        html += '</div>';

        return html;
    },

    attachCalendarEventListeners() {
        document.querySelectorAll('.calendar-day.has-earnings').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const dateString = dayElement.getAttribute('data-date');
                this.selectDate(dateString);
            });
        });
    },

    selectDate(dateString) {
        this.selectedDate = dateString;

        document.querySelectorAll('.calendar-day').forEach(el => {
            el.classList.remove('selected');
        });
        const selectedElement = document.querySelector(`[data-date="${dateString}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }

        this.showEarningsCompanies(dateString);
    },

    showEarningsCompanies(dateString) {
        this.allCompanies = DataManager.getCompaniesByEarningsDate(dateString);

        if (window.upwardRevisionData) {
            this.allCompanies.forEach(company => {
                const upwardRevisionEntry = window.upwardRevisionData.find(
                    entry => entry.stockCode === company.stockCode
                );
                company.hasUpwardRevision = !!upwardRevisionEntry;
                if (upwardRevisionEntry) {
                    company.upwardRevisionScore = upwardRevisionEntry.combinedScore || 0;
                }
            });
        }

        if (window.earningsHistoryData && window.parentChildData) {
            this.allCompanies.forEach(company => {
                const quarterType = company.quarter.replace(/[連単]/g, '');

                const patternChange = detectParentSameDateChange(company.stockCode, quarterType, dateString);
                company.hasPatternChange = patternChange.hasChange;
                company.patternChangeInfo = patternChange;

                const parentSameDate = checkParentCompanySameDate(company.stockCode, dateString);
                company.hasParentSameDate = !!parentSameDate;
                company.parentSameDateInfo = parentSameDate;

                if (typeof getParentCompanies === 'function') {
                    company.parentCompanies = getParentCompanies(company.stockCode);
                }
                if (typeof getChildCompanies === 'function') {
                    company.childCompanies = getChildCompanies(company.stockCode);
                }
            });
        }

        const [year, month, day] = dateString.split('-');
        document.getElementById('earnings-date-title').textContent =
            `${year}年${parseInt(month)}月${parseInt(day)}日の決算発表予定`;

        this.applyFilters();
        document.getElementById('earnings-companies-list').classList.remove('hidden');
    },

    renderCompaniesTable() {
        const totalPages = Math.ceil(this.filteredCompanies.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageCompanies = this.filteredCompanies.slice(startIndex, endIndex);

        document.getElementById('earnings-companies-count').textContent =
            `${this.filteredCompanies.length}社（${startIndex + 1}-${Math.min(endIndex, this.filteredCompanies.length)}件を表示）`;

        const tbody = document.getElementById('earnings-companies-table-body');

        const html = pageCompanies.map(company => {
            const displayName = company.name;
            const timeText = (company.hour !== null && company.minute !== null)
                ? `${String(company.hour).padStart(2, '0')}:${String(company.minute).padStart(2, '0')}`
                : '時刻未定';
            const marketBadges = UIManager.generateMarketBadges(company.listedMarkets);

            let featureBadges = '';
            if (company.hasExchangeImpact) {
                featureBadges += '<span class="feature-badge exchange-badge">為替</span>';
            }
            if (company.hasUpwardRevision) {
                featureBadges += '<span class="feature-badge upward-badge">上修</span>';
            }
            if (company.isNikkei225) {
                featureBadges += '<span class="feature-badge nikkei-badge">日経平均</span>';
            }
            if (company.hasPatternChange) {
                const changeInfo = company.patternChangeInfo.reason || '決算日変更';
                const parentName = company.patternChangeInfo.parentInfo ? company.patternChangeInfo.parentInfo.parentName : '';
                const titleText = parentName ? `親会社（${parentName}）と同日に変更` : changeInfo;
                featureBadges += `<span class="feature-badge pattern-change-badge" title="${titleText}">親同日化</span>`;
            }
            if (company.hasParentSameDate && company.parentSameDateInfo && company.parentSameDateInfo.length > 0) {
                const parentInfo = company.parentSameDateInfo[0];
                featureBadges += `<span class="feature-badge parent-same-date-badge" title="親会社: ${parentInfo.parentName}">親同日</span>`;
            }

            let relationInfo = '';
            if (company.parentCompanies && company.parentCompanies.length > 0) {
                const parentNames = company.parentCompanies.map(p => `${p.name}(${p.ownershipPercentage.toFixed(1)}%)`).join(', ');
                relationInfo += `<div class="relation-info parent-info">親: ${parentNames}</div>`;
            }
            if (company.childCompanies && company.childCompanies.length > 0) {
                const childNames = company.childCompanies.slice(0, 3).map(c => c.name).join(', ');
                const moreText = company.childCompanies.length > 3 ? ` 他${company.childCompanies.length - 3}社` : '';
                relationInfo += `<div class="relation-info child-info">子: ${childNames}${moreText}</div>`;
            }

            return `
                <tr class="company-row" data-stock-code="${company.stockCode}">
                    <td>${company.stockCode}</td>
                    <td>${displayName}</td>
                    <td>${company.quarter}</td>
                    <td>${timeText}</td>
                    <td>${marketBadges}</td>
                    <td>${featureBadges}</td>
                    <td>${relationInfo}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;

        document.querySelectorAll('#earnings-companies-table-body .company-row').forEach(row => {
            row.addEventListener('click', () => {
                const stockCode = row.getAttribute('data-stock-code');
                window.location.hash = stockCode;
            });
        });

        this.renderPagination(totalPages);
    },

    renderPagination(totalPages) {
        const paginationContainer = document.getElementById('earnings-pagination');

        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = '<div class="pagination-controls">';

        if (this.currentPage > 1) {
            html += `<button class="pagination-btn" data-page="${this.currentPage - 1}">◀ 前</button>`;
        }

        html += `<span class="pagination-info">ページ ${this.currentPage} / ${totalPages}</span>`;

        if (this.currentPage < totalPages) {
            html += `<button class="pagination-btn" data-page="${this.currentPage + 1}">次 ▶</button>`;
        }

        html += '</div>';

        paginationContainer.innerHTML = html;

        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.getAttribute('data-page'));
                this.renderCompaniesTable();
            });
        });
    },

    navigateToPreviousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        this.selectedDate = null;
        document.getElementById('earnings-companies-list').classList.add('hidden');
        this.renderCalendar();

        const monthString = String(this.currentMonth).padStart(2, '0');
        window.location.hash = `earnings-calendar/${this.currentYear}-${monthString}`;
    },

    navigateToNextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        }
        this.selectedDate = null;
        document.getElementById('earnings-companies-list').classList.add('hidden');
        this.renderCalendar();

        const monthString = String(this.currentMonth).padStart(2, '0');
        window.location.hash = `earnings-calendar/${this.currentYear}-${monthString}`;
    }
};
