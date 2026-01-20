async function initializeApp() {
    const loadingSuccess = await DataManager.loadCSV();

    if (!loadingSuccess) {
        alert('企業データの読み込みに失敗しました。ページを再読み込みしてください。');
        return;
    }

    await loadEarningsHistory();

    CrossScreeningManager.init();
    EarningsCalendarManager.init();
    UIManager.init();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
