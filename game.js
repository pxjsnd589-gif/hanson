// 游戏状态管理
const GameState = {
    currentScreen: 'main-menu',
    player: {
        name: '福尔摩斯',
        chapter: 1,
        inventory: []
    },
    saveData: null
};

// API 配置
const API_BASE_URL = 'http://localhost:3000/api';

// 屏幕切换
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        GameState.currentScreen = screenId;
    }
}

// 显示加载界面
function showLoading() {
    switchScreen('loading-screen');
}

// 隐藏加载界面
function hideLoading() {
    switchScreen(GameState.currentScreen === 'loading-screen' ? 'main-menu' : GameState.currentScreen);
}

// 开始新游戏
async function startNewGame() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/game/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerName: GameState.player.name
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            GameState.saveData = data.saveData;
            GameState.player.chapter = 1;
            initGameScreen();
            switchScreen('game-screen');
        } else {
            alert('创建游戏失败，请重试');
            switchScreen('main-menu');
        }
    } catch (error) {
        console.error('开始游戏错误:', error);
        alert('连接服务器失败，请检查服务器是否运行');
        switchScreen('main-menu');
    }
}

// 继续游戏
async function continueGame() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/game/load`);
        const data = await response.json();
        
        if (data.success && data.saveData) {
            GameState.saveData = data.saveData;
            GameState.player.chapter = data.saveData.chapter || 1;
            GameState.player.inventory = data.saveData.inventory || [];
            initGameScreen();
            switchScreen('game-screen');
        } else {
            alert('没有找到存档，请开始新游戏');
            switchScreen('main-menu');
        }
    } catch (error) {
        console.error('加载游戏错误:', error);
        alert('连接服务器失败，请检查服务器是否运行');
        switchScreen('main-menu');
    }
}

// 保存游戏
async function saveGame() {
    try {
        const response = await fetch(`${API_BASE_URL}/game/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                saveId: GameState.saveData?.id,
                chapter: GameState.player.chapter,
                inventory: GameState.player.inventory,
                progress: GameState.saveData?.progress || {}
            })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('保存游戏错误:', error);
        return false;
    }
}

// 初始化游戏界面
function initGameScreen() {
    document.getElementById('player-name').textContent = GameState.player.name;
    document.getElementById('chapter').textContent = GameState.player.chapter;
    
    // 初始化画布
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // 绘制初始场景
    drawScene(ctx, canvas.width, canvas.height);
    
    // 加载第一个场景
    loadScene(GameState.player.chapter);
}

// 绘制场景（像素风格）
function drawScene(ctx, width, height) {
    // 背景 - 维多利亚时代的街道
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // 地面
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
    
    // 建筑轮廓（像素风格）
    ctx.fillStyle = '#2a2a3a';
    for (let i = 0; i < 5; i++) {
        const x = i * (width / 5);
        const buildingHeight = 150 + Math.random() * 100;
        ctx.fillRect(x, height * 0.7 - buildingHeight, width / 5 - 10, buildingHeight);
    }
    
    // 路灯
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(width * 0.3, height * 0.5, 8, height * 0.2);
    ctx.fillRect(width * 0.3 - 10, height * 0.5, 28, 12);
    
    // 雾气效果
    ctx.fillStyle = 'rgba(200, 200, 220, 0.1)';
    ctx.fillRect(0, height * 0.6, width, height * 0.4);
}

// 加载场景内容
async function loadScene(chapter) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/${chapter}`);
        const data = await response.json();
        
        if (data.success) {
            displaySceneDescription(data.scene.description);
            displayDialogue(data.scene.dialogue);
        }
    } catch (error) {
        console.error('加载场景错误:', error);
        displaySceneDescription('你站在雾气弥漫的伦敦街头，煤气灯在夜色中闪烁...');
    }
}

// 显示场景描述
function displaySceneDescription(text) {
    const descElement = document.getElementById('scene-description');
    descElement.textContent = '';
    
    let index = 0;
    const typeWriter = setInterval(() => {
        if (index < text.length) {
            descElement.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(typeWriter);
        }
    }, 50);
}

// 显示对话
function displayDialogue(dialogue) {
    const dialogueText = document.getElementById('dialogue-text');
    const dialogueOptions = document.getElementById('dialogue-options');
    
    dialogueText.textContent = dialogue.text || '...';
    
    dialogueOptions.innerHTML = '';
    if (dialogue.options) {
        dialogue.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dialogue-option pixel-text';
            optionDiv.textContent = `${index + 1}. ${option.text}`;
            optionDiv.onclick = () => handleDialogueChoice(option);
            dialogueOptions.appendChild(optionDiv);
        });
    }
}

// 处理对话选择
async function handleDialogueChoice(option) {
    if (option.action === 'next_scene') {
        GameState.player.chapter++;
        await saveGame();
        loadScene(GameState.player.chapter);
    } else if (option.action === 'get_clue') {
        // 调用智谱API获取线索
        await getAIClue(option.context);
    }
}

// 获取AI生成的线索
async function getAIClue(context) {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/clue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context })
        });
        
        const data = await response.json();
        if (data.success) {
            displayDialogue({ text: data.clue, options: [] });
        }
    } catch (error) {
        console.error('获取AI线索错误:', error);
    }
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 新游戏按钮
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);
    
    // 继续游戏按钮
    document.getElementById('continue-game-btn').addEventListener('click', continueGame);
    
    // 设置按钮
    document.getElementById('settings-btn').addEventListener('click', () => {
        alert('设置功能开发中...');
    });
    
    // 菜单按钮
    document.getElementById('menu-btn').addEventListener('click', async () => {
        const saved = await saveGame();
        if (saved) {
            alert('游戏已保存');
        }
        switchScreen('main-menu');
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (GameState.currentScreen === 'game-screen') {
            if (e.key >= '1' && e.key <= '9') {
                const options = document.querySelectorAll('.dialogue-option');
                const index = parseInt(e.key) - 1;
                if (options[index]) {
                    options[index].click();
                }
            }
        }
    });
});
