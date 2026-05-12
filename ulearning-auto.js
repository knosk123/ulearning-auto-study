#!/usr/bin/env node
/**
 * 优学院全自动浏览器 v2.1
 *
 * 一体化启动器：自动安装依赖 → 自动下载Chromium → 自动登录 → 自动播放/答题/翻页
 *
 * 用法:
 *   node ulearning-auto.js                   # 有头模式
 *   node ulearning-auto.js --headless        # 无头模式
 *   node ulearning-auto.js --rate 2.0        # 设置倍速
 *   node ulearning-auto.js --no-answer       # 禁用自动答题
 *   node ulearning-auto.js --no-next         # 禁用自动翻页
 *   node ulearning-auto.js --course <url>    # 指定课程URL
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ═══════════════════════════════════════════
//  参数解析
// ═══════════════════════════════════════════

function parseArgs() {
    const a = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        switch (argv[i]) {
            case '--headless':  a.headless = true; break;
            case '--no-answer': a.noAnswer = true; break;
            case '--no-next':   a.noNext = true; break;
            case '--rate':      a.rate = parseFloat(argv[++i]) || 1.5; break;
            case '--course':    a.course = argv[++i]; break;
            case '--help': case '-h':
                console.log(`
优学院全自动浏览器 v2.1

用法:
  node ulearning-auto.js [选项]

选项:
  --headless       无头模式（不显示浏览器窗口）
  --rate <数值>    播放速率（默认 1.5，最大 16）
  --no-answer      禁用自动答题
  --no-next        禁用自动翻页
  --course <url>   直接打开指定课程URL
  --help           显示帮助

环境变量:
  ULEARNING_USER   账号（手机号）
  ULEARNING_PASS   密码

示例:
  node ulearning-auto.js
  node ulearning-auto.js --rate 2.0 --headless
  ULEARNING_USER=13800000000 ULEARNING_PASS=123456 node ulearning-auto.js
`);
                process.exit(0);
        }
    }
    return a;
}

const ARGS = parseArgs();

// ═══════════════════════════════════════════
//  配置
// ═══════════════════════════════════════════

const HOME_DIR = path.join(os.homedir(), '.ulearning-auto');
const BROWSER_DATA = path.join(HOME_DIR, 'browser-data');
const DEPS_DIR = HOME_DIR;

const CONFIG = {
    headless: ARGS.headless || false,
    playbackRate: Math.min(Math.max(ARGS.rate || 1.5, 0.5), 16),
    enableAutoPlay: true,
    enableAutoMute: true,
    enableAutoRate: true,
    enableAutoAnswer: !ARGS.noAnswer,
    enableAutoNextPage: !ARGS.noNext,
    enableAutoSubmit: true,
    courseUrl: ARGS.course || 'https://www.ulearning.cn/ulearning/index.html#/course',
};

// ═══════════════════════════════════════════
//  日志
// ═══════════════════════════════════════════

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
    const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    console.log(`${COLORS.dim}[${t}]${COLORS.reset} ${COLORS[color]}${msg}${COLORS.reset}`);
}

function banner() {
    console.log(`
${COLORS.cyan}  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║    🎓  优学院全自动浏览器 v2.1            ║
  ║    SPA路由感知 · 自动答题 · 倍速播放      ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝${COLORS.reset}
`);
}

// ═══════════════════════════════════════════
//  依赖管理
// ═══════════════════════════════════════════

function ensureDir(d) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function cmdExists(cmd) {
    try { execSync(`${cmd} --version`, { stdio: 'pipe' }); return true; }
    catch { return false; }
}

function run(cmd, opts = {}) {
    try {
        return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', timeout: 120000, ...opts });
    } catch { return null; }
}

function findExistingBrowser() {
    const candidates = [
        process.env.CHROME_FOR_TESTING,
        process.env.CHROME_PATH,
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        'C:\\chrome-win64\\chrome.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    ].filter(Boolean);

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }

    return null;
}

async function setupDependencies() {
    ensureDir(DEPS_DIR);

    const nmDir = path.join(DEPS_DIR, 'node_modules');
    const pwDir = path.join(nmDir, 'playwright');
    const needInstall = !fs.existsSync(pwDir);

    if (needInstall) {
        log('📦 首次运行，安装 playwright ...', 'yellow');
        const pkg = { name: 'ulearning-deps', version: '1.0.0', private: true, dependencies: { playwright: '^1.45.0' } };
        fs.writeFileSync(path.join(DEPS_DIR, 'package.json'), JSON.stringify(pkg, null, 2));
        execSync('npm install --production --no-audit --no-fund', { cwd: DEPS_DIR, stdio: 'pipe', timeout: 180000 });
        log('✓ playwright 已安装', 'green');
    }

    const existingBrowser = findExistingBrowser();
    if (existingBrowser) {
        log('✓ 找到已安装浏览器: ' + existingBrowser, 'green');
        log('   跳过 Playwright Chromium 下载', 'dim');
        return { pwDir, executablePath: existingBrowser };
    }

    // 检查 Chromium
    let chromiumReady = false;
    let executablePath = null;
    try {
        const pw = require(pwDir);
        const execPath = pw.chromium.executablePath();
        chromiumReady = fs.existsSync(execPath);
        if (chromiumReady) executablePath = execPath;
    } catch { /* not found */ }

    if (!chromiumReady) {
        log('📥 下载 Chromium 浏览器（约100MB，仅首次）...', 'yellow');
        log('   请耐心等待，取决于网络速度', 'dim');
        try {
            execSync('npx playwright install chromium', {
                cwd: DEPS_DIR,
                stdio: 'inherit',
                timeout: 600000,
                env: { ...process.env, PLAYWRIGHT_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/playwright' },
            });
            log('✓ Chromium 下载完成', 'green');
        } catch (e) {
            log('❌ Chromium 下载失败', 'red');
            log('   请手动执行: set PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright && cd ' + DEPS_DIR + ' && npx playwright install chromium', 'dim');
            process.exit(1);
        }
    }

    return { pwDir, executablePath };
}

// ═══════════════════════════════════════════
//  注入到页面的自动化脚本
// ═══════════════════════════════════════════

function buildAutomationScript() {
    return `
(function() {
    'use strict';
    if (window.__ulAuto) return;
    window.__ulAuto = true;

    /* ---------- 配置 ---------- */
    const CFG = {
        rate:       ${CONFIG.playbackRate},
        autoPlay:   ${CONFIG.enableAutoPlay},
        autoMute:   ${CONFIG.enableAutoMute},
        autoRate:   ${CONFIG.enableAutoRate},
        autoAnswer: ${CONFIG.enableAutoAnswer},
        autoNext:   ${CONFIG.enableAutoNextPage},
        autoSubmit: ${CONFIG.enableAutoSubmit},
    };

    /* ---------- 状态 ---------- */
    const S = { answering: false, done: new Set(), path: '' };

    /* ---------- 工具 ---------- */
    const log = (...a) => console.log('%c[UL]', 'color:#667eea;font-weight:bold', ...a);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    function click(el) {
        if (!el) return;
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t =>
            el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    }

    function stripHtml(s) {
        const m = {'&lt;':'<','&gt;':'>','&nbsp;':' ','&amp;':'&','&quot;':'"'};
        return s.replace(/&(lt|gt|nbsp|amp|quot);/gi, (_, t) => m[t] || t)
                .replace(/<[^>]+>/g, '').trim();
    }

    function isCourse() {
        return /\\/learnCourse\\//.test(location.pathname)
            || /\\/course\\/\\d+\\/play/.test(location.pathname)
            || /\\/courseStudy\\//.test(location.pathname)
            || /\\/study\\//.test(location.pathname)
            || !!$('video[src]')
            || !!$('.question-wrapper')
            || !!$('.course-ware-content')
            || !!$('[class*="courseware"]');
    }

    /* ---------- SPA 路由拦截 ---------- */
    const _push = history.pushState, _replace = history.replaceState;
    history.pushState    = function(...a) { _push.apply(this, a);    onNav('pushState'); };
    history.replaceState = function(...a) { _replace.apply(this, a); onNav('replaceState'); };
    window.addEventListener('popstate',  () => onNav('popstate'));
    window.addEventListener('hashchange', () => onNav('hashchange'));

    function onNav(src) {
        const p = location.pathname + location.search + location.hash;
        if (p !== S.path) {
            log('路由 [' + src + ']', p);
            S.path = p;
            S.done.clear();
        }
    }

    /* ---------- 获取答案 ---------- */
    function fetchAnswer(qid) {
        return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://api.ulearning.cn/questionAnswer/' + qid, true);
            xhr.timeout = 10000;
            xhr.onload = () => {
                try {
                    const d = JSON.parse(xhr.responseText);
                    resolve(d.correctAnswerList || []);
                } catch { resolve([]); }
            };
            xhr.onerror = () => resolve([]);
            xhr.ontimeout = () => resolve([]);
            xhr.send();
        });
    }

    /* ---------- 答题 ---------- */
    async function doAnswer(wrapper, answers) {
        if (!answers.length) return;
        const first = answers[0];

        if (/^[A-Z]$/.test(first) && first.length === 1) {
            /* 选择题 */
            const opts = $$('.check-box, .option-item, .choice-item, label', wrapper);
            if (!opts.length) {
                /* fallback: 找所有可点击的选项 */
                const all = wrapper.querySelectorAll('[class*="opt"], [class*="cho"], li');
                for (const a of answers) {
                    const idx = a.charCodeAt(0) - 65;
                    if (all[idx]) { click(all[idx]); await sleep(200); }
                }
                return;
            }
            for (const a of answers) {
                const idx = a.charCodeAt(0) - 65;
                if (opts[idx]) { click(opts[idx]); await sleep(200); }
            }
        } else if (/^(true|false|TRUE|FALSE|正确|错误)$/.test(first)) {
            /* 判断题 */
            const opts = wrapper.querySelectorAll('.choice-item, .option-item, label, [class*="judge"] li');
            if (opts.length >= 2) {
                click(opts[/^(true|TRUE|正确)$/.test(first) ? 0 : 1]);
            }
        } else {
            /* 填空 / 简答 */
            const inputs = $$('textarea, .blank-input, input[type="text"]', wrapper);
            for (let i = 0; i < inputs.length && i < answers.length; i++) {
                const val = stripHtml(answers[i]);
                const el = inputs[i];
                el.focus();
                /* 兼容 React/Vue 框架 */
                const nativeSet = Object.getOwnPropertyDescriptor(
                    HTMLTextAreaElement.prototype, 'value'
                )?.set || Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype, 'value'
                )?.set;
                if (nativeSet) { nativeSet.call(el, val); }
                else { el.value = val; }
                ['input', 'change', 'blur'].forEach(t =>
                    el.dispatchEvent(new Event(t, { bubbles: true })));
                await sleep(200);
            }
        }
    }

    /* ---------- 弹窗处理 ---------- */
    async function handleModals() {
        if (S.answering) return;

        /* alertModal */
        const alert = $('#alertModal');
        if (alert && (alert.classList.contains('in') || alert.classList.contains('show'))) {
            const btns = alert.querySelectorAll('.modal-operation .btn, .modal-footer .btn, button');
            if (btns.length >= 2) click(btns[CFG.autoAnswer ? 0 : 1]);
            else if (btns.length) click(btns[0]);
            await sleep(800);
        }

        /* statModal */
        const stat = $('#statModal');
        if (stat) {
            const btns = stat.querySelectorAll('button');
            if (btns.length >= 2) click(btns[1]);
            await sleep(500);
        }

        /* 通用模态框 */
        $$('.modal.in, .modal.show').forEach(async m => {
            const btn = m.querySelector('.btn-primary, .btn-confirm, [class*="confirm"]');
            if (btn) { click(btn); await sleep(400); }
        });

        /* 视频错误重试 */
        const err = $('.mobile-video-error, [class*="video-error"]');
        if (err && getComputedStyle(err).display !== 'none') {
            const retry = $('.try-again, [class*="retry"]');
            if (retry) click(retry);
        }
    }

    /* ---------- 自动答题 ---------- */
    async function handleQuestions() {
        if (!CFG.autoAnswer || S.answering) return;

        const wrappers = $$('.question-wrapper, [id^="question"]');
        if (!wrappers.length) return;

        S.answering = true;
        log('📝 检测到 ' + wrappers.length + ' 道题');

        for (const w of wrappers) {
            const qid = w.id?.replace('question', '');
            if (!qid || S.done.has(qid)) continue;

            const answers = await fetchAnswer(qid);
            if (!answers.length) { log('  题目' + qid + ': 无答案'); continue; }

            await doAnswer(w, answers);
            S.done.add(qid);
            log('  ✓ 题目' + qid);
            await sleep(500);
        }

        /* 提交 */
        if (CFG.autoSubmit) {
            await sleep(1000);
            const btn = $('.btn-submit:not([disabled])');
            if (btn && /提交|submit/i.test(btn.textContent)) {
                click(btn);
                log('📤 已提交');
                await sleep(2000);
            }
        }

        S.answering = false;
    }

    /* ---------- 视频处理 ---------- */
    async function handleVideos() {
        if (!CFG.autoPlay) return false;

        const videos = $$('video').filter(v => v.src || v.querySelector('source'));
        if (!videos.length) return false;

        let hasUnfinished = false;

        for (const v of videos) {
            if (CFG.autoMute) { v.muted = true; v.volume = 0; }
            if (CFG.autoRate) { v.playbackRate = CFG.rate; }

            /* 跳过已看完的 — 全页面检测 */
            let finished = false;

            // 方式1: 在视频播放器附近找"已看完"（取视频的位置，在附近区域搜索）
            const vRect = v.getBoundingClientRect();
            const nearbyEls = document.elementsFromPoint(vRect.left + vRect.width / 2, vRect.bottom + 30);
            for (const el of nearbyEls) {
                if (/已看完|已完成/.test(el.textContent)) {
                    finished = true; break;
                }
            }
            // 方式2: 搜索整个 body 中紧挨视频下方的"已看完"
            if (!finished) {
                const allEls = document.querySelectorAll('*');
                for (const el of allEls) {
                    if (el.children.length > 0) continue; // 只检查叶子节点
                    if (!/已看完|已完成/.test(el.textContent)) continue;
                    const r = el.getBoundingClientRect();
                    // "已看完"应该在视频下方附近（y方向差距100px内，x方向重叠）
                    if (Math.abs(r.top - vRect.bottom) < 100 &&
                        r.left >= vRect.left - 50 && r.left <= vRect.right + 50) {
                        finished = true; break;
                    }
                }
            }
            // 方式3: 视频已结束
            if (!finished && v.ended) finished = true;
            // 方式4: currentTime 接近 duration（视频快播完了）
            if (!finished && v.duration > 0 && v.currentTime > 0 && (v.duration - v.currentTime < 2)) {
                finished = true;
            }
            // 方式5: 视频暂停且 currentTime > 0 且接近 duration（播完自动暂停）
            if (!finished && v.paused && v.currentTime > 0 && v.duration > 0 && (v.currentTime / v.duration > 0.95)) {
                finished = true;
            }

            if (finished) {
                log('✓ 视频已看完，跳过', 'dim');
                continue;
            }

            if (!v.ended && v.paused) {
                try { await v.play(); log('▶ 播放'); } catch (e) { log('▶ 播放失败: ' + e.message); }
                hasUnfinished = true;
            } else if (!v.ended) {
                hasUnfinished = true;
            }
        }

        return hasUnfinished;
    }

    /* ---------- 自动翻页 ---------- */
    async function goNext() {
        if (!CFG.autoNext) return;

        // 方式1: 通过 class 选择器
        const selectors = [
            '.mobile-next-page-btn',
            '.next-page-btn',
            '[class*="next-page"]',
            '[class*="nextPage"]',
            '[class*="next_btn"]',
            '[class*="nextBtn"]',
        ];
        for (const s of selectors) {
            const btn = $(s);
            if (btn && btn.offsetParent !== null) {
                click(btn);
                log('➡ 翻页 (class: ' + s + ')');
                await sleep(2000);
                return;
            }
        }

        // 方式2: 通过文字内容查找（更宽泛匹配）
        const allEls = document.querySelectorAll('button, a, div, span, [role="button"]');
        for (const el of allEls) {
            const text = el.textContent.trim();
            // 匹配各种"下一页"表达
            if (/下一页|下一节|下一个|next\s*page|>>|››|→/i.test(text) && el.offsetParent !== null) {
                const rect = el.getBoundingClientRect();
                // 只点击可见且有合理大小的元素
                if (rect.width > 10 && rect.height > 10 && rect.top > 0) {
                    click(el);
                    log('➡ 翻页 (文字: ' + text.substring(0, 20) + ')');
                    await sleep(2000);
                    return;
                }
            }
        }

        // 方式3: 查找 > 箭头符号按钮
        const arrowBtns = document.querySelectorAll('[class*="arrow"], [class*="next"], [class*="right"]');
        for (const el of arrowBtns) {
            if (el.offsetParent !== null) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 10 && rect.height > 10 && rect.top > 0) {
                    click(el);
                    log('➡ 翻页 (箭头)');
                    await sleep(2000);
                    return;
                }
            }
        }

        // 方式4: 键盘翻页 fallback
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true
        }));
        log('➡ 翻页 (键盘ArrowRight)');
    }

    /* ---------- 主循环 ---------- */
    async function tick() {
        if (!isCourse()) return;
        try {
            await handleModals();
            await sleep(300);
            await handleQuestions();
            await sleep(300);
            const hasUnfinishedVideo = await handleVideos();
            if (!hasUnfinishedVideo && CFG.autoNext) {
                await sleep(1000);
                await goNext();
            }
        } catch (e) {
            log('⚠ 出错:', e.message);
        }
    }

    /* 启动 */
    setInterval(tick, 5000);
    setTimeout(tick, 2000);
    S.path = location.pathname + location.search + location.hash;
    log('✅ 自动化已启动 — 倍速' + CFG.rate + 'x · 答题' + (CFG.autoAnswer ? '开' : '关') + ' · 翻页' + (CFG.autoNext ? '开' : '关'));
})();
`;
}

