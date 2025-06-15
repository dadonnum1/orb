import React, { useRef, useEffect, useState, useCallback } from 'react';
import './App.css';

const OrbRush = () => {
  const canvasRef = useRef(null);
  const gameStateRef = useRef({
    isRunning: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    gameStartTime: 0,
    level: 1
  });
  
  const gameObjectsRef = useRef({
    player: {
      x: 400,
      y: 300,
      size: 20,
      targetX: 400,
      targetY: 300,
      color: '#00ffff',
      trail: []
    },
    collectibles: [],
    obstacles: [],
    particles: []
  });

  const [gameState, setGameState] = useState({
    isRunning: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    showStartScreen: true
  });

  // Initialize high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('orbRushHighScore');
    if (savedHighScore) {
      const highScore = parseInt(savedHighScore);
      setGameState(prev => ({ ...prev, highScore }));
      gameStateRef.current.highScore = highScore;
    }
  }, []);

  // Game physics and rendering
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { player, collectibles, obstacles, particles } = gameObjectsRef.current;
    const gameState = gameStateRef.current;
    
    if (!gameState.isRunning || gameState.isPaused) return;

    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(15, 15, 16, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update player position (smooth following)
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    player.x += dx * 0.1;
    player.y += dy * 0.1;

    // Add to player trail
    player.trail.push({ x: player.x, y: player.y, alpha: 1 });
    if (player.trail.length > 15) player.trail.shift();

    // Update trail alpha
    player.trail.forEach((point, index) => {
      point.alpha = index / player.trail.length * 0.5;
    });

    // Spawn collectibles
    if (Math.random() < 0.02 + (gameState.level * 0.005)) {
      collectibles.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: Math.random() * (canvas.height - 40) + 20,
        size: 8 + Math.random() * 12,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        pulse: Math.random() * Math.PI * 2,
        collectTime: Date.now()
      });
    }

    // Spawn obstacles
    if (Math.random() < 0.008 + (gameState.level * 0.002)) {
      const side = Math.floor(Math.random() * 4);
      let x, y, vx, vy;
      
      switch(side) {
        case 0: // top
          x = Math.random() * canvas.width;
          y = -20;
          vx = (Math.random() - 0.5) * 2;
          vy = 1 + Math.random() * 2;
          break;
        case 1: // right
          x = canvas.width + 20;
          y = Math.random() * canvas.height;
          vx = -(1 + Math.random() * 2);
          vy = (Math.random() - 0.5) * 2;
          break;
        case 2: // bottom
          x = Math.random() * canvas.width;
          y = canvas.height + 20;
          vx = (Math.random() - 0.5) * 2;
          vy = -(1 + Math.random() * 2);
          break;
        case 3: // left
          x = -20;
          y = Math.random() * canvas.height;
          vx = 1 + Math.random() * 2;
          vy = (Math.random() - 0.5) * 2;
          break;
      }
      
      obstacles.push({
        x, y, vx, vy,
        size: 15 + Math.random() * 10,
        color: '#ff4444',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    // Update collectibles
    collectibles.forEach((collectible, index) => {
      collectible.pulse += 0.2;
      const pulseFactor = 1 + Math.sin(collectible.pulse) * 0.3;
      
      // Check collision with player
      const dist = Math.sqrt(
        Math.pow(collectible.x - player.x, 2) + 
        Math.pow(collectible.y - player.y, 2)
      );
      
      if (dist < player.size + collectible.size * pulseFactor) {
        // Collect!
        gameState.score += Math.floor(collectible.size);
        player.size += collectible.size * 0.1;
        
        // Create particles
        for (let i = 0; i < 8; i++) {
          particles.push({
            x: collectible.x,
            y: collectible.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 4 + 2,
            color: collectible.color,
            life: 1,
            decay: 0.02
          });
        }
        
        collectibles.splice(index, 1);
      }
      
      // Remove old collectibles
      if (Date.now() - collectible.collectTime > 8000) {
        collectibles.splice(index, 1);
      }
    });

    // Update obstacles
    obstacles.forEach((obstacle, index) => {
      obstacle.x += obstacle.vx * (1 + gameState.level * 0.1);
      obstacle.y += obstacle.vy * (1 + gameState.level * 0.1);
      obstacle.rotation += obstacle.rotationSpeed;
      
      // Check collision with player
      const dist = Math.sqrt(
        Math.pow(obstacle.x - player.x, 2) + 
        Math.pow(obstacle.y - player.y, 2)
      );
      
      if (dist < player.size + obstacle.size) {
        // Hit!
        player.size -= obstacle.size * 0.15;
        
        // Create impact particles
        for (let i = 0; i < 12; i++) {
          particles.push({
            x: player.x,
            y: player.y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: Math.random() * 3 + 1,
            color: '#ff6666',
            life: 1,
            decay: 0.03
          });
        }
        
        obstacles.splice(index, 1);
        
        // Game over check
        if (player.size <= 5) {
          endGame();
          return;
        }
      }
      
      // Remove off-screen obstacles
      if (obstacle.x < -50 || obstacle.x > canvas.width + 50 || 
          obstacle.y < -50 || obstacle.y > canvas.height + 50) {
        obstacles.splice(index, 1);
      }
    });

    // Update particles
    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      particle.life -= particle.decay;
      
      if (particle.life <= 0) {
        particles.splice(index, 1);
      }
    });

    // Level progression
    const newLevel = Math.floor(gameState.score / 200) + 1;
    if (newLevel > gameState.level) {
      gameState.level = newLevel;
    }

    // Render everything
    // Draw player trail
    player.trail.forEach((point, index) => {
      ctx.globalAlpha = point.alpha;
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, player.size * (index / player.trail.length), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player
    ctx.globalAlpha = 1;
    const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.size);
    gradient.addColorStop(0, player.color);
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0.3)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    // Draw collectibles
    collectibles.forEach(collectible => {
      const pulseFactor = 1 + Math.sin(collectible.pulse) * 0.3;
      const collectibleGradient = ctx.createRadialGradient(
        collectible.x, collectible.y, 0,
        collectible.x, collectible.y, collectible.size * pulseFactor
      );
      collectibleGradient.addColorStop(0, collectible.color);
      collectibleGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      
      ctx.fillStyle = collectibleGradient;
      ctx.beginPath();
      ctx.arc(collectible.x, collectible.y, collectible.size * pulseFactor, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw obstacles
    obstacles.forEach(obstacle => {
      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);
      ctx.rotate(obstacle.rotation);
      
      const obstacleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, obstacle.size);
      obstacleGradient.addColorStop(0, obstacle.color);
      obstacleGradient.addColorStop(1, 'rgba(255, 68, 68, 0.3)');
      
      ctx.fillStyle = obstacleGradient;
      ctx.beginPath();
      ctx.rect(-obstacle.size, -obstacle.size, obstacle.size * 2, obstacle.size * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw particles
    particles.forEach(particle => {
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    
    // Update UI state
    setGameState(prev => ({
      ...prev,
      score: gameState.score
    }));

    requestAnimationFrame(gameLoop);
  }, []);

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset game state
    gameStateRef.current = {
      isRunning: true,
      isPaused: false,
      score: 0,
      highScore: gameStateRef.current.highScore,
      gameStartTime: Date.now(),
      level: 1
    };

    // Reset game objects
    gameObjectsRef.current = {
      player: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: 20,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2,
        color: '#00ffff',
        trail: []
      },
      collectibles: [],
      obstacles: [],
      particles: []
    };

    setGameState(prev => ({
      ...prev,
      isRunning: true,
      showStartScreen: false,
      score: 0
    }));

    requestAnimationFrame(gameLoop);
  };

  const endGame = () => {
    gameStateRef.current.isRunning = false;
    
    // Update high score
    if (gameStateRef.current.score > gameStateRef.current.highScore) {
      gameStateRef.current.highScore = gameStateRef.current.score;
      localStorage.setItem('orbRushHighScore', gameStateRef.current.score.toString());
    }
    
    setGameState(prev => ({
      ...prev,
      isRunning: false,
      showStartScreen: true,
      highScore: gameStateRef.current.highScore
    }));
  };

  // Mouse movement handler
  const handleMouseMove = (e) => {
    if (!gameStateRef.current.isRunning) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    gameObjectsRef.current.player.targetX = (e.clientX - rect.left) * scaleX;
    gameObjectsRef.current.player.targetY = (e.clientY - rect.top) * scaleY;
  };

  // Touch movement handler
  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!gameStateRef.current.isRunning) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const touch = e.touches[0];
    gameObjectsRef.current.player.targetX = (touch.clientX - rect.left) * scaleX;
    gameObjectsRef.current.player.targetY = (touch.clientY - rect.top) * scaleY;
  };

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 800;
    canvas.height = 600;
    
    // Set up event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-cyan-400/30 rounded-xl shadow-2xl shadow-cyan-500/20 bg-gray-900/50 backdrop-blur-sm"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 text-white">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 space-y-1">
            <div className="text-2xl font-bold text-cyan-400">
              Score: {gameState.score}
            </div>
            <div className="text-sm text-gray-300">
              High Score: {gameState.highScore}
            </div>
            <div className="text-xs text-gray-400">
              Level: {gameStateRef.current.level}
            </div>
          </div>
        </div>

        {/* Start Screen */}
        {gameState.showStartScreen && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <div className="text-center text-white space-y-6 p-8">
              <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                ORB RUSH
              </h1>
              <p className="text-xl text-gray-300 max-w-md">
                Collect glowing orbs to grow bigger while avoiding red obstacles!
                Control your orb by moving your mouse.
              </p>
              <div className="space-y-2 text-gray-400">
                <div>🔵 Collect orbs to grow and score</div>
                <div>🔴 Avoid red obstacles</div>
                <div>🎯 Survive as long as possible</div>
              </div>
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 px-8 py-4 rounded-full text-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
              >
                START GAME
              </button>
              {gameState.highScore > 0 && (
                <div className="text-sm text-gray-500">
                  Your best score: {gameState.highScore}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 right-4 text-center text-gray-400 text-sm">
          Move your mouse or finger to control your orb
        </div>
      </div>
    </div>
  );
};

function App() {
  return <OrbRush />;
}

export default App;