import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Game from './components/Game';
import './App.css';

function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameMode, setGameMode] = useState('');

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={
            <Home 
              playerName={playerName}
              setPlayerName={setPlayerName}
              gameMode={gameMode}
              setGameMode={setGameMode}
            />
          } />
          <Route path="/game/:roomId" element={
            <Game 
              playerName={playerName}
              gameMode={gameMode}
            />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;