// ═══════════════════════════════════════════
//  主程序
// ═══════════════════════════════════════════

async function main() {
    banner();

    // 1. 环境检查
    if (!cmdExists('node')) {
        log('❌ Node.js 未安装', 'red');
        process.exit(1);
    }
    log('Node ' + process.version + ' · ' + process.platform + '-' + process.arch, 'dim');

    // 2. 安装依赖
    const { pwDir, executablePath } = await setupDependencies();

    // 3. 加载 Playwright
    let chromium;
    try {
        chromium = require(pwDir).chromium;
    } catch (e) {
        log('❌ 加载 Playwright 失败: ' + e.message, 'red');
        process.exit(1);
    }

    // 4. 启动浏览器
    log('🚀 启动浏览器 ...', 'cyan');

    const context = await chromium.launchPersistentContext(BROWSER_DATA, {
        executablePath: executablePath || undefined,
        headless: CONFIG.headless,
        viewport: { width: 1366, height: 768 },
        locale: 'zh-CN',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--no-first-run',
            '--no-default-browser-check',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = context.pages()[0] || await context.newPage();

    // 反检测
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        delete navigator.__proto__.webdriver;
    });

    // 5. 导航到课程页
    log('📍 打开优学院 ...', 'cyan');
    await page.goto(CONFIG.courseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 6. 处理登录
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('passport')) {
        const user = process.env.ULEARNING_USER;
        const pass = process.env.ULEARNING_PASS;

        if (user && pass) {
            log('🔑 自动登录中 ...', 'yellow');
            try {
                await page.fill(
                    'input[type="text"], input[name="username"], input[name="account"], input[placeholder*="手机"], input[placeholder*="邮箱"]',
                    user
                );
                await page.waitForTimeout(300);
                await page.fill('input[type="password"], input[name="password"]', pass);
                await page.waitForTimeout(300);
                await page.click('button[type="submit"], .login-btn, [class*="login"] button');
                await page.waitForTimeout(3000);
                log('✓ 登录成功', 'green');
            } catch (e) {
                log('⚠ 自动登录失败，请手动登录: ' + e.message, 'yellow');
                await waitForManualLogin(page);
            }
        } else {
            log('🔑 请在浏览器中手动登录 ...', 'yellow');
            log('   (设置环境变量可自动登录: ULEARNING_USER=xxx ULEARNING_PASS=yyy)', 'dim');
            await waitForManualLogin(page);
        }
    }

    // 7. 注入自动化脚本
    const script = buildAutomationScript();

    // 注册到所有后续导航（SPA 路由变化时自动执行）
    await page.addInitScript(script);

    // 等页面稳定后立即执行一次
    await page.waitForTimeout(2000);
    try {
        await page.evaluate(script);
        log('🤖 自动化脚本已注入', 'green');
    } catch (e) {
        log('⚠ 注入失败，尝试刷新页面: ' + e.message, 'yellow');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        try {
            await page.evaluate(script);
            log('🤖 自动化脚本已注入（刷新后）', 'green');
        } catch (e2) {
            log('❌ 注入失败: ' + e2.message, 'red');
        }
    }

    // SPA 路由变化时重新执行
    page.on('framenavigated', async (frame) => {
        if (frame === page.mainFrame()) {
            try {
                await page.waitForTimeout(1000);
                await page.evaluate(script);
            } catch {}
        }
    });

    // 监听新打开的页面/标签页（跨域跳转时会打开新页面）
    let activePage = page;
    context.on('page', async (newPage) => {
        log('🆕 检测到新页面: ' + newPage.url(), 'cyan');
        try {
            await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
        } catch {}
        const newUrl = newPage.url();
        if (newUrl.includes('learnCourse') || newUrl.includes('courseStudy') || newUrl.includes('/study/')) {
            log('📍 切换到课程页: ' + newUrl.substring(0, 80), 'green');
            activePage = newPage;
            // 注入反检测
            await newPage.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                delete navigator.__proto__.webdriver;
            }).catch(() => {});
            // 注入自动化脚本
            await newPage.waitForTimeout(2000);
            try {
                await newPage.evaluate(script);
                log('🤖 自动化脚本已注入（新页面）', 'green');
            } catch (e) {
                log('⚠ 新页面注入失败: ' + e.message, 'yellow');
            }
            // 新页面的路由变化也监听
            newPage.on('framenavigated', async (frame) => {
                if (frame === newPage.mainFrame()) {
                    try {
                        await newPage.waitForTimeout(1000);
                        await newPage.evaluate(script);
                    } catch {}
                }
            });
        }
    });

    // 8. 状态面板
    // 确认脚本已生效
    const injected = await page.evaluate(() => !!window.__ulAuto).catch(() => false);
    if (injected) {
        log('✅ 脚本已生效，自动化运行中', 'green');
    } else {
        log('⚠ 脚本可能未生效，请检查页面', 'yellow');
    }

    log('', 'reset');
    log('═══════════════════════════════════════', 'cyan');
    log('  ✅ 运行中', 'green');
    log('  倍速: ' + CONFIG.playbackRate + 'x', 'dim');
    log('  自动答题: ' + (CONFIG.enableAutoAnswer ? '开' : '关'), 'dim');
    log('  自动翻页: ' + (CONFIG.enableAutoNextPage ? '开' : '关'), 'dim');
    log('  按 Ctrl+C 退出', 'dim');
    log('═══════════════════════════════════════', 'cyan');

    // 定期心跳 + 脚本存活检查
    setInterval(async () => {
        try {
            const u = activePage.url();
            const alive = await activePage.evaluate(() => !!window.__ulAuto).catch(() => false);
            if (!alive) {
                log('⚠ 脚本丢失，重新注入 ...', 'yellow');
                await activePage.evaluate(script).catch(() => {});
            }
            log('📍 ' + u.substring(0, 80), 'dim');
        } catch {}
    }, 60000);

    // 9. 优雅退出
    const shutdown = async () => {
        log('🛑 正在关闭浏览器 ...', 'yellow');
        try { await context.close(); } catch {}
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGHUP', shutdown);

    // 阻塞
    await new Promise(() => {});
}

async function waitForManualLogin(page) {
    try {
        await page.waitForURL(/learnCourse|index|course(?!.*login)/, { timeout: 600000 });
        log('✓ 登录完成', 'green');
    } catch {
        log('❌ 等待登录超时（10分钟）', 'red');
        process.exit(1);
    }
}

// ═══════════════════════════════════════════
//  启动
// ═══════════════════════════════════════════

main().catch(e => {
    log('❌ 致命错误: ' + e.message, 'red');
    console.error(e);
    process.exit(1);
});
