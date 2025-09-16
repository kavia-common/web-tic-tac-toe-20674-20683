import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

// Types and helpers
const PLAYER_X = 'X';
const PLAYER_O = 'O';
const EMPTY_BOARD = Array(9).fill(null);
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diagonals
];

/**
 * Checks if a player has won given a board.
 * @param {Array<string|null>} board 
 * @returns {{winner: string|null, line: number[]|null}}
 */
function calculateWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  return { winner: null, line: null };
}

/**
 * Returns indices of empty cells.
 * @param {Array<string|null>} board 
 * @returns {number[]}
 */
function emptyCells(board) {
  const cells = [];
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) cells.push(i);
  }
  return cells;
}

/**
 * Very basic computer move: 
 * 1) If can win, take it
 * 2) If opponent can win next, block it
 * 3) Take center if available
 * 4) Pick a random corner
 * 5) Pick any random available
 * @param {Array<string|null>} board 
 * @param {'X'|'O'} ai 
 * @returns {number|null}
 */
function getComputerMove(board, ai) {
  const human = ai === PLAYER_X ? PLAYER_O : PLAYER_X;
  const available = emptyCells(board);
  if (available.length === 0) return null;

  // 1) Win if possible
  for (const idx of available) {
    const test = [...board];
    test[idx] = ai;
    if (calculateWinner(test).winner === ai) return idx;
  }
  // 2) Block if human can win
  for (const idx of available) {
    const test = [...board];
    test[idx] = human;
    if (calculateWinner(test).winner === human) return idx;
  }
  // 3) Center
  if (available.includes(4)) return 4;

  // 4) Random corner
  const corners = available.filter(i => [0,2,6,8].includes(i));
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)];

  // 5) Any
  return available[Math.floor(Math.random()*available.length)];
}

/**
 * Square component for a single cell.
 */
function Square({ value, onClick, highlight }) {
  return (
    <button
      className={`ttt-square ${highlight ? 'ttt-square-highlight' : ''}`}
      onClick={onClick}
      aria-label={`Square ${value ? value : 'empty'}`}
    >
      {value}
    </button>
  );
}

/**
 * Board component rendering the 3x3 grid.
 */
function Board({ board, onSquareClick, winLine }) {
  return (
    <div className="ttt-grid" role="grid" aria-label="Tic Tac Toe Board">
      {board.map((val, i) => {
        const isHighlighted = winLine ? winLine.includes(i) : false;
        return (
          <Square
            key={i}
            value={val}
            onClick={() => onSquareClick(i)}
            highlight={isHighlighted}
          />
        );
      })}
    </div>
  );
}

/**
 * Controls component for mode selection and actions.
 */
function Controls({
  mode,
  setMode,
  onRestart,
  onReset,
  xIsNext,
  scores
}) {
  return (
    <div className="ttt-controls">
      <div className="ttt-modes" role="group" aria-label="Game mode">
        <button
          className={`btn ${mode === 'human' ? 'btn-primary' : 'btn-surface'}`}
          onClick={() => setMode('human')}
        >
          👥 Two Players
        </button>
        <button
          className={`btn ${mode === 'computer' ? 'btn-primary' : 'btn-surface'}`}
          onClick={() => setMode('computer')}
        >
          🤖 vs Computer
        </button>
      </div>
      <div className="ttt-actions">
        <button className="btn btn-amber" onClick={onRestart}>
          ↻ Restart Round
        </button>
        <button className="btn btn-danger" onClick={onReset}>
          ⟲ Reset Scores
        </button>
      </div>
      <div className="ttt-score">
        <span className="badge">X: {scores.X}</span>
        <span className="badge">Draws: {scores.D}</span>
        <span className="badge">O: {scores.O}</span>
      </div>
      <div className="ttt-turn-hint">
        Next: <strong>{xIsNext ? 'X' : 'O'}</strong>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // Theme is embedded in the Ocean Professional palette (light by default)
  const [theme] = useState('light');

  // Game state
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [xIsNext, setXIsNext] = useState(true);
  const [mode, setMode] = useState('computer'); // 'human' | 'computer'
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const { winner, line } = useMemo(() => calculateWinner(board), [board]);
  const isDraw = useMemo(
    () => !winner && board.every(Boolean),
    [winner, board]
  );

  // Update status note
  useEffect(() => {
    if (winner) {
      setStatusNote(`${winner} wins!`);
    } else if (isDraw) {
      setStatusNote('It’s a draw!');
    } else {
      setStatusNote(`Your move: ${xIsNext ? 'X' : 'O'}`);
    }
  }, [winner, isDraw, xIsNext]);

  // Computer move effect
  useEffect(() => {
    const currentPlayer = xIsNext ? PLAYER_X : PLAYER_O;
    if (mode === 'computer' && !winner && !isDraw && currentPlayer === PLAYER_O) {
      const timer = setTimeout(() => {
        const idx = getComputerMove(board, PLAYER_O);
        if (idx != null) {
          setBoard(prev => {
            if (prev[idx]) return prev;
            const next = [...prev];
            next[idx] = PLAYER_O;
            return next;
          });
          setXIsNext(true);
        }
      }, 350); // small delay for UX
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [mode, xIsNext, winner, isDraw, board]);

  // Tally scores when game ends
  useEffect(() => {
    if (winner) {
      setScores(prev => ({
        ...prev,
        [winner]: prev[winner] + 1
      }));
    } else if (isDraw) {
      setScores(prev => ({ ...prev, D: prev.D + 1 }));
    }
  }, [winner, isDraw]);

  const canPlay = !winner && !isDraw;

  // PUBLIC_INTERFACE
  function handleSquareClick(i) {
    if (!canPlay || board[i]) return;
    const next = [...board];
    next[i] = xIsNext ? PLAYER_X : PLAYER_O;
    setBoard(next);
    setXIsNext(!xIsNext);
  }

  // PUBLIC_INTERFACE
  function restartRound() {
    setBoard(EMPTY_BOARD);
    setXIsNext(true);
    setStatusNote('');
  }

  // PUBLIC_INTERFACE
  function resetScores() {
    setBoard(EMPTY_BOARD);
    setXIsNext(true);
    setScores({ X: 0, O: 0, D: 0 });
    setStatusNote('');
  }

  return (
    <div className="ocean-app">
      <div className="ocean-background" />
      <main className="container">
        <header className="header">
          <h1 className="title">Tic Tac Toe</h1>
          <p className="subtitle">Ocean Professional</p>
        </header>

        <section className="game-card">
          <div className="status-row" role="status" aria-live="polite">
            {!winner && !isDraw && (
              <span className="status-badge info">Playing</span>
            )}
            {winner && (
              <span className="status-badge success">{winner} wins</span>
            )}
            {isDraw && (
              <span className="status-badge warning">Draw</span>
            )}
            <span className="status-text">{statusNote}</span>
          </div>

          <Board board={board} onSquareClick={handleSquareClick} winLine={line} />

          <Controls
            mode={mode}
            setMode={(m) => {
              setMode(m);
              // If switching to computer and it's O's turn, let AI move next tick
              if (m === 'computer' && !winner && !isDraw && !xIsNext) {
                // no-op: effect will trigger on dependencies
              }
            }}
            onRestart={restartRound}
            onReset={resetScores}
            xIsNext={xIsNext}
            scores={scores}
          >
          </Controls>
        </section>

        <footer className="footer">
          <small>Built with React • Modern minimalist design</small>
        </footer>
      </main>
    </div>
  );
}

export default App;
