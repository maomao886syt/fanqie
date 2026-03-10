/* ========================================
   番茄时钟 - 核心逻辑
   ======================================== */

// ============================================
// 1. 全局状态与配置
// ============================================

/**
 * 应用状态对象
 */
const state = {
    // 当前模式：pomodoro, short-break, long-break
    currentMode: 'pomodoro',
    
    // 计时器状态
    isRunning: false,
    isPaused: false,
    
    // 时间相关（单位：秒）
    timeRemaining: 25 * 60,
    
    // 计时器ID
    timerId: null,
    
    // 完成的番茄钟数量（用于判断是否需要长休息）
    completedPomodoros: 0,
    
    // 时长设置（单位：分钟）
    durations: {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15
    }
};

/**
 * 本地存储键名
 */
const STORAGE_KEYS = {
    TODAY_STATS: 'pomodoro_today_stats',
    HISTORY: 'pomodoro_history',
    SETTINGS: 'pomodoro_settings'
};

// ============================================
// 2. DOM 元素引用
// ============================================

const elements = {
    // 计时器显示
    timer: document.getElementById('timer'),
    modeLabel: document.getElementById('mode-label'),
    
    // 控制按钮
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    
    // 模式切换
    modeTabs: document.querySelectorAll('.mode-tab'),
    
    // 设置
    pomodoroTime: document.getElementById('pomodoro-time'),
    shortBreakTime: document.getElementById('short-break-time'),
    longBreakTime: document.getElementById('long-break-time'),
    saveSettings: document.getElementById('save-settings'),
    
    // 统计
    todayCount: document.getElementById('today-count'),
    todayDuration: document.getElementById('today-duration'),
    toggleHistory: document.getElementById('toggle-history'),
    historyList: document.getElementById('history-list'),
    
    // 弹窗
    alertModal: document.getElementById('alert-modal'),
    alertMessage: document.getElementById('alert-message'),
    closeAlert: document.getElementById('close-alert')
};

// ============================================
// 3. 工具函数
// ============================================

/**
 * 格式化时间（秒 -> MM:SS）
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 */
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * 获取当前时间字符串（HH:MM）
 */
function getCurrentTimeString() {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
}

/**
 * 播放提示音
 */
function playNotificationSound() {
    const audioUrl = 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3';
    const audio = new Audio(audioUrl);
    audio.volume = 0.7;
    audio.play().catch(err => console.log('音频播放失败:', err));
}

/**
 * 显示提示弹窗
 */
function showAlert(message) {
    elements.alertMessage.textContent = message;
    elements.alertModal.classList.remove('hidden');
}

/**
 * 隐藏提示弹窗
 */
function hideAlert() {
    elements.alertModal.classList.add('hidden');
}

// ============================================
// 4. 数据持久化（localStorage）
// ============================================

/**
 * 获取今日统计数据
 */
function getTodayStats() {
    const data = localStorage.getItem(STORAGE_KEYS.TODAY_STATS);
    if (!data) return { date: getTodayString(), count: 0, duration: 0 };
    
    const stats = JSON.parse(data);
    if (stats.date !== getTodayString()) {
        return { date: getTodayString(), count: 0, duration: 0 };
    }
    return stats;
}

/**
 * 保存今日统计数据
 */
function saveTodayStats(stats) {
    localStorage.setItem(STORAGE_KEYS.TODAY_STATS, JSON.stringify(stats));
}

/**
 * 获取历史记录
 */
function getHistory() {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
}

/**
 * 保存历史记录
 */
function saveHistory(history) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

/**
 * 添加一条历史记录
 */
function addHistoryRecord(duration) {
    const history = getHistory();
    const record = {
        id: Date.now(),
        date: getTodayString(),
        time: getCurrentTimeString(),
        duration: duration
    };
    history.push(record);
    saveHistory(history);
}

/**
 * 删除一条历史记录
 */
function deleteHistoryRecord(id) {
    let history = getHistory();
    history = history.filter(record => record.id !== id);
    saveHistory(history);
}

/**
 * 获取设置
 */
function getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
}

/**
 * 保存设置
 */
function saveSettingsToStorage(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// ============================================
// 5. 计时器核心逻辑
// ============================================

/**
 * 更新计时器显示
 */
function updateTimerDisplay() {
    elements.timer.textContent = formatTime(state.timeRemaining);
    
    // 根据剩余时间改变颜色
    const minutes = state.timeRemaining / 60;
    elements.timer.classList.remove('warning', 'danger');
    
    if (minutes <= 5 && state.currentMode === 'pomodoro') {
        if (minutes <= 2) {
            elements.timer.classList.add('danger');
        } else {
            elements.timer.classList.add('warning');
        }
    }
}

/**
 * 更新模式标签
 */
function updateModeLabel() {
    const labels = {
        'pomodoro': '番茄钟',
        'short-break': '短休息',
        'long-break': '长休息'
    };
    elements.modeLabel.textContent = labels[state.currentMode];
}

/**
 * 开始计时
 */
function startTimer() {
    if (state.isRunning && !state.isPaused) return;
    
    state.isRunning = true;
    state.isPaused = false;
    
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    
    state.timerId = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        
        if (state.timeRemaining <= 0) {
            timerComplete();
        }
    }, 1000);
}

/**
 * 暂停计时
 */
function pauseTimer() {
    if (!state.isRunning || state.isPaused) return;
    
    state.isPaused = true;
    clearInterval(state.timerId);
    
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = '继续';
    elements.pauseBtn.disabled = true;
}

/**
 * 重置计时器
 */
