let earningsHistoryData = null;
let parentChildData = null;

async function loadEarningsHistory() {
    try {
        console.log('決算発表履歴データを読み込み中...');
        const response = await fetch('data/kabutan_quarterly.csv');
        const csvText = await response.text();

        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        const historyByCompany = new Map();

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const stockCode = values[0]?.trim();
            const period = values[2]?.trim();
            const announcementDate = values[10]?.trim();

            if (!stockCode || !period || !announcementDate) continue;

            if (!historyByCompany.has(stockCode)) {
                historyByCompany.set(stockCode, []);
            }

            const periodMatch = period.match(/(\d{2})\.(\d{2})-(\d{2})/);
            if (!periodMatch) continue;

            const fiscalYear = parseInt(periodMatch[1]);
            const startMonth = parseInt(periodMatch[2]);
            const endMonth = parseInt(periodMatch[3]);

            const dateMatch = announcementDate.match(/(\d{2})\/(\d{2})\/(\d{2})/);
            if (!dateMatch) continue;

            const announceYear = parseInt('20' + dateMatch[1]);
            const announceMonth = parseInt(dateMatch[2]);
            const announceDay = parseInt(dateMatch[3]);

            const announceDate = new Date(announceYear, announceMonth - 1, announceDay);
            const weekday = announceDate.getDay();
            const weekOfMonth = Math.floor((announceDay - 1) / 7) + 1;

            historyByCompany.get(stockCode).push({
                period: period,
                fiscalYear: fiscalYear,
                startMonth: startMonth,
                endMonth: endMonth,
                announcementDate: announcementDate,
                announceYear: announceYear,
                announceMonth: announceMonth,
                announceDay: announceDay,
                weekday: weekday,
                weekOfMonth: weekOfMonth,
                dateObject: announceDate
            });
        }

        historyByCompany.forEach((records, stockCode) => {
            records.sort((a, b) => a.dateObject - b.dateObject);
        });

        earningsHistoryData = window.earningsHistoryData = historyByCompany;
        console.log(`決算発表履歴データ読み込み完了: ${historyByCompany.size}社`);
        return earningsHistoryData;

    } catch (error) {
        console.error('決算発表履歴データの読み込みに失敗:', error);
        return null;
    }
}

async function loadParentChildData() {
    try {
        console.log('親子上場データを読み込み中...');
        const response = await fetch('data/parent_child_listings.csv');
        const csvText = await response.text();

        const lines = csvText.trim().split('\n');
        const parentChildMap = new Map();

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const parentCode = values[0]?.trim();
            const childCode = values[2]?.trim();
            const ownershipPercentage = parseFloat(values[4]?.trim());

            if (!parentCode || !childCode) continue;

            if (!parentChildMap.has(childCode)) {
                parentChildMap.set(childCode, []);
            }

            parentChildMap.get(childCode).push({
                parentStockCode: parentCode,
                ownershipPercentage: ownershipPercentage
            });
        }

        parentChildData = window.parentChildData = parentChildMap;
        console.log(`親子上場データ読み込み完了: ${parentChildMap.size}社`);
        return parentChildData;

    } catch (error) {
        console.error('親子上場データの読み込みに失敗:', error);
        return null;
    }
}

function normalizeQuarter(fiscalPeriod, endMonth) {
    if (!fiscalPeriod) return null;

    const fiscalMatch = fiscalPeriod.match(/(\d+)\/末/);
    if (!fiscalMatch) return null;

    const fiscalEndMonth = parseInt(fiscalMatch[1]);

    const monthsFromFiscalEnd = (endMonth - fiscalEndMonth + 12) % 12;

    if (monthsFromFiscalEnd === 0) return '本';
    if (monthsFromFiscalEnd === 9) return '3Q';
    if (monthsFromFiscalEnd === 6) return '2Q';
    if (monthsFromFiscalEnd === 3) return '1Q';

    return null;
}

