/**
 * 2025知识竞赛模拟系统 - 核心逻辑库
 * Created By Kingkong
 * Contains: Timer, Rendering, History, State Persistence, Submission, etc.
 */

// ================= 全局变量定義 =================
let currentPaper = [];
let userAnswers = {};
let timeLeft = 3600;
let timerId = null;
let isExamFinished = false;
let isWrongOnlyMode = false;
let globalIndexMap = {};
let currentStudent = { name: "", id: "" };
let QUESTION_MAP = {};
let switchScreenCount = 0;

// ================= 初始化与核心逻辑 =================

// 初始化题库索引：ID -> Question对象 (实现 O(1) 查找)
function initQuestionMap() {
    if (typeof QUESTION_DB !== 'undefined') {
        const types = ['single', 'multi', 'tf'];
        types.forEach(type => {
            if (QUESTION_DB[type]) {
                QUESTION_DB[type].forEach(q => {
                    QUESTION_MAP[q.id] = q;
                });
            }
        });
    }
}

// 格式化时间
function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
}

// 获取标准答案 (兼容性增强版：支持 'A', 'A,B', '对', 以及全文本匹配)
function getStandardAnswer(q) {
    let raw = q.answer.trim();

    // 1. 尝试清洗为纯字母 (移除标点空格)
    let cleanStr = raw.replace(/[\s,\.、，。]/g, '').toUpperCase();
    const isLetterOnly = /^[A-Z]+$/.test(cleanStr);

    // 如果已经是纯字母 (如 "A", "AB")，直接返回排序后的字符串
    if (isLetterOnly) return cleanStr.split('').sort().join('');

    // 2. 如果包含非字母字符 (如 "对", "错", 或选项全文本)，尝试匹配选项
    let mappedKey = "";
    // TF题型通常这里 options 为 undefined, 需要兼容 render 时的逻辑
    const options = q.options || (q.type === 'tf' ? ['对', '错'] : []);

    options.forEach((opt, index) => {
        // 清洗选项文本 (移除 "A." 等前缀)
        const optTxt = opt.replace(/^[A-F\d][\.\、\s]+/, '').trim();

        // 匹配原始答案 OR 清洗后答案
        if (optTxt === raw || optTxt === cleanStr) {
            mappedKey = String.fromCharCode(65 + index);
        }
    });

    // 如果匹配到了 (例如 "对" -> "A")，返回 A；否则兜底返回原始值
    return mappedKey || raw;
}

// ... renderPaper ...

// ... initAnswerCard ...

// ... handleAnswer ... 

// ... updateCardStatus ...

// ... updateFabProgress ...

// ... updateTimer ...

// ================= 历史记录与复盘 =================

function reviewWrong() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('exam-screen').style.display = 'block';

    // 适配两种 header ID (index.html 和 exam.html 可能略有差异，这里确保都尝试)
    const reviewBar = document.getElementById('review-top-bar');
    if (reviewBar) reviewBar.style.display = 'flex';

    const examBar = document.getElementById('exam-top-bar');
    if (examBar) examBar.style.display = 'none';

    const action = document.getElementById('exam-bottom-action');
    if (action) action.style.display = 'none';

    const fab = document.getElementById('fab-btn');
    if (fab) fab.style.display = 'flex';

    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) filterBtn.style.display = 'block';

    document.body.classList.add('show-analysis');

    // 标记错题
    let wrongCount = 0;
    currentPaper.forEach(q => {
        const myAns = userAnswers[q.id] || "";
        const rightAns = getStandardAnswer(q);
        const card = document.getElementById(`q-${q.id}`);
        const cardItem = document.getElementById(`card-${q.id}`);

        // 禁用交互
        const inputs = document.getElementsByName(q.id);
        for (let inp of inputs) inp.disabled = true;

        if (myAns !== rightAns) {
            if (card) card.classList.add('wrong-ans');
            if (cardItem) cardItem.className = 'card-item wrong';
            wrongCount++;
        } else {
            if (cardItem) cardItem.className = 'card-item correct';
        }
    });

    alert(`共 ${wrongCount} 道错题，已标红显示。`);
    // 默认进入"只看错题"模式? 这里保持默认看全部，手动点击切换
    window.scrollTo(0, 0);
}

