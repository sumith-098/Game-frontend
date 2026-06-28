import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RotateCcw, Trophy, X, Circle, Clock, Send } from 'lucide-react';
import './Game.css';

const Game = ({ playerName, gameMode }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(' '));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [mySymbol, setMySymbol] = useState('');
  const [gameStatus, setGameStatus] = useState('WAITING');
  const [winner, setWinner] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [chatConnected, setChatConnected] = useState(false);

  const SockJS = window.SockJS;
  const Stomp = window.Stomp;
  const API_URL1 = 'https://game-c2j9.onrender.com';
  const API_URL = 'https://game-c2j9.onrender.com/api/game';
  
  const stompClientRef = useRef(null);
  const chatStompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== CHAT WEBSOCKET CONNECTION =====
  useEffect(() => {
    if (!roomId || !playerName) return;

    console.log('🔵 Connecting to chat service...');
    
    const CHAT_SERVICE_URL = 'https://game-chat-service.onrender.com/chat-websocket';
    
    try {
      const socket = new SockJS(CHAT_SERVICE_URL);
      const stompClient = Stomp.over(socket);
      stompClient.debug = null;

      stompClient.connect({}, () => {
        console.log('✅ Chat WebSocket Connected!');
        setChatConnected(true);
        chatStompClientRef.current = stompClient;

        // Subscribe to room messages
        stompClient.subscribe(`/topic/messages/${roomId}`, (response) => {
          console.log('📩 Chat message received:', response.body);
          try {
            const receivedMessage = JSON.parse(response.body);
            setMessages((prev) => [...prev, receivedMessage]);
          } catch (e) {
            console.error('Error parsing chat message:', e);
          }
        });

        // Send join notification
        const joinMessage = {
          sender: 'System',
          content: `${playerName} joined the chat`,
          roomId: roomId
        };
        stompClient.send(`/app/chat/${roomId}`, {}, JSON.stringify(joinMessage));
        
      }, (error) => {
        console.error('❌ Chat WebSocket Error:', error);
        setChatConnected(false);
      });

    } catch (err) {
      console.error('❌ Chat connection error:', err);
      setChatConnected(false);
    }

    return () => {
      if (chatStompClientRef.current && chatStompClientRef.current.connected) {
        chatStompClientRef.current.disconnect();
        console.log('Chat WebSocket disconnected');
      }
    };
  }, [roomId, playerName]);

  // ===== GAME WEBSOCKET CONNECTION =====
  useEffect(() => {
    if (!roomId) return;

    console.log('🔵 Connecting to game service...');
    
    try {
      const socket = new SockJS(`${API_URL1}/ws`);
      const stompClient = Stomp.over(socket);
      stompClient.debug = null; 

      stompClient.connect({}, () => {
        console.log('✅ Game WebSocket Connected!');
        stompClientRef.current = stompClient;

        stompClient.subscribe(`/topic/game/${roomId}`, (message) => {
          if (message.body) {
            try {
              const updatedGame = JSON.parse(message.body);
              console.log('📩 Game update received:', updatedGame);
              updateGameState(updatedGame);
            } catch (e) {
              console.error('Error parsing game message:', e);
            }
          }
        });

        fetchInitialGameState();
      }, (err) => {
        console.error('❌ Game WebSocket error:', err);
        setError('Connection to server lost. Retrying...');
      });

    } catch (err) {
      console.error('❌ Game connection error:', err);
    }

    return () => {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.disconnect();
        console.log('Game WebSocket disconnected');
      }
    };
  }, [roomId]);

  const fetchInitialGameState = async () => {
    try {
      const response = await axios.get(`${API_URL}/${roomId}`);
      if (response.data) {
        updateGameState(response.data);
      }
    } catch (err) {
      console.error('Error fetching initial game state:', err);
      setLoading(false);
    }
  };

  const updateGameState = (updatedGame) => {
    setGame(updatedGame);
    setGameStatus(updatedGame.gameStatus);
    setWinner(updatedGame.winner || '');

    if (updatedGame.boardState) {
      const boardArray = updatedGame.boardState.split('');
      setBoard(boardArray);
    }

    if (updatedGame.player1 === playerName) {
      setMySymbol('X');
      setIsMyTurn(updatedGame.currentTurn === 'X' && updatedGame.gameStatus === 'IN_PROGRESS');
    } else if (updatedGame.player2 === playerName) {
      setMySymbol('O');
      setIsMyTurn(updatedGame.currentTurn === 'O' && updatedGame.gameStatus === 'IN_PROGRESS');
    }

    setLoading(false);
    setIsProcessing(false);
  };

  // ===== SEND CHAT MESSAGE =====
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!typedMessage.trim()) {
      console.log('Empty message, ignoring');
      return;
    }

    if (!chatStompClientRef.current || !chatStompClientRef.current.connected) {
      console.log('❌ Chat not connected, cannot send message');
      setError('Chat not connected. Please wait...');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const messagePayload = {
      sender: playerName,
      content: typedMessage.trim(),
      roomId: roomId,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending chat message:', messagePayload);

    try {
      // Send to chat service
      chatStompClientRef.current.send(
        `/app/chat/${roomId}`, 
        {}, 
        JSON.stringify(messagePayload)
      );
      
      // Optimistic update - show immediately
      setMessages((prev) => [...prev, messagePayload]);
      setTypedMessage('');
      console.log('✅ Message sent successfully');
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      setError('Failed to send message');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCellClick = async (index) => {
    if (isProcessing || !isMyTurn || gameStatus !== 'IN_PROGRESS' || board[index] !== ' ') {
      return;
    }

    setIsProcessing(true);

    const optimisticBoard = [...board];
    optimisticBoard[index] = mySymbol;
    setBoard(optimisticBoard);
    setIsMyTurn(false);

    try {
      const move = {
        roomId: roomId,
        player: playerName,
        position: index
      };

      await axios.post(`${API_URL}/move`, move);
    } catch (err) {
      console.error('Error making move:', err);
      fetchInitialGameState();
      setError(err.response?.data || 'Failed to make move');
      setTimeout(() => setError(''), 3000);
      setIsProcessing(false);
    }
  };

  const checkWinningMove = (index) => {
    if (!game?.boardState) return false;
    const boardArray = game.boardState.split('');
    const winPatterns = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    const symbol = boardArray[index];
    return winPatterns.some(pattern => 
      pattern.includes(index) && 
      pattern.every(pos => boardArray[pos] === symbol)
    );
  };

  const renderCell = (index) => {
    const value = board[index];
    const isWinner = winner && winner !== 'DRAW' && 
                     winner === playerName && 
                     checkWinningMove(index);

    let cellClass = 'game-cell';
    if (value === 'X') cellClass += ' cell-x';
    if (value === 'O') cellClass += ' cell-o';
    if (isWinner) cellClass += ' cell-winner';

    return (
      <button
        key={index}
        onClick={() => handleCellClick(index)}
        className={cellClass}
        disabled={!isMyTurn || gameStatus !== 'IN_PROGRESS' || value !== ' ' || isProcessing}
      >
        {value === 'X' && <X size={40} />}
        {value === 'O' && <Circle size={40} />}
        {value === ' ' && (
          <span className="empty-cell">
            {isMyTurn ? '●' : '○'}
          </span>
        )}
      </button>
    );
  };

  const getStatusMessage = () => {
    if (gameStatus === 'WAITING') {
      return '⏳ Waiting for opponent...';
    } else if (gameStatus === 'IN_PROGRESS') {
      if (winner) {
        return winner === 'DRAW' ? "🤝 It's a Draw!" : `🏆 ${winner} wins!`;
      }
      if (isMyTurn) {
        return '🎯 Your Turn!';
      } else {
        return '🤔 Opponent is thinking...';
      }
    } else if (gameStatus === 'COMPLETED') {
      if (winner === 'DRAW') {
        return "🤝 It's a Draw!";
      } else if (winner) {
        return `🏆 ${winner} wins!`;
      }
    }
    return '';
  };

  const handleLeave = () => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.disconnect();
    }
    if (chatStompClientRef.current && chatStompClientRef.current.connected) {
      chatStompClientRef.current.disconnect();
    }
    navigate('/');
  };

  const handlePlayAgain = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading game...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card glass-effect">
          <div className="error-emoji">😕</div>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button onClick={handleLeave} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-layout">
      {/* Game Board Section */}
      <div className="game-board-section">
        <div className="game-card glass-effect">
          {/* Header */}
          <div className="game-header">
            <button onClick={handleLeave} className="back-btn">
              <ArrowLeft size={20} />
            </button>
            
            <div className="game-title">
              <h2>Tic-Tac-Toe</h2>
              <p>Room: {roomId}</p>
            </div>
            
            {gameMode === 'PRIVATE' && timeLeft && (
              <div className="timer">
                <Clock size={16} />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>

          {/* Players Info */}
          <div className="players-info">
            <div className="player player-x">
              <div className="player-avatar x-avatar">
                <span>X</span>
              </div>
              <span className="player-name">{game?.player1 || 'Waiting...'}</span>
              {game?.player1 === playerName && (
                <span className="you-badge">(You)</span>
              )}
            </div>
            
            <span className="vs-text">vs</span>
            
            <div className="player player-o">
              <div className="player-avatar o-avatar">
                <span>O</span>
              </div>
              <span className="player-name">{game?.player2 || 'Waiting...'}</span>
              {game?.player2 === playerName && (
                <span className="you-badge">(You)</span>
              )}
            </div>
          </div>

          {/* Game Status */}
          <div className="game-status">
            <div className={`status-text ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
              {getStatusMessage()}
            </div>
            {isMyTurn && gameStatus === 'IN_PROGRESS' && (
              <div className="turn-indicator">
                You are playing as <strong>{mySymbol}</strong>
              </div>
            )}
            {gameStatus === 'WAITING' && (
              <div className="turn-indicator" style={{ color: '#fbbf24' }}>
                Waiting for another player to join...
              </div>
            )}
          </div>
              
          {/* Game Board */}
          <div className="game-board">
            {board.map((_, index) => renderCell(index))}
          </div>

          {/* Actions */}
          <div className="game-actions">
            <button onClick={handleLeave} className="btn-secondary">
              <ArrowLeft size={16} />
              Leave
            </button>
            
            {(gameStatus === 'COMPLETED' || winner) && (
              <button onClick={handlePlayAgain} className="btn-primary">
                <RotateCcw size={16} />
                Play Again
              </button>
            )}
          </div>

          {/* Winner Celebration */}
          {winner && winner !== 'DRAW' && (
            <div className="winner-celebration">
              <Trophy size={32} color="#fbbf24" />
              <span>{winner === playerName ? 'You Win!' : `${winner} Wins!`}</span>
            </div>
          )}
          
          {winner === 'DRAW' && (
            <div className="draw-message">
              🤝 It's a draw! Great game!
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="chat-side-panel glass-effect">
        <div className="chat-header">
          <h3>💬 Chat</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="chat-room">{roomId}</span>
            <span className={`chat-status ${chatConnected ? 'connected' : 'disconnected'}`}>
              {chatConnected ? '🟢' : '🔴'}
            </span>
          </div>
        </div>
        
        <div className="chat-messages-box">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-bubble ${msg.sender === playerName ? 'own' : msg.sender === 'System' ? 'system' : 'other'}`}
              >
                <div className="chat-bubble-sender">
                  <strong>{msg.sender}</strong>
                  {msg.timestamp && (
                    <span className="chat-timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="chat-bubble-content">
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSendMessage} className="chat-input-bar">
          <input 
            type="text" 
            value={typedMessage} 
            onChange={(e) => setTypedMessage(e.target.value)} 
            placeholder={chatConnected ? "Type a message..." : "Connecting..."}
            className="chat-input"
            disabled={!chatConnected}
          />
          <button type="submit" className="chat-send-btn" disabled={!chatConnected}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Game;