function getHistoricalPattern(stockCode, quarterType) {
    if (!earningsHistoryData || !earningsHistoryData.has(stockCode)) {
        return null;
    }

    const company = DataManager.getCompanyByStockCode(stockCode);
    if (!company || !company.fiscalPeriod) {
        return null;
    }

    const records = earningsHistoryData.get(stockCode);

    const matchingRecords = records.filter(record => {
        const normalizedQuarter = normalizeQuarter(company.fiscalPeriod, record.endMonth);
        return normalizedQuarter === quarterType;
    });

    if (matchingRecords.length === 0) {
        return null;
    }

    const recent = matchingRecords.slice(-5);

    const weekdayCounts = new Map();
    const monthCounts = new Map();
    const weekOfMonthCounts = new Map();

    recent.forEach(record => {
        weekdayCounts.set(record.weekday, (weekdayCounts.get(record.weekday) || 0) + 1);
        monthCounts.set(record.announceMonth, (monthCounts.get(record.announceMonth) || 0) + 1);
        weekOfMonthCounts.set(record.weekOfMonth, (weekOfMonthCounts.get(record.weekOfMonth) || 0) + 1);
    });

    const mostCommonWeekday = Array.from(weekdayCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const mostCommonMonth = Array.from(monthCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const mostCommonWeek = Array.from(weekOfMonthCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return {
        recentRecords: recent,
        mostCommonWeekday: mostCommonWeekday,
        mostCommonMonth: mostCommonMonth,
        mostCommonWeek: mostCommonWeek,
        weekdayConsistency: weekdayCounts.get(mostCommonWeekday) / recent.length,
        monthConsistency: monthCounts.get(mostCommonMonth) / recent.length,
        weekConsistency: weekOfMonthCounts.get(mostCommonWeek) / recent.length
    };
}

function detectParentSameDateChange(stockCode, quarterType, scheduledDateString) {
    if (!parentChildData) {
        console.log(`[${stockCode}] parentChildData が未定義`);
        return {
            hasChange: false,
            reason: 'parentChildData未定義'
        };
    }

    if (!parentChildData.has(stockCode)) {
        return {
            hasChange: false,
            reason: '親子関係なし'
        };
    }

    if (!earningsHistoryData) {
        console.log(`[${stockCode}] earningsHistoryData が未定義`);
        return {
            hasChange: false,
            reason: 'earningsHistoryData未定義'
        };
    }

    if (!earningsHistoryData.has(stockCode)) {
        return {
            hasChange: false,
            reason: '履歴データなし'
        };
    }

    const company = DataManager.getCompanyByStockCode(stockCode);
    if (!company || !company.fiscalPeriod) {
        return {
            hasChange: false,
            reason: '企業データなし'
        };
    }

    const parents = parentChildData.get(stockCode);
    const childRecords = earningsHistoryData.get(stockCode);

    const matchingRecords = childRecords.filter(record => {
        const normalizedQuarter = normalizeQuarter(company.fiscalPeriod, record.endMonth);
        return normalizedQuarter === quarterType;
    });

    if (matchingRecords.length === 0) {
        return {
            hasChange: false,
            reason: '過去データなし'
        };
    }

    const recentRecords = matchingRecords.slice(-5);

    let historicalSameDateCount = 0;
    let checkedParents = [];

    for (const parentInfo of parents) {
        if (parentInfo.ownershipPercentage < 8.0) {
            continue;
        }

        const parentCompany = DataManager.getCompanyByStockCode(parentInfo.parentStockCode);
        if (!parentCompany || !earningsHistoryData.has(parentInfo.parentStockCode)) {
            continue;
        }

        const parentRecords = earningsHistoryData.get(parentInfo.parentStockCode);

        for (const childRecord of recentRecords) {
            const childDateString = `${childRecord.announceYear}-${String(childRecord.announceMonth).padStart(2, '0')}-${String(childRecord.announceDay).padStart(2, '0')}`;

            const parentSameDateRecords = parentRecords.filter(pr => {
                const parentDateString = `${pr.announceYear}-${String(pr.announceMonth).padStart(2, '0')}-${String(pr.announceDay).padStart(2, '0')}`;
                return parentDateString === childDateString;
            });

            if (parentSameDateRecords.length > 0) {
                historicalSameDateCount++;
                break;
            }
        }

        checkedParents.push({
            parentStockCode: parentInfo.parentStockCode,
            parentName: parentCompany.qr1ShortName || parentCompany.formalName
        });
    }

    const currentParentSameDate = checkParentCompanySameDate(stockCode, scheduledDateString);

    if (!currentParentSameDate || currentParentSameDate.length === 0) {
        return {
            hasChange: false,
            reason: '現在は親会社と別日'
        };
    }

    if (historicalSameDateCount === 0) {
        console.log(`[${stockCode}] 親会社と同日化検出: 過去は別日、現在は同日（親: ${currentParentSameDate[0].parentName}）`);
        return {
            hasChange: true,
            reason: '過去は別日、現在は同日',
            parentInfo: currentParentSameDate[0],
            historicalSameDateCount: 0,
            recentRecordsCount: recentRecords.length
        };
    }

    return {
        hasChange: false,
        reason: '過去も親会社と同日',
        historicalSameDateCount: historicalSameDateCount
    };
}

function checkParentCompanySameDate(stockCode, scheduledDateString) {
    if (!parentChildData || !parentChildData.has(stockCode)) {
        return null;
    }

    const parents = parentChildData.get(stockCode);
    const sameParents = [];

    parents.forEach(parent => {
        if (parent.ownershipPercentage < 8.0) return;

        const parentCompany = DataManager.getCompanyByStockCode(parent.parentStockCode);
        if (!parentCompany || !parentCompany.earningsSchedule) return;

        const parentSchedules = DataManager.parseEarningsSchedule(parentCompany.earningsSchedule);

        parentSchedules.forEach(schedule => {
            if (schedule.dateString === scheduledDateString) {
                sameParents.push({
                    parentStockCode: parent.parentStockCode,
                    parentName: parentCompany.qr1ShortName || parentCompany.formalName,
                    ownershipPercentage: parent.ownershipPercentage,
                    quarter: schedule.quarter
                });
            }
        });
    });

    if (sameParents.length > 0) {
        return sameParents;
    }

    return null;
}

function getWeekdayNameJa(weekday) {
    const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdayNames[weekday];
}

function getParentCompanies(stockCode) {
    if (!parentChildData || !parentChildData.has(stockCode)) {
        return [];
    }

    return parentChildData.get(stockCode)
        .filter(parentInfo => parentInfo.ownershipPercentage >= 8.0)
        .map(parentInfo => {
            const parentCompany = DataManager.getCompanyByStockCode(parentInfo.parentStockCode);
            return {
                stockCode: parentInfo.parentStockCode,
                name: parentCompany ? (parentCompany.qr1ShortName || parentCompany.formalName) : '不明',
                ownershipPercentage: parentInfo.ownershipPercentage
            };
        });
}

function getChildCompanies(stockCode) {
    if (!parentChildData) {
        return [];
    }

    const children = [];

    parentChildData.forEach((parents, childStockCode) => {
        const hasThisParent = parents.some(p => p.parentStockCode === stockCode && p.ownershipPercentage >= 8.0);
        if (hasThisParent) {
            const parentInfo = parents.find(p => p.parentStockCode === stockCode);
            if (parentInfo.ownershipPercentage >= 8.0) {
                const childCompany = DataManager.getCompanyByStockCode(childStockCode);
                children.push({
                    stockCode: childStockCode,
                    name: childCompany ? (childCompany.qr1ShortName || childCompany.formalName) : '不明',
                    ownershipPercentage: parentInfo.ownershipPercentage
                });
            }
        }
    });

    return children.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);
}
