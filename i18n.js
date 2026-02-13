const translations = {
    'zh': {
        'app_title': "3D 魔方 Pro",
        'toggle_camera': "📷 AR 同步",
        'scan_header': "色彩扫描",
        'start_scan': "开始扫描",
        'instruction_front': "请对准 F (前)",
        'scramble_btn': "🔀 随机打乱",
        'solve_btn': "🧠 还原求解",
        'loading': "正在加载 3D 引擎...",
        'sync_toggle': "🔄 视角跟随",
        'solve_error': "无法求解，请检查颜色",
        'solve_steps': "还原步骤: ",
        'scan_done': "扫描完成",
        'instruction_scan': "请对准 {face} 面",
        'face_front': "前 (Front)",
        'face_right': "右 (Right)",
        'face_back': "后 (Back)",
        'face_left': "左 (Left)",
        'face_top': "上 (Top)",
        'face_bottom': "下 (Bottom)",
        'scan_btn_prefix': "扫描 ",
        'formula_btn': "📜 公式库",
        'formula_title': "选择公式",
        'formula_apply': "演示"
    },
    'en': {
        'app_title': "Rubik's 3D Pro",
        'toggle_camera': "📷 AR Sync",
        'scan_header': "Color Scan",
        'start_scan': "Start Scan",
        'instruction_front': "Align F (Front)",
        'scramble_btn': "🔀 Scramble",
        'solve_btn': "🧠 Solve",
        'loading': "Loading 3D Engine...",
        'sync_toggle': "🔄 View Sync",
        'solve_error': "Solver Error, check colors",
        'solve_steps': "Solution: ",
        'scan_done': "Scan Done",
        'instruction_scan': "Align {face} Face",
        'face_front': "Front",
        'face_right': "Right",
        'face_back': "Back",
        'face_left': "Left",
        'face_top': "Top",
        'face_bottom': "Bottom",
        'scan_btn_prefix': "Scan ",
        'formula_btn': "📜 Algorithms",
        'formula_title': "Select Algorithm",
        'formula_apply': "Demo"
    }
};

let currentLang = 'en';

export function initI18n() {
    // Detect language
    const lang = navigator.language || navigator.userLanguage;
    currentLang = lang.startsWith('zh') ? 'zh' : 'en';
    
    console.log(`I18n initialized: ${currentLang}`);
    
    updateDOM();
}

export function updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            // Keep icon if it exists in HTML but not in translation? 
            // Our translation includes icons for now in value.
            // Or we check if node has children. Simple textContent replacement for now.
            
            // Check if element has specific structure (like icon + span)
            // For simple buttons, we just replace innerHTML or textContent
            // But wait, our toggle button has "📷 <span>Text</span>".
            
            // Special handling for mixed content if needed, 
            // but for simplicity, let's assume translation string contains everything or we target the span.
            
            // Attempt to preserve children if key maps to text only?
            // Let's just replace textContent for safety unless we need HTML.
            
            // If the element has a span inside, maybe we target that?
            // Let's rely on data-i18n being on the text node container.
            
            el.textContent = translations[currentLang][key];
        }
    });
}

export function t(key, params = {}) {
    let str = translations[currentLang][key] || key;
    
    // Simple param replacement {name}
    Object.keys(params).forEach(k => {
        str = str.replace(`{${k}}`, params[k]);
    });
    
    return str;
}

export function getLang() {
    return currentLang;
}
