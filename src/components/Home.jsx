import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Lock, Globe, Sparkles, ArrowRight, Gamepad2, Loader2 } from 'lucide-react';
import './Home.css';

const Home = ({ playerName, setPlayerName, gameMode, setGameMode }) => {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [loadingMessage, setLoadingMessage] = useState('Initializing server...');
  
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const API_URL = 'https://game-c2j9.onrender.com/api/game';

  // Dynamic messages to keep the user engaged during the Render cold start
  useEffect(() => {
    if (!loading) return;

    if (countdown > 45) {
      setLoadingMessage('Waking up the game server... Please wait.');
    } else if (countdown > 30) {
      setLoadingMessage('Spinning up environment... Almost there!');
    } else if (countdown > 15) {
      setLoadingMessage('Connecting to database... Hang tight!');
    } else if (countdown > 0) {
      setLoadingMessage('Finalizing connection... Just a few more seconds!');
    } else {
      setLoadingMessage('Still waiting... This usually takes up to 60s.');
    }
  }, [countdown, loading]);

  const handleCreateOrJoin = async (action) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (gameMode === 'PRIVATE' && (!roomId.trim() || !password.trim())) {
      setError('Please enter Room ID and Password');
      return;
    }

    setLoading(true);
    setError('');
    setCountdown(60); // Reset timer to 60 seconds

    // Start the countdown ticker
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const request = {
        playerName: playerName.trim(),
        gameMode: gameMode,
        action: action,
        roomId: roomId || undefined,
        password: password || undefined
      };

      const endpoint = `${API_URL}/${action === 'CREATE' ? 'create' : 'join'}`;
      const response = await axios.post(endpoint, request);
      
      if (response.data && response.data.roomId) {
        clearInterval(timerRef.current);
        navigate(`/game/${response.data.roomId}`);
      }
    } catch (err) {
      clearInterval(timerRef.current);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
      clearInterval(timerRef.current);
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const GameModeCard = ({ mode, icon: Icon, title, description }) => (
    <button
      onClick={() => setGameMode(mode)}
      className={`game-mode-card ${gameMode === mode ? 'active' : ''}`}
      disabled={loading}
    >
      <div className="card-content">
        <div className={`card-icon ${gameMode === mode ? 'active' : ''}`}>
          <Icon size={24} />
        </div>
        <div className="card-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {gameMode === mode && <div className="card-indicator"></div>}
    </button>
  );

  return (
    <div className="home-container">
      {/* Loading Overlay Screen */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card glass-effect animate-fade-in">
            <Loader2 className="spinner-icon" size={64} />
            <div className="timer-circle">
              <span className="timer-seconds">{countdown}s</span>
            </div>
            <h2>Connecting to Server</h2>
            <p className="loading-subtext">{loadingMessage}</p>
            <span className="server-notice">Free servers sleep after 15m of inactivity</span>
          </div>
        </div>
      )}

      <div className="home-card glass-effect">
        {/* Header */}
        <div className="home-header">
          <div className="icon-wrapper">
            <Gamepad2 size={48} />
          </div>
          <h1 className="gradient-text">Tic-Tac-Toe</h1>
          <p>Challenge your friends or play with strangers!</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Player Name */}
        <div className="form-group">
          <label>Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="input-field"
            placeholder="Enter your name"
            disabled={loading}
          />
        </div>

        {/* Game Mode Selection */}
        <div className="form-group">
          <label>Select Game Mode</label>
          <div className="mode-cards">
            <GameModeCard 
              mode="PUBLIC"
              icon={Globe}
              title="Public Game"
              description="Play with a random opponent"
            />
            <GameModeCard 
              mode="PRIVATE"
              icon={Lock}
              title="Private Game"
              description="Create or join a private room"
            />
          </div>
        </div>

        {/* Private Game Options */}
        {gameMode === 'PRIVATE' && (
          <div className="private-options">
            <div className="form-group">
              <label>Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="input-field"
                placeholder="Enter Room ID (e.g., GAME123)"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter room password"
                disabled={loading}
              />
            </div>

            <div className="button-group">
              <button
                onClick={() => handleCreateOrJoin('CREATE')}
                disabled={loading || !roomId || !password}
                className="btn-primary create-btn"
              >
                <Sparkles size={18} />
                Create Room
              </button>

              <button
                onClick={() => handleCreateOrJoin('JOIN')}
                disabled={loading || !roomId || !password}
                className="btn-secondary join-btn"
              >
                <Users size={18} />
                Join Room
              </button>
            </div>
          </div>
        )}

        {/* Public Game Button */}
        {gameMode === 'PUBLIC' && (
          <button
            onClick={() => handleCreateOrJoin('JOIN')}
            disabled={loading}
            className="btn-primary public-btn"
          >
            <Users size={20} />
            Find Public Game
            <ArrowRight size={20} />
          </button>
        )}

        {/* Footer */}
        <div className="home-footer">
          <p>
            {gameMode === 'PUBLIC' 
              ? '🎮 You will be matched with another player' 
              : '⏰ Room expires in 5 minutes'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
