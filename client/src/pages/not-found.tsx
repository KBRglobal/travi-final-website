import { Link } from "wouter";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo-head";
import { Home, MapPin } from "lucide-react";
import { Logo } from "@/components/logo";

const mascotLight = "/logos/Mascot_for_Dark_Background.png";

export default function NotFound() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInitializedRef = useRef(false);

  useEffect(() => {
    if (gameInitializedRef.current || !gameContainerRef.current) return;
    gameInitializedRef.current = true;

    const container = gameContainerRef.current;
    
    // Game constants
    const GRAVITY = 0.35, JUMP_FORCE = -7.5, GAME_WIDTH = 380, GAME_HEIGHT = 450;
    const DUCK_SIZE = 60, OBSTACLE_WIDTH = 60, STAMP_SIZE = 35;

    let gameState: 'start' | 'playing' | 'gameover' = 'start';
    let score = 0;
    let highScore = parseInt(localStorage.getItem('travi404HighScore') || '0', 10);
    let duckY = 195, duckVelocity = 0;
    let obstacles: any[] = [], stamps: any[] = [], particles: any[] = [];
    let frameCount = 0, gameLoop: number | null = null;

    const destinations = ['🗼', '🗽', '🏰', '🕌', '⛩️', '🏛️', '🎡', '🗿', '🌴', '🏝️', '⛱️'];
    const cloudTypes = ['⛈️', '🌧️', '☁️', '🌩️'];

    // Create game HTML
    container.innerHTML = `
      <div class="absolute inset-0" style="background: linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 20%, #C4B5FD 40%, #A78BFA 60%, #8B5CF6 80%, #7C3AED 100%);"></div>
      <div id="bg-clouds" class="absolute inset-0 pointer-events-none overflow-hidden"></div>
      <div class="absolute top-3 right-3 text-4xl" style="filter: drop-shadow(0 0 15px rgba(250,204,21,0.5));">☀️</div>
      <div id="game-elements" class="absolute inset-0"></div>
      
      <div id="duck" class="absolute" style="left: 50px; width: 60px; height: 60px; transition: transform 0.1s ease-out; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));">
        <img src="${mascotLight}" alt="TRAVI Mascot" class="w-full h-full object-contain">
      </div>
      
      <div id="score-display" class="hidden absolute top-3 left-3 backdrop-blur-md bg-white/95 rounded-lg px-3 py-1.5 shadow-md border border-[#6443F4]/10">
        <div id="score" class="text-2xl font-bold" style="color: #6443F4;">0</div>
        <div class="text-xs text-gray-500">points</div>
      </div>
      
      <div id="highscore-display" class="hidden absolute top-3 left-1/2 -translate-x-1/2 backdrop-blur-md bg-white/95 rounded-lg px-2 py-1 shadow-md border border-[#6443F4]/10">
        <div class="text-xs text-gray-500">🏆 <span id="highscore" class="font-semibold" style="color: #6443F4;">0</span></div>
      </div>

      <div id="start-screen" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
        <div class="bg-white rounded-2xl p-6 text-center shadow-lg mx-4 max-w-xs border border-gray-100">
          <img src="${mascotLight}" alt="TRAVI Mascot" class="w-16 h-16 mx-auto mb-3 object-contain">
          <h2 class="text-lg font-bold text-gray-900 mb-1">The Lost Duck</h2>
          <p class="text-gray-500 text-xs mb-4">Collect destinations & avoid clouds!</p>
          <div class="flex gap-6 justify-center mb-4">
            <div class="text-center">
              <div class="text-xl mb-1">🗼</div>
              <div class="text-xs text-emerald-600 font-medium">+3 pts</div>
            </div>
            <div class="text-center">
              <div class="text-xl mb-1">⛈️</div>
              <div class="text-xs text-rose-500 font-medium">Avoid!</div>
            </div>
          </div>
          <button id="start-btn" class="w-full text-white px-5 py-2 rounded-full font-semibold text-sm shadow-md" style="background: linear-gradient(135deg, #6443F4 0%, #8B5CF6 100%);">
            Let's Go! 🚀
          </button>
          <p class="text-xs text-gray-400 mt-2">Space / Click = Jump</p>
        </div>
      </div>

      <div id="gameover-screen" class="hidden absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
        <div class="bg-white rounded-2xl p-6 text-center shadow-lg mx-4 max-w-xs border border-gray-100">
          <div class="text-4xl mb-2">😵</div>
          <h2 class="text-lg font-bold text-rose-500 mb-2">Turbulence!</h2>
          <div class="rounded-xl p-3 mb-3" style="background: rgba(123, 75, 164, 0.05);">
            <div id="final-score" class="text-3xl font-bold" style="color: #6443F4;">0</div>
            <div class="text-xs text-gray-500">points</div>
          </div>
          <div class="text-sm text-gray-500 mb-3">
            🏆 Best: <span id="final-highscore" class="font-semibold" style="color: #6443F4;">0</span>
          </div>
          <button id="restart-btn" class="w-full text-white px-5 py-2 rounded-full font-semibold text-sm shadow-md" style="background: linear-gradient(135deg, #6443F4 0%, #8B5CF6 100%);">
            Try Again 🔄
          </button>
        </div>
      </div>
    `;

    // Get elements
    const duckEl = container.querySelector('#duck') as HTMLElement;
    const scoreEl = container.querySelector('#score') as HTMLElement;
    const scoreDisplayEl = container.querySelector('#score-display') as HTMLElement;
    const highscoreDisplayEl = container.querySelector('#highscore-display') as HTMLElement;
    const highscoreEl = container.querySelector('#highscore') as HTMLElement;
    const startScreen = container.querySelector('#start-screen') as HTMLElement;
    const gameoverScreen = container.querySelector('#gameover-screen') as HTMLElement;
    const finalScoreEl = container.querySelector('#final-score') as HTMLElement;
    const finalHighscoreEl = container.querySelector('#final-highscore') as HTMLElement;
    const gameElementsEl = container.querySelector('#game-elements') as HTMLElement;
    const bgCloudsEl = container.querySelector('#bg-clouds') as HTMLElement;
    const startBtn = container.querySelector('#start-btn') as HTMLElement;
    const restartBtn = container.querySelector('#restart-btn') as HTMLElement;

    highscoreEl.textContent = highScore.toString();

    // Create background clouds
    for (let i = 0; i < 5; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'absolute text-4xl opacity-30';
      cloud.style.left = `${Math.random() * 100}%`;
      cloud.style.top = `${Math.random() * 70}%`;
      cloud.style.animation = `float 3s ease-in-out ${Math.random() * 3}s infinite`;
      cloud.textContent = '☁️';
      bgCloudsEl.appendChild(cloud);
    }

    function jump() {
      if (gameState === 'start') {
        startGame();
      } else if (gameState === 'playing') {
        duckVelocity = JUMP_FORCE;
        createParticles(70, duckY + DUCK_SIZE / 2, '✨', 3);
        duckEl.style.transform = `translateY(${duckY}px) rotate(-20deg) scale(1.1)`;
        setTimeout(() => {
          if (gameState === 'playing') {
            duckEl.style.transform = `translateY(${duckY}px) rotate(${Math.min(duckVelocity * 3, 30)}deg) scale(1)`;
          }
        }, 100);
      } else if (gameState === 'gameover') {
        resetGame();
      }
    }

    function startGame() {
      gameState = 'playing';
      startScreen.classList.add('hidden');
      scoreDisplayEl.classList.remove('hidden');
      highscoreDisplayEl.classList.remove('hidden');
      duckVelocity = JUMP_FORCE;
      runGameLoop();
    }

    function resetGame() {
      gameState = 'start';
      score = 0;
      duckY = 195;
      duckVelocity = 0;
      obstacles = [];
      stamps = [];
      particles = [];
      frameCount = 0;
      scoreEl.textContent = '0';
      gameElementsEl.innerHTML = '';
      gameoverScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
      scoreDisplayEl.classList.add('hidden');
      highscoreDisplayEl.classList.add('hidden');
      duckEl.style.transform = `translateY(${duckY}px) rotate(0deg)`;
    }

    function gameOver() {
      gameState = 'gameover';
      if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
      }
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('travi404HighScore', highScore.toString());
        highscoreEl.textContent = highScore.toString();
      }
      finalScoreEl.textContent = score.toString();
      finalHighscoreEl.textContent = highScore.toString();
      gameoverScreen.classList.remove('hidden');
      duckEl.style.transform = `translateY(${duckY}px) rotate(180deg) scale(0.8)`;
      createParticles(70, duckY + DUCK_SIZE / 2, '💥', 6);
    }

    function createParticles(x: number, y: number, emoji: string, count: number) {
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'absolute pointer-events-none';
        p.style.cssText = `left:${x}px;top:${y}px;font-size:18px`;
        p.textContent = emoji;
        (p as any).vx = (Math.random() - 0.5) * 6;
        (p as any).vy = (Math.random() - 0.5) * 6;
        (p as any).life = 25;
        gameElementsEl.appendChild(p);
        particles.push(p);
      }
    }

    function spawnObstacle() {
      const gapY = Math.random() * (GAME_HEIGHT - 240) + 120;
      const gapHeight = Math.max(145 - Math.floor(score / 5) * 5, 105);
      const cloud = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
      const obs = { x: GAME_WIDTH, gapY, gapHeight, cloud, passed: false, elements: [] as HTMLElement[] };

      const top = document.createElement('div');
      top.className = 'absolute flex flex-col items-center justify-end';
      top.style.cssText = `left:${GAME_WIDTH}px;top:0;width:${OBSTACLE_WIDTH}px;height:${gapY - gapHeight / 2}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15))`;
      top.innerHTML = `<div class="text-4xl">${cloud}</div><div class="text-3xl -mt-1">${cloud}</div><div class="text-4xl -mt-1">${cloud}</div>`;

      const bot = document.createElement('div');
      bot.className = 'absolute flex flex-col items-center justify-start';
      bot.style.cssText = `left:${GAME_WIDTH}px;top:${gapY + gapHeight / 2}px;width:${OBSTACLE_WIDTH}px;height:${GAME_HEIGHT - gapY - gapHeight / 2}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15))`;
      bot.innerHTML = `<div class="text-4xl">${cloud}</div><div class="text-3xl -mt-1">${cloud}</div><div class="text-4xl -mt-1">${cloud}</div>`;

      gameElementsEl.appendChild(top);
      gameElementsEl.appendChild(bot);
      obs.elements = [top, bot];
      obstacles.push(obs);
    }

    function spawnStamp() {
      const s = { 
        x: GAME_WIDTH, 
        y: Math.random() * (GAME_HEIGHT - 130) + 65, 
        emoji: destinations[Math.floor(Math.random() * destinations.length)], 
        collected: false,
        element: null as HTMLElement | null
      };
      const el = document.createElement('div');
      el.className = 'absolute';
      el.style.cssText = `left:${s.x}px;top:${s.y}px;font-size:${STAMP_SIZE}px;filter:drop-shadow(0 0 5px #FACC15);animation:pulse 0.5s ease-in-out infinite`;
      el.textContent = s.emoji;
      gameElementsEl.appendChild(el);
      s.element = el;
      stamps.push(s);
    }

    function runGameLoop() {
      if (gameState !== 'playing') return;
      frameCount++;
      duckVelocity += GRAVITY;
      duckY += duckVelocity;

      if (duckY < -15 || duckY > GAME_HEIGHT - DUCK_SIZE + 15) {
        gameOver();
        return;
      }

      duckEl.style.transform = `translateY(${duckY}px) rotate(${Math.min(Math.max(duckVelocity * 4, -35), 50)}deg)`;

      if (frameCount % 85 === 0) spawnObstacle();
      if (frameCount % 60 === 0) spawnStamp();

      const speed = 3 + Math.min(score / 20, 2);

      obstacles = obstacles.filter(o => {
        o.x -= speed;
        o.elements.forEach((e: HTMLElement) => e.style.left = o.x + 'px');
        const dL = 60, dR = 60 + DUCK_SIZE - 18, dT = duckY + 12, dB = duckY + DUCK_SIZE - 12;
        const oL = o.x + 8, oR = o.x + OBSTACLE_WIDTH - 8;
        if (dR > oL && dL < oR && (dT < o.gapY - o.gapHeight / 2 || dB > o.gapY + o.gapHeight / 2)) {
          gameOver();
          return false;
        }
        if (!o.passed && o.x + OBSTACLE_WIDTH < 50) {
          o.passed = true;
          score++;
          scoreEl.textContent = score.toString();
        }
        if (o.x < -OBSTACLE_WIDTH) {
          o.elements.forEach((e: HTMLElement) => e.remove());
          return false;
        }
        return true;
      });

      stamps = stamps.filter(s => {
        s.x -= speed * 0.85;
        if (s.element) s.element.style.left = s.x + 'px';
        if (!s.collected) {
          const dx = (60 + DUCK_SIZE / 2) - (s.x + STAMP_SIZE / 2);
          const dy = (duckY + DUCK_SIZE / 2) - (s.y + STAMP_SIZE / 2);
          if (Math.sqrt(dx * dx + dy * dy) < (DUCK_SIZE + STAMP_SIZE) / 2) {
            s.collected = true;
            score += 3;
            scoreEl.textContent = score.toString();
            createParticles(s.x + STAMP_SIZE / 2, s.y + STAMP_SIZE / 2, '⭐', 4);
            if (s.element) {
              s.element.style.transform = 'scale(1.5)';
              s.element.style.opacity = '0';
              setTimeout(() => s.element?.remove(), 200);
            }
            return false;
          }
        }
        if (s.x < -STAMP_SIZE) {
          s.element?.remove();
          return false;
        }
        return true;
      });

      particles = particles.filter(p => {
        const life = (p as any).life - 1;
        if (life <= 0) {
          p.remove();
          return false;
        }
        p.style.left = (parseFloat(p.style.left) + (p as any).vx) + 'px';
        p.style.top = (parseFloat(p.style.top) + (p as any).vy) + 'px';
        p.style.opacity = (life / 25).toString();
        (p as any).life = life;
        (p as any).vy = (p as any).vy + 0.15;
        return true;
      });

      gameLoop = requestAnimationFrame(runGameLoop);
    }

    // Event listeners
    container.addEventListener('click', jump);
    container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      jump();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      jump();
    });

    restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      jump();
    });

    duckEl.style.transform = `translateY(${duckY}px)`;

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (gameLoop) cancelAnimationFrame(gameLoop);
    };
  }, []);

  return (
    <>
      <SEOHead
        title="Page Coming Soon | Travi"
        description="This page is still being built. Travi is actively expanding with new destinations and contents."
        canonicalPath="/404"
      />

      <div className="min-h-screen w-full flex flex-col bg-white dark:bg-slate-900">
        <header className="w-full py-6 px-6">
          <Logo variant="light-bg" height={32} linkTo="/" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6443F4]/10 to-[#6443F4]/10 flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6443F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l2 2"/>
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4 font-display" data-testid="text-404-title">
            This page is still coming together
          </h1>

          <p className="text-muted-foreground text-center max-w-lg mb-2">
            Travi is being built step by step — connecting destinations, contents, and real-time travel recommendations.
          </p>
          <p className="text-muted-foreground text-center max-w-lg mb-6">
            While you wait, help our mascot find their way home!
          </p>

          <div
            ref={gameContainerRef}
            className="relative rounded-2xl overflow-hidden cursor-pointer shadow-xl border border-border mb-8 select-none"
            style={{ width: 380, height: 450 }}
            data-testid="game-container"
          />

          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/" data-testid="button-404-home">
              <Button 
                size="lg"
                className="rounded-full bg-[#6443F4] hover:bg-[#5339D9] text-white px-6"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to homepage
              </Button>
            </Link>
            <Link href="/destinations/dubai/attractions" data-testid="button-404-attractions">
              <Button 
                size="lg"
                variant="outline"
                className="rounded-full px-6 border-border"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Explore Dubai attractions
              </Button>
            </Link>
          </div>
        </main>

        <footer className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Made with care in Gibraltar</p>
        </footer>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
