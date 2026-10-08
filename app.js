/**
 * CYBER TAC TOE - Game Engine & Interactive Controller
 * Tech Color Scheme: Red (#FF0055), Black (#0A0B0E), Yellow (#FFD600)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let boardState = ['', '', '', '', '', '', '', '', ''];
    let currentPlayer = 'X'; // 'X' always starts
    let isGameActive = true;
    let gameMode = 'ai-hard'; // 'pvp', 'ai-easy', 'ai-hard'
    let scores = { X: 0, O: 0, ties: 0 };
    let soundEnabled = true;

    // --- WINNING COMBINATIONS ---
    const WINNING_COMBOS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    // --- DOM ELEMENTS ---
    const cells = document.querySelectorAll('.cell');
    const boardElement = document.getElementById('board');
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    const gameModeSelect = document.getElementById('gameModeSelect');
    const restartGameBtn = document.getElementById('restartGameBtn');
    const resetScoresBtn = document.getElementById('resetScoresBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    
    const cardX = document.getElementById('cardX');
    const cardO = document.getElementById('cardO');
    const scoreXEl = document.getElementById('scoreX');
    const scoreOEl = document.getElementById('scoreO');
    const scoreTiesEl = document.getElementById('scoreTies');
    const labelO = document.getElementById('labelO');

    const winningLineCanvas = document.getElementById('winningLineCanvas');
    const ctxLine = winningLineCanvas.getContext('2d');
    const particlesCanvas = document.getElementById('particlesCanvas');
    const ctxParticles = particlesCanvas.getContext('2d');

    // --- SOUND SYNTHESIZER (Web Audio API) ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playSound(type) {
        if (!soundEnabled) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'x-move') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'o-move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'win') {
            // Cyber Victory chord
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, index) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + index * 0.08);
                g.gain.setValueAtTime(0.15, now + index * 0.08);
                g.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.35);
                o.connect(g);
                g.connect(audioCtx.destination);
                o.start(now + index * 0.08);
                o.stop(now + index * 0.08 + 0.35);
            });
        } else if (type === 'tie') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(120, now + 0.25);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        }
    }

    // --- CANVAS RESIZING ---
    function resizeCanvases() {
        const boardRect = boardElement.getBoundingClientRect();
        winningLineCanvas.width = boardRect.width;
        winningLineCanvas.height = boardRect.height;

        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    // --- LOAD SAVED SCORES ---
    function loadSavedScores() {
        const saved = localStorage.getItem('cyber_tictactoe_scores');
        if (saved) {
            try {
                scores = JSON.parse(saved);
                updateScoreboardUI();
            } catch (e) {
                console.error('Error loading saved scores', e);
            }
        }
    }

    function saveScores() {
        localStorage.setItem('cyber_tictactoe_scores', JSON.stringify(scores));
    }

    function updateScoreboardUI() {
        scoreXEl.textContent = scores.X;
        scoreOEl.textContent = scores.O;
        scoreTiesEl.textContent = scores.ties;
    }

    // --- GAME INITIALIZATION ---
    function initGame() {
        boardState = ['', '', '', '', '', '', '', '', ''];
        currentPlayer = 'X';
        isGameActive = true;

        // Clear line canvas
        ctxLine.clearRect(0, 0, winningLineCanvas.width, winningLineCanvas.height);

        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o', 'winning-cell');
            cell.removeAttribute('disabled');
        });

        updateTurnUI();
    }

    // --- TURN & STATUS UI UPDATE ---
    function updateTurnUI() {
        if (!isGameActive) return;

        if (currentPlayer === 'X') {
            cardX.classList.add('active');
            cardO.classList.remove('active');
            statusIndicator.style.background = 'var(--neon-red)';
            statusIndicator.style.boxShadow = '0 0 10px var(--neon-red)';
            statusText.innerHTML = `TURNO DE: <strong class="text-red">JUGADOR X</strong>`;
        } else {
            cardO.classList.add('active');
            cardX.classList.remove('active');
            statusIndicator.style.background = 'var(--neon-yellow)';
            statusIndicator.style.boxShadow = '0 0 10px var(--neon-yellow)';
            
            const playerOName = gameMode === 'pvp' ? 'JUGADOR O' : 'IA NEURAL';
            statusText.innerHTML = `TURNO DE: <strong class="text-yellow">${playerOName}</strong>`;
        }
    }

    // --- CELL CLICK HANDLER ---
    function handleCellClick(e) {
        const cell = e.target;
        const index = parseInt(cell.getAttribute('data-index'));

        if (boardState[index] !== '' || !isGameActive) return;

        // Player move
        makeMove(index, currentPlayer);

        // If AI mode and game still active, trigger AI turn
        if (isGameActive && gameMode !== 'pvp' && currentPlayer === 'O') {
            disableBoard(true);
            setTimeout(() => {
                makeAIMove();
                disableBoard(false);
            }, 450);
        }
    }

    function disableBoard(disable) {
        cells.forEach(c => {
            if (disable) c.setAttribute('disabled', 'true');
            else if (boardState[c.getAttribute('data-index')] === '') c.removeAttribute('disabled');
        });
    }

    function makeMove(index, player) {
        boardState[index] = player;
        const cell = cells[index];
        cell.textContent = player === 'X' ? '✕' : '◯';
        cell.classList.add(player.toLowerCase());

        playSound(player === 'X' ? 'x-move' : 'o-move');

        const winResult = checkWinner(boardState);

        if (winResult) {
            handleWin(winResult);
        } else if (isBoardFull(boardState)) {
            handleTie();
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateTurnUI();
        }
    }

    // --- WIN CHECKER ---
    function checkWinner(board) {
        for (let combo of WINNING_COMBOS) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], combo: combo };
            }
        }
        return null;
    }

    function isBoardFull(board) {
        return board.every(cell => cell !== '');
    }

    // --- HANDLE WIN & TIE ---
    function handleWin(winResult) {
        isGameActive = false;
        const { winner, combo } = winResult;

        scores[winner]++;
        saveScores();
        updateScoreboardUI();

        // Highlight winning cells
        combo.forEach(idx => {
            cells[idx].classList.add('winning-cell');
        });

        // Draw animated laser line
        drawWinningLine(combo, winner);

        // Trigger victory sound & particles
        playSound('win');
        triggerCyberParticles(winner === 'X' ? '#ff0055' : '#ffd600');

        // Status update
        const winnerName = winner === 'X' ? 'JUGADOR X' : (gameMode === 'pvp' ? 'JUGADOR O' : 'IA NEURAL');
        const colorClass = winner === 'X' ? 'text-red' : 'text-yellow';
        statusText.innerHTML = `🏆 <strong class="${colorClass}">${winnerName} HA GANADO!</strong>`;
    }

    function handleTie() {
        isGameActive = false;
        scores.ties++;
        saveScores();
        updateScoreboardUI();

        playSound('tie');
        statusText.innerHTML = `<strong class="text-yellow">¡EMPATE TÁCTICO!</strong>`;
    }

    // --- DRAW WINNING LINE ON CANVAS ---
    function drawWinningLine(combo, winner) {
        resizeCanvases();
        const firstCellRect = cells[combo[0]].getBoundingClientRect();
        const lastCellRect = cells[combo[2]].getBoundingClientRect();
        const boardRect = boardElement.getBoundingClientRect();

        const x1 = (firstCellRect.left + firstCellRect.width / 2) - boardRect.left;
        const y1 = (firstCellRect.top + firstCellRect.height / 2) - boardRect.top;
        const x2 = (lastCellRect.left + lastCellRect.width / 2) - boardRect.left;
        const y2 = (lastCellRect.top + lastCellRect.height / 2) - boardRect.top;

        const lineColor = winner === 'X' ? '#ff0055' : '#ffd600';
        let progress = 0;

        function animateLine() {
            if (progress > 1) return;
            progress += 0.08;

            ctxLine.clearRect(0, 0, winningLineCanvas.width, winningLineCanvas.height);

            const currentX = x1 + (x2 - x1) * Math.min(progress, 1);
            const currentY = y1 + (y2 - y1) * Math.min(progress, 1);

            ctxLine.beginPath();
            ctxLine.moveTo(x1, y1);
            ctxLine.lineTo(currentX, currentY);
            ctxLine.strokeStyle = lineColor;
            ctxLine.lineWidth = 6;
            ctxLine.lineCap = 'round';
            ctxLine.shadowColor = lineColor;
            ctxLine.shadowBlur = 15;
            ctxLine.stroke();

            requestAnimationFrame(animateLine);
        }

        animateLine();
    }

    // --- AI LOGIC ---
    function makeAIMove() {
        if (!isGameActive) return;

        let targetIndex;
        if (gameMode === 'ai-easy') {
            targetIndex = getEasyAIMove();
        } else {
            // Unbeatable Minimax
            targetIndex = getBestMinimaxMove();
        }

        if (targetIndex !== undefined && targetIndex !== null && targetIndex !== -1) {
            makeMove(targetIndex, 'O');
        }
    }

    function getEasyAIMove() {
        const emptyIndices = boardState
            .map((val, idx) => val === '' ? idx : null)
            .filter(val => val !== null);
        
        if (emptyIndices.length === 0) return null;
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    // MINIMAX ALGORITHM (Imbatible)
    function getBestMinimaxMove() {
        let bestScore = -Infinity;
        let move = null;

        for (let i = 0; i < 9; i++) {
            if (boardState[i] === '') {
                boardState[i] = 'O';
                let score = minimax(boardState, 0, false);
                boardState[i] = '';
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    const scoresMap = {
        'O': 10,  // AI wins
        'X': -10, // Player X wins
        'tie': 0
    };

    function minimax(board, depth, isMaximizing) {
        const winResult = checkWinner(board);
        if (winResult) {
            return scoresMap[winResult.winner] - (isMaximizing ? depth : -depth);
        }
        if (isBoardFull(board)) {
            return scoresMap['tie'];
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = 'O';
                    let evaluation = minimax(board, depth + 1, false);
                    board[i] = '';
                    maxEval = Math.max(maxEval, evaluation);
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = 'X';
                    let evaluation = minimax(board, depth + 1, true);
                    board[i] = '';
                    minEval = Math.min(minEval, evaluation);
                }
            }
            return minEval;
        }
    }

    // --- CYBER PARTICLES EMITTER ---
    let particles = [];

    function triggerCyberParticles(color) {
        particles = [];
        const count = 75;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 2,
                color: color,
                alpha: 1,
                decay: Math.random() * 0.02 + 0.015,
                shape: Math.random() > 0.5 ? 'square' : 'circle'
            });
        }

        animateParticles();
    }

    function animateParticles() {
        if (particles.length === 0) return;

        ctxParticles.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctxParticles.save();
            ctxParticles.globalAlpha = p.alpha;
            ctxParticles.fillStyle = p.color;
            ctxParticles.shadowColor = p.color;
            ctxParticles.shadowBlur = 10;

            ctxParticles.beginPath();
            if (p.shape === 'circle') {
                ctxParticles.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            } else {
                ctxParticles.rect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            }
            ctxParticles.fill();
            ctxParticles.restore();
        }

        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }

    // --- EVENT LISTENERS ---
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));

    restartGameBtn.addEventListener('click', () => {
        playSound('click');
        initGame();
    });

    gameModeSelect.addEventListener('change', (e) => {
        playSound('click');
        gameMode = e.target.value;
        labelO.textContent = gameMode === 'pvp' ? 'JUGADOR O' : 'IA NEURAL';
        initGame();
    });

    resetScoresBtn.addEventListener('click', () => {
        playSound('click');
        scores = { X: 0, O: 0, ties: 0 };
        saveScores();
        updateScoreboardUI();
    });

    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        soundToggleBtn.style.opacity = soundEnabled ? '1' : '0.6';
        if (soundEnabled) playSound('click');
    });

    // --- INIT APP ---
    loadSavedScores();
    initGame();
});