function toggleWrongOnly(btn) {
    isWrongOnlyMode = !isWrongOnlyMode;
    const cards = document.querySelectorAll('.question-card');
    const headers = document.querySelectorAll('.section-title');

    if (isWrongOnlyMode) {
        btn.innerText = "查看全部";
        btn.style.background = "#d4a845";
        btn.style.color = "white";

        cards.forEach(c => {
            if (!c.classList.contains('wrong-ans')) {
                c.style.display = 'none';
            } else {
                c.style.display = 'block';
            }
        });

        // 【Fix】隐藏空的分类标题
        headers.forEach(h => h.style.display = 'none');

    } else {
        btn.innerText = "只看错题";
        btn.style.background = "#fff";
        btn.style.color = "#333";

        cards.forEach(c => c.style.display = 'block');
        headers.forEach(h => h.style.display = 'block');
    }
}

// 保存历史记录
function saveHistory(score, durationSec, correctCount, typeStats) {
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('kk_exam_history') || '[]');
    } catch (e) { history = []; }

    const statsDisplay = `单选 ${typeStats.single.correct}/${typeStats.single.total} | 多选 ${typeStats.multi.correct}/${typeStats.multi.total} | 判断 ${typeStats.tf.correct}/${typeStats.tf.total}`;

    const newRecord = {
        date: new Date().toLocaleString(),
        score: score,
        duration: formatDuration(durationSec),
        stats: statsDisplay,
        snapshot: {
            // 只存ID和答案，节省空间
            qIds: currentPaper.map(q => q.id),
            answers: userAnswers
        }
    };

    history.unshift(newRecord);
    if (history.length > 20) history = history.slice(0, 20); // 保留最近20条

    localStorage.setItem('kk_exam_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list-container');
    if (!list) return;

    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('kk_exam_history') || '[]');
    } catch (e) {
        history = [];
    }

    if (history.length === 0) {
        list.innerHTML = '<p style="color:#999; font-size:12px; text-align:center;">暂无练习记录</p>';
        return;
    }

    let html = `
    <table class="history-table">
        <thead>
            <tr>
                <th style="width:35%">时间</th>
                <th style="width:15%">分数</th>
                <th style="width:20%">用时</th>
                <th style="width:30%">详情</th>
            </tr>
        </thead>
        <tbody>`;

    history.forEach((rec, idx) => {
        // 使用 onclick 触发加载快照
        html += `
        <tr class="history-row-clickable" onclick="loadHistorySnapshot(${idx})">
            <td>${rec.date.split(' ')[0]}<br>${rec.date.split(' ')[1] || ''}</td>
            <td class="history-score">${rec.score}</td>
            <td>${rec.duration}</td>
            <td style="font-size:10px; transform:scale(0.9);">${rec.stats}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    list.innerHTML = html;
}

function clearHistory() {
    if (confirm('确定要清空所有本机历史记录吗？')) {
        localStorage.removeItem('kk_exam_history');
        renderHistory();
    }
}

// 历史快照复盘
function loadHistorySnapshot(index) {
    try {
        const history = JSON.parse(localStorage.getItem('kk_exam_history') || '[]');
        const record = history[index];
        if (!record || !record.snapshot) {
            alert("该记录无法复盘");
            return;
        }

        if (!confirm("确定要加载这场考试的历史记录进行复盘吗？\n当前正在进行的考试进度将丢失（如果未提交）。")) return;

        // 恢复数据
        currentPaper = [];
        record.snapshot.qIds.forEach(id => {
            if (QUESTION_MAP[id]) currentPaper.push(QUESTION_MAP[id]);
        });
        userAnswers = record.snapshot.answers;
        isExamFinished = true; // 标记为已结束，禁止修改

        // 渲染页面
        const singles = currentPaper.filter(q => q.type === 'single');
        const multis = currentPaper.filter(q => q.type === 'multi');
        const tfs = currentPaper.filter(q => q.type === 'tf');

        renderPaper(singles, multis, tfs);
        initAnswerCard(singles, multis, tfs);

        // 恢复所有选项勾选UI
        setTimeout(() => {
            currentPaper.forEach(q => {
                const uAns = userAnswers[q.id];
                if (uAns) {
                    const inputs = document.getElementsByName(q.id);
                    for (let inp of inputs) {
                        if (uAns.includes(inp.value)) {
                            inp.checked = true;
                            const lbl = document.getElementById(`lbl-${q.id}-${inp.value}`);
                            if (lbl) lbl.classList.add('selected');
                        }
                    }
                    updateCardStatus(q.id, 'answered');
                }
            });
            // 进入复盘模式
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('main-header').style.display = 'none';
            reviewWrong();
        }, 100);

    } catch (e) {
        console.error(e);
        alert("读取记录失败");
    }
}

// ================= UI Helpers =================

function toggleAnswerCard() {
    const modal = document.getElementById('answer-card-modal');
    if (!modal) return;

    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    } else {
        modal.style.display = 'flex';
        // 强制重绘以触发 transition
        modal.offsetHeight;
        modal.classList.add('active');
    }
}

// ================= V3.0 新增：状态持久化与重试机制 =================

// 1. 保存当前考试状态
function saveExamState() {
    if (isExamFinished) return;
    const session = {
        student: currentStudent,
        paperIds: currentPaper.map(q => q.id),
        answers: userAnswers,
        timeLeft: timeLeft,
        switchCount: typeof switchScreenCount !== 'undefined' ? switchScreenCount : 0,
        timestamp: Date.now()
    };
    localStorage.setItem('kk_exam_session_v2', JSON.stringify(session));
}

// 2. 恢复考试会话
function restoreExamSession() {
    try {
        const json = localStorage.getItem('kk_exam_session_v2');
        if (!json) return;

        const session = JSON.parse(json);
        // 如果记录超过2小时，视为过期，不恢复
        if (Date.now() - session.timestamp > 2 * 60 * 60 * 1000) {
            localStorage.removeItem('kk_exam_session_v2');
            return;
        }

        if (confirm(`检测到您于 ${new Date(session.timestamp).toLocaleString()} 异常退出的考试。\n\n考生：${session.student.name || '未知'}\n剩余时间：${Math.floor(session.timeLeft / 60)}分${session.timeLeft % 60}秒\n\n是否继续考试？`)) {
            // 恢复数据
            currentStudent = session.student;
            currentPaper = [];
            session.paperIds.forEach(id => {
                if (QUESTION_MAP[id]) currentPaper.push(QUESTION_MAP[id]);
            });
            userAnswers = session.answers;
            timeLeft = session.timeLeft;
            switchScreenCount = session.switchCount || 0;

            // 恢复界面
            const singles = currentPaper.filter(q => q.type === 'single');
            const multis = currentPaper.filter(q => q.type === 'multi');
            const tfs = currentPaper.filter(q => q.type === 'tf');

            renderPaper(singles, multis, tfs);
            initAnswerCard(singles, multis, tfs);

            // 恢复选项勾选状态
            currentPaper.forEach(q => {
                const uAns = userAnswers[q.id];
                if (uAns) {
                    const inputs = document.getElementsByName(q.id);
                    for (let inp of inputs) {
                        if (uAns.includes(inp.value)) {
                            inp.checked = true;
                            const lbl = document.getElementById(`lbl-${q.id}-${inp.value}`);
                            if (lbl) lbl.classList.add('selected');
                        }
                    }
                    updateCardStatus(q.id, 'answered');
                }
            });

            updateFabProgress();

            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('main-header').style.display = 'none';
            document.getElementById('exam-screen').style.display = 'block';

            // 重启计时器 (假设外部有 timerId 变量)
            if (window.timerId) clearInterval(window.timerId);
            window.timerId = setInterval(updateTimer, 1000);
        } else {
            localStorage.removeItem('kk_exam_session_v2');
        }
    } catch (e) {
        console.error("恢复会话失败", e);
        localStorage.removeItem('kk_exam_session_v2');
    }
}

// 3. 检查是否有未上传的战报
function checkUnsentSubmission() {
    const failedJson = localStorage.getItem('kk_failed_submission');
    if (failedJson) {
        // 避免重复添加
        if (document.getElementById('retry-banner')) return;

        const div = document.createElement('div');
        div.id = 'retry-banner';
        div.style.cssText = "position:fixed; top:0; left:0; width:100%; background:#dc3545; color:white; text-align:center; padding:10px; z-index:9999; cursor:pointer;";
        div.innerHTML = "⚠️ 检测到有未上传的成绩记录 [点击立即重试上传]";
        div.onclick = retryUpload;
        document.body.prepend(div);
    }
}

// 4. 重试上传
async function retryUpload() {
    const failedJson = localStorage.getItem('kk_failed_submission');
    if (!failedJson) { alert("无本地记录"); return; }

    try {
        const data = JSON.parse(failedJson);
        const statusEl = document.getElementById('upload-status');
        if (statusEl) statusEl.innerHTML = "⏳ 正在重试上传...";

        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: failedJson
        });

        const result = await response.json();
        if (result.success) {
            alert("上传成功！");
            localStorage.removeItem('kk_failed_submission');
            const banner = document.getElementById('retry-banner');
            if (banner) banner.remove();

            if (statusEl) {
                statusEl.innerHTML = "✅ 成绩上传成功！";
                statusEl.style.color = "green";
            }
        } else {
            alert("上传失败：" + result.error);
        }
    } catch (e) {
        alert("重试失败，请检查网络：" + e.message);
    }
}

// 核心提交逻辑 (Cloudflare D1) - 供外部 submitExam 调用
async function uploadScoreToCloud(score, duration, correctCount, typeStats, uAnswers, paper, switchCount, examVersion) {
    const statusEl = document.getElementById('upload-status');

    // 算出错题ID列表
    const wrongIds = paper.filter(q => {
        const correctKey = getStandardAnswer(q);
        const userAns = uAnswers[q.id] || "";
        return userAns !== correctKey;
    }).map(q => q.id);

    const detailedStats = {
        breakdown: {
            single: { c: typeStats.single.correct, a: typeStats.single.answered, t: typeStats.single.total },
            multi: { c: typeStats.multi.correct, a: typeStats.multi.answered, t: typeStats.multi.total },
            tf: { c: typeStats.tf.correct, a: typeStats.tf.answered, t: typeStats.tf.total }
        },
        wrongIds: wrongIds,
        paperIds: paper.map(q => q.id)
    };

    const examData = {
        studentName: currentStudent.name || "无名氏",
        studentId: currentStudent.id || "无学号",
        score: parseFloat(score),
        duration: formatDuration(duration),
        correctCount: correctCount,
        submitTime: new Date().toLocaleString(),
        examVersion: examVersion || "未知版本",
        switchCount: switchCount || 0,
        stats: detailedStats
    };

    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(examData)
        });

        const result = await response.json();

        if (result.success) {
            if (statusEl) {
                statusEl.innerHTML = "✅ <strong>成绩上传成功！</strong>";
                statusEl.style.color = "green";
            }
            localStorage.removeItem('kk_failed_submission');
        } else {
            throw new Error(result.error || "未知错误");
        }
    } catch (err) {
        console.error(err);
        localStorage.setItem('kk_failed_submission', JSON.stringify(examData));
        if (statusEl) {
            statusEl.innerHTML = `
                <div style="color:red; margin-bottom:5px;">❌ 上传失败，已暂存本地</div>
                <button class="btn" style="padding:5px 10px; font-size:12px; width:auto;" onclick="retryUpload()">🔄 点击重试</button>
            `;
        }
    }
}