function resetTimer() {
    clearInterval(state.timerId);
    state.isRunning = false;
    state.isPaused = false;
    
    const durations = {
        'pomodoro': state.durations.pomodoro,
        'short-break': state.durations.shortBreak,
        'long-break': state.durations.longBreak
    };
    state.timeRemaining = durations[state.currentMode] * 60;
    
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = '开始';
    elements.pauseBtn.disabled = true;
    
    updateTimerDisplay();
}

/**
 * 计时完成处理
 */
function timerComplete() {
    clearInterval(state.timerId);
    state.isRunning = false;
    state.isPaused = false;
    
    playNotificationSound();
    
    if (state.currentMode === 'pomodoro') {
        state.completedPomodoros++;
        
        const stats = getTodayStats();
        stats.count++;
        stats.duration += state.durations.pomodoro;
        saveTodayStats(stats);
        
        addHistoryRecord(state.durations.pomodoro);
        
        updateStatsDisplay();
        
        if (state.completedPomodoros % 4 === 0) {
            showAlert('🎉 太棒了！完成了4个番茄钟，开始长休息吧！');
            switchMode('long-break');
        } else {
            showAlert('✅ 番茄钟完成！休息一下吧~');
            switchMode('short-break');
        }
    } else {
        showAlert('⏰ 休息结束，继续加油！');
        switchMode('pomodoro');
    }
    
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = '开始';
    elements.pauseBtn.disabled = true;
}

/**
 * 切换模式
 */
function switchMode(mode) {
    state.currentMode = mode;
    
    elements.modeTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    resetTimer();
    updateModeLabel();
}

// ============================================
// 6. 统计与历史记录显示
// ============================================

/**
 * 更新统计显示
 */
function updateStatsDisplay() {
    const stats = getTodayStats();
    elements.todayCount.textContent = stats.count;
    elements.todayDuration.textContent = `${stats.duration} 分钟`;
}

/**
 * 渲染历史记录
 */
function renderHistory() {
    const history = getHistory();
    
    const grouped = {};
    history.forEach(record => {
        if (!grouped[record.date]) {
            grouped[record.date] = [];
        }
        grouped[record.date].push(record);
    });
    
    let html = '';
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    
    sortedDates.forEach(date => {
        html += `<div class="history-date">📅 ${date}</div>`;
        grouped[date].forEach(record => {
            html += `
                <div class="history-item">
                    <span class="history-time">${record.time} - ${record.duration}分钟</span>
                    <button class="delete-btn" data-id="${record.id}">删除</button>
                </div>
            `;
        });
    });
    
    if (html === '') {
        html = '<div class="history-item" style="justify-content: center; color: var(--text-secondary);">暂无记录</div>';
    }
    
    elements.historyList.innerHTML = html;
}

// ============================================
// 7. 事件监听器
// ============================================

/**
 * 初始化事件监听
 */
function initEventListeners() {
    // 开始按钮
    elements.startBtn.addEventListener('click', () => {
        startTimer();
    });
    
    // 暂停按钮
    elements.pauseBtn.addEventListener('click', () => {
        pauseTimer();
    });
    
    // 重置按钮
    elements.resetBtn.addEventListener('click', () => {
        resetTimer();
    });
    
    // 模式切换
    elements.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            switchMode(mode);
        });
    });
    
    // 保存设置
    elements.saveSettings.addEventListener('click', () => {
        const pomodoro = parseInt(elements.pomodoroTime.value);
        const shortBreak = parseInt(elements.shortBreakTime.value);
        const longBreak = parseInt(elements.longBreakTime.value);
        
        if (pomodoro < 1 || pomodoro > 60 || shortBreak < 1 || shortBreak > 30 || longBreak < 1 || longBreak > 60) {
            showAlert('请输入有效的时间范围！');
            return;
        }
        
        state.durations.pomodoro = pomodoro;
        state.durations.shortBreak = shortBreak;
        state.durations.longBreak = longBreak;
        
        saveSettingsToStorage(state.durations);
        
        resetTimer();
        
        showAlert('✅ 设置已保存！');
    });
    
    // 展开/收起历史记录
    elements.toggleHistory.addEventListener('click', () => {
        const isHidden = elements.historyList.classList.contains('hidden');
        elements.historyList.classList.toggle('hidden');
        elements.toggleHistory.textContent = isHidden ? '收起记录' : '展开记录';
    });
    
    // 删除历史记录
    elements.historyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = parseInt(e.target.dataset.id);
            deleteHistoryRecord(id);
            renderHistory();
            updateStatsDisplay();
        }
    });
    
    // 关闭弹窗
    elements.closeAlert.addEventListener('click', hideAlert);
    elements.alertModal.addEventListener('click', (e) => {
        if (e.target === elements.alertModal) {
            hideAlert();
        }
    });
}

// ============================================
// 8. 初始化应用
// ============================================

/**
 * 初始化应用
 */
function initApp() {
    // 加载设置
    const savedSettings = getSettings();
    if (savedSettings) {
        state.durations = savedSettings;
        elements.pomodoroTime.value = savedSettings.pomodoro;
        elements.shortBreakTime.value = savedSettings.shortBreak;
        elements.longBreakTime.value = savedSettings.longBreak;
    }
    
    // 初始化计时器
    state.timeRemaining = state.durations.pomodoro * 60;
    updateTimerDisplay();
    updateModeLabel();
    
    // 初始化统计显示
    updateStatsDisplay();
    renderHistory();
    
    // 绑定事件监听器
    initEventListeners();
    
    console.log('🍅 番茄时钟已启动！');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);