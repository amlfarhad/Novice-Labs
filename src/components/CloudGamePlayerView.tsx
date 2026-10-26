import React, { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Eye,
  Film,
  Flame,
  Gamepad2,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface CloudGamePlayerViewProps {
  projectTitle: string;
  cloudStorageProvider: string;
  founderSteeringHistory: string[];
  onExitToStudio?: () => void;
}

interface ComicPanelSpec {
  id: string;
  chapter: string;
  dateStamp: string;
  location: string;
  speaker: string;
  caption: string;
  dialogue: string;
  visualNotes: string;
  accentColor: string;
}

const LONG_HALLOWEEN_PANELS: ComicPanelSpec[] = [
  {
    id: 'PANEL-01',
    chapter: 'CHAPTER I · OCTOBER 31 (HALLOWEEN)',
    dateStamp: 'OCTOBER 31 · 11:42 PM · GOTHAM HEIGHTS',
    location: 'Carmine "The Roman" Falcone’s Penthouse',
    speaker: 'BRUCE WAYNE / BATMAN (INTERNAL MONOLOGUE)',
    caption: '“I believe in Gotham City. Even on Halloween night, when the shadows swallow the spire tops whole.”',
    dialogue: 'Carmine Falcone: “You disrespect my house on the night of my nephew’s wedding, Harvey. Gotham belongs to the Roman.”',
    visualNotes: 'Tim Sale High-Contrast Sumi-Ink Silhouette · 2.5D Multi-Plane Rain & Venetian Blind Shadow Projection',
    accentColor: '#F59E0B',
  },
  {
    id: 'PANEL-02',
    chapter: 'CHAPTER I · OCTOBER 31 (HALLOWEEN)',
    dateStamp: 'OCTOBER 31 · 11:58 PM · SUB-BASEMENT VAULT',
    location: 'Falcone Bank Vault — The Triumvirate Pact',
    speaker: 'CAPTAIN JIM GORDON & DA HARVEY DENT',
    caption: '“Three men on a rain-swept roof beside a glowing signal. A pact to bend the rules—without breaking them.”',
    dialogue: 'Harvey Dent (flipping two-headed silver dollar): “Heads we burn Falcone’s ledger tonight, Batman. No more untouchables.”',
    visualNotes: '2.5D Parallax Camera Truck · Stepped Chiaroscuro Rim Lighting on Batman’s 92k-Tri Cowl & Cape',
    accentColor: '#38BDF8',
  },
  {
    id: 'PANEL-03',
    chapter: 'CHAPTER I · NOVEMBER 1 (00:14 AM)',
    dateStamp: 'OCTOBER 31 / NOV 1 · JOHNNY VITI RESIDENCE',
    location: '942 Basin Avenue — First Holiday Crime Scene',
    speaker: 'HOLIDAY KILLER EVIDENCE LOG #01',
    caption: '“Two rounds. .22 caliber. An untraceable pistol with the serial number filed smooth, a rubber baby-bottle nipple taped over the barrel as a makeshift suppressor... and a jack-o’-lantern left on the marble ledge.”',
    dialogue: 'Batman: “Professional execution, yet personal. Whoever pulled this trigger waited specifically for Halloween.”',
    visualNotes: 'Interactive Transition to Live Noir Detective Forensics & Arkham Freeflow Rooftop Pursuit',
    accentColor: '#F43F5E',
  },
];

interface ForensicHotspot {
  id: string;
  label: string;
  xPercent: number;
  yPercent: number;
  category: 'Ballistics' | 'Signature Token' | 'Weaponry' | 'Witness Trace';
  findingTitle: string;
  forensicDetail: string;
  suspectLink: string;
  scanned: boolean;
}

const INITIAL_HOTSPOTS: ForensicHotspot[] = [
  {
    id: 'EV-01',
    label: '.22 Caliber Untraceable Pistol',
    xPercent: 28,
    yPercent: 68,
    category: 'Weaponry',
    findingTitle: 'Filed Serial Number · .22 LR Semi-Automatic',
    forensicDetail:
      'Metallurgical acid-etch scan reveals micro-stamping from a 1984 shipment impounded in Gotham District Court Evidence Locker B—accessible to both Falcone bailiffs and District Attorney staff.',
    suspectLink: 'Harvey Dent / Alberto Falcone / Sal Maroni',
    scanned: false,
  },
  {
    id: 'EV-02',
    label: 'Taped Baby-Bottle Nipple Silencer',
    xPercent: 46,
    yPercent: 54,
    category: 'Ballistics',
    findingTitle: 'Improvised Latex Acoustic Baffle (Sub-82 dB)',
    forensicDetail:
      ' gunshot residue and powder stippling confirm two contact-range shots at 1.1m elevation. Acoustic dampening prevented Falcone bodyguards in the outer hallway from hearing the discharge.',
    suspectLink: 'Holiday Killer Signature MO',
    scanned: false,
  },
  {
    id: 'EV-03',
    label: 'Carved Halloween Jack-O’-Lantern',
    xPercent: 72,
    yPercent: 42,
    category: 'Signature Token',
    findingTitle: 'Holiday Calendar Token #01 (October 31)',
    forensicDetail:
      'Paraffin wax composition matches novelty candles sold in Gotham Chinatown. Calendar Man (Julian Day) profile in Arkham Asylum flags obsessive holiday theatricality.',
    suspectLink: 'Julian Day (Calendar Man Consultation Required)',
    scanned: false,
  },
  {
    id: 'EV-04',
    label: 'Fire Escape Boot Impression & Cat Claw Score',
    xPercent: 81,
    yPercent: 25,
    category: 'Witness Trace',
    findingTitle: 'Size 9.5 Oxford Tread + Whip Anchor Scuff',
    forensicDetail:
      'Two distinct exit vectors on the rain-slicked parapet: the killer descended the east alley fire escape, while Selina Kyle (Catwoman) observed from the upper gargoyle.',
    suspectLink: 'Selina Kyle / Catwoman (Rooftop Pursuit Vector)',
    scanned: false,
  },
];

interface EnemyEntity {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: 'patrol' | 'windup' | 'attacking' | 'stunned' | 'ko';
  windupTimer: number;
  stunTimer: number;
}

export const CloudGamePlayerView: React.FC<CloudGamePlayerViewProps> = ({
  projectTitle,
  cloudStorageProvider,
  founderSteeringHistory,
  onExitToStudio,
}) => {
  const [gameMode, setGameMode] = useState<'cutscene' | 'detective' | 'combat'>('cutscene');
  const [currentPanelIdx, setCurrentPanelIdx] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Detective mode state
  const [detectiveVisionOn, setDetectiveVisionOn] = useState(true);
  const [hotspots, setHotspots] = useState<ForensicHotspot[]>(INITIAL_HOTSPOTS);
  const [selectedHotspot, setSelectedHotspot] = useState<ForensicHotspot>(INITIAL_HOTSPOTS[0]);
  const [deductionComplete, setDeductionComplete] = useState(false);

  // Combat & Freeflow Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [batmanHp, setBatmanHp] = useState(100);
  const [combatLog, setCombatLog] = useState<string>(
    'ARKHAM FREEFLOW v4 READY — Press [J / Click Canvas] Strike · [K] Counter Telegraph · [SPACE] Cape Stun / Evade · [G] Grapnel Boost'
  );
  const [enemiesRemaining, setEnemiesRemaining] = useState(5);

  // Web Audio Noir Synthesizer (Lyria 3 Pro Runtime Stem Emulation)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNoirCue = (type: 'flip' | 'scan' | 'strike' | 'counter' | 'stun' | 'chord') => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'flip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (type === 'scan') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'strike') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'counter') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.16);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'stun' || type === 'chord') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196, now);
        osc.frequency.exponentialRampToValueAtTime(98, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch {
      // Ignore Web Audio restriction
    }
  };

  const handleFlipPanel = (nextIdx: number) => {
    setIsFlipping(true);
    playNoirCue('flip');
    setTimeout(() => {
      setCurrentPanelIdx(nextIdx);
      setIsFlipping(false);
    }, 220);
  };

  const handleScanHotspot = (spot: ForensicHotspot) => {
    playNoirCue('scan');
    const updated = hotspots.map((h) => (h.id === spot.id ? { ...h, scanned: true } : h));
    setHotspots(updated);
    setSelectedHotspot({ ...spot, scanned: true });
    if (updated.every((h) => h.scanned)) {
      setDeductionComplete(true);
    }
  };

  // Interactive 60FPS Cel-Shaded Noir Arkham Freeflow Combat & Rooftop Canvas Loop
  useEffect(() => {
    if (gameMode !== 'combat') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const keys: Record<string, boolean> = {};

    const batman = {
      x: 420,
      y: 250,
      vx: 0,
      vy: 0,
      facing: 1,
      capeSpread: 0,
      attackAnim: 0,
      counterAnim: 0,
      grapnelAnim: 0,
      hp: 100,
      combo: 0,
      bestCombo: 0,
    };

    const enemies: EnemyEntity[] = [
      { id: 1, name: 'Falcone Enforcer #1 (Pipe)', x: 180, y: 180, vx: 0, vy: 0, hp: 100, maxHp: 100, state: 'patrol', windupTimer: 80, stunTimer: 0 },
      { id: 2, name: 'Falcone Enforcer #2 (Tommy Gun)', x: 680, y: 170, vx: 0, vy: 0, hp: 100, maxHp: 100, state: 'patrol', windupTimer: 130, stunTimer: 0 },
      { id: 3, name: 'Maroni Bruiser #3 (Knife)', x: 210, y: 340, vx: 0, vy: 0, hp: 120, maxHp: 120, state: 'patrol', windupTimer: 110, stunTimer: 0 },
      { id: 4, name: 'Roman Bodyguard #4 (Baton)', x: 660, y: 330, vx: 0, vy: 0, hp: 120, maxHp: 120, state: 'patrol', windupTimer: 65, stunTimer: 0 },
      { id: 5, name: 'Holiday Suspect Lookout #5', x: 440, y: 120, vx: 0, vy: 0, hp: 140, maxHp: 140, state: 'patrol', windupTimer: 95, stunTimer: 0 },
    ];

    const raindrops = Array.from({ length: 95 }, () => ({
      x: Math.random() * 880,
      y: Math.random() * 440,
      len: 14 + Math.random() * 14,
      speed: 9 + Math.random() * 6,
    }));

    const triggerFreeflowStrike = () => {
      const alive = enemies.filter((e) => e.state !== 'ko');
      if (alive.length === 0) return;
      alive.sort(
        (a, b) =>
          Math.hypot(a.x - batman.x, a.y - batman.y) -
          Math.hypot(b.x - batman.x, b.y - batman.y)
      );
      const target = alive[0];
      const dist = Math.hypot(target.x - batman.x, target.y - batman.y);
      if (dist < 260) {
        // Freeflow kinetic vault across the rooftop to target
        batman.facing = target.x >= batman.x ? 1 : -1;
        batman.x = target.x - batman.facing * 38;
        batman.y = target.y;
        batman.attackAnim = 16;
        batman.combo += 1;
        batman.bestCombo = Math.max(batman.bestCombo, batman.combo);
        const dmg = 34 + Math.min(batman.combo * 4, 30);
        target.hp = Math.max(0, target.hp - dmg);
        target.vx = batman.facing * 8;
        if (target.hp <= 0) {
          target.state = 'ko';
          setCombatLog(
            `[FREEFLOW KO · ${batman.combo}x COMBO] Eliminated ${target.name} with Inverted Takedown!`
          );
        } else {
          target.state = 'stunned';
          target.stunTimer = 45;
          setCombatLog(
            `[FREEFLOW STRIKE · ${batman.combo}x] Vaulted ${Math.round(dist)}u → Hit ${target.name} (-${dmg} HP)`
          );
        }
        setComboCount(batman.combo);
        setMaxCombo(batman.bestCombo);
        setEnemiesRemaining(enemies.filter((e) => e.state !== 'ko').length);
        playNoirCue('strike');
      }
    };

    const triggerCounter = () => {
      const windingUp = enemies.find(
        (e) => e.state === 'windup' && Math.hypot(e.x - batman.x, e.y - batman.y) < 220
      );
      batman.counterAnim = 18;
      if (windingUp) {
        batman.facing = windingUp.x >= batman.x ? 1 : -1;
        batman.combo += 2;
        batman.bestCombo = Math.max(batman.bestCombo, batman.combo);
        windingUp.hp = Math.max(0, windingUp.hp - 55);
        windingUp.state = windingUp.hp <= 0 ? 'ko' : 'stunned';
        windingUp.stunTimer = 80;
        setComboCount(batman.combo);
        setMaxCombo(batman.bestCombo);
        setEnemiesRemaining(enemies.filter((e) => e.state !== 'ko').length);
        setCombatLog(
          `[LETHAL ARKHAM COUNTER · ${batman.combo}x] Redirected ${windingUp.name}’s attack into bone-crushing throw!`
        );
        playNoirCue('counter');
      } else {
        setCombatLog(`[COUNTER STANCE] Watching enemy silhouettes for lightning telegraph...`);
      }
    };

    const triggerCapeStun = () => {
      batman.capeSpread = 22;
      let stunnedAny = false;
      for (const e of enemies) {
        if (e.state !== 'ko' && Math.hypot(e.x - batman.x, e.y - batman.y) < 175) {
          e.state = 'stunned';
          e.stunTimer = 95;
          stunnedAny = true;
        }
      }
      if (stunnedAny) {
        batman.combo += 1;
        setComboCount(batman.combo);
        setCombatLog(`[ULTRA CAPE STUN · ${batman.combo}x] Tim Sale scalloped cape wave stunned nearby enforcers!`);
      } else {
        batman.x = Math.max(60, Math.min(820, batman.x + batman.facing * 95));
        setCombatLog(`[EVADE ROLL] Batman vaulted across rain-slicked gargoyle parapet.`);
      }
      playNoirCue('stun');
    };

    const triggerGrapnelBoost = () => {
      batman.grapnelAnim = 20;
      batman.x = batman.x < 440 ? 720 : 160;
      batman.y = 140;
      setCombatLog(`[GRAPNEL BOOST Mk.IV] Launched to upper gargoyle vantage point + Cape Glide drop!`);
      playNoirCue('flip');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === 'j') triggerFreeflowStrike();
      if (k === 'k') triggerCounter();
      if (k === ' ') {
        e.preventDefault();
        triggerCapeStun();
      }
      if (k === 'g') triggerGrapnelBoost();
      if (k === 'v') setDetectiveVisionOn((prev) => !prev);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    const onCanvasClick = () => {
      triggerFreeflowStrike();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('click', onCanvasClick);

    const renderFrame = () => {
      const speed = 4.2;
      if (keys['w'] || keys['arrowup']) batman.y = Math.max(95, batman.y - speed);
      if (keys['s'] || keys['arrowdown']) batman.y = Math.min(395, batman.y + speed);
      if (keys['a'] || keys['arrowleft']) {
        batman.x = Math.max(55, batman.x - speed);
        batman.facing = -1;
      }
      if (keys['d'] || keys['arrowright']) {
        batman.x = Math.min(825, batman.x + speed);
        batman.facing = 1;
      }

      if (batman.attackAnim > 0) batman.attackAnim--;
      if (batman.counterAnim > 0) batman.counterAnim--;
      if (batman.capeSpread > 0) batman.capeSpread--;
      if (batman.grapnelAnim > 0) batman.grapnelAnim--;

      // Background: Gothic Gotham Rooftop in Cel-Shaded Noir Chiaroscuro
      ctx.fillStyle = detectiveVisionOn ? '#061326' : '#090C12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Gotham Cathedral & Clocktower Silhouettes
      ctx.fillStyle = detectiveVisionOn ? '#0B2240' : '#111722';
      ctx.fillRect(40, 30, 120, 290);
      ctx.fillRect(240, 55, 95, 265);
      ctx.fillRect(540, 20, 145, 300);
      ctx.fillRect(735, 65, 110, 255);

      // Bat-Signal in Noir Sky
      ctx.save();
      ctx.fillStyle = detectiveVisionOn ? 'rgba(56, 189, 248, 0.14)' : 'rgba(245, 158, 11, 0.14)';
      ctx.beginPath();
      ctx.ellipse(440, 68, 78, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = detectiveVisionOn ? '#38BDF8' : '#F59E0B';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Rooftop Slate Grid with Sumi-Ink Hatching
      ctx.strokeStyle = detectiveVisionOn ? 'rgba(56, 189, 248, 0.18)' : 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 44) {
        ctx.beginPath();
        ctx.moveTo(gx, 90);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }
      for (let gy = 90; gy < canvas.height; gy += 44) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }

      // Update & Draw Enemies with Cel-Shaded Contours & Arkham Counter Lightning Telegraph
      for (const e of enemies) {
        if (e.state === 'ko') {
          ctx.save();
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.fillRect(e.x - 18, e.y + 8, 36, 12);
          ctx.strokeRect(e.x - 18, e.y + 8, 36, 12);
          ctx.restore();
          continue;
        }

        e.x += e.vx;
        e.vx *= 0.82;

        const dx = batman.x - e.x;
        const dy = batman.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (e.state === 'stunned') {
          e.stunTimer--;
          if (e.stunTimer <= 0) e.state = 'patrol';
        } else if (e.state === 'patrol') {
          if (dist > 68) {
            e.x += (dx / dist) * 1.15;
            e.y += (dy / dist) * 1.15;
          }
          e.windupTimer--;
          if (e.windupTimer <= 0 && dist < 165) {
            e.state = 'windup';
            e.windupTimer = 52;
          }
        } else if (e.state === 'windup') {
          e.windupTimer--;
          if (e.windupTimer <= 0) {
            if (dist < 95 && batman.counterAnim === 0) {
              batman.hp = Math.max(15, batman.hp - 8);
              batman.combo = 0;
              setBatmanHp(batman.hp);
              setComboCount(0);
              setCombatLog(`[HIT TAKEN] ${e.name} landed a blow! Press [K] when lightning flashes above enemy head!`);
            }
            e.state = 'patrol';
            e.windupTimer = 95 + Math.floor(Math.random() * 50);
          }
        }

        // Draw Enemy Silhouette (Tim Sale Broad-Shouldered Pinstripe Silhouette)
        ctx.save();
        ctx.fillStyle =
          e.state === 'stunned'
            ? '#38BDF8'
            : e.state === 'windup'
            ? '#F43F5E'
            : detectiveVisionOn
            ? '#0EA5E9'
            : '#1E293B';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(e.x - 16, e.y - 28, 32, 48, 5);
        ctx.fill();
        ctx.stroke();

        // Arkham Counter Telegraph Lightning Icon above head when winding up
        if (e.state === 'windup') {
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(e.x - 8, e.y - 46);
          ctx.lineTo(e.x + 2, e.y - 36);
          ctx.lineTo(e.x - 4, e.y - 36);
          ctx.lineTo(e.x + 8, e.y - 26);
          ctx.stroke();
          ctx.fillStyle = '#FACC15';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('COUNTER [K]!', e.x - 34, e.y - 52);
        }

        // Enemy HP Bar
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(e.x - 20, e.y - 36, 40, 4);
        ctx.fillStyle = e.state === 'windup' ? '#F43F5E' : '#F59E0B';
        ctx.fillRect(e.x - 20, e.y - 36, 40 * (e.hp / e.maxHp), 4);
        ctx.restore();
      }

      // Draw Grapnel Line if active
      if (batman.grapnelAnim > 0) {
        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(batman.x, batman.y - 20);
        ctx.lineTo(440, 20);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Batman (92k-Tri Sourced Hero Silhouette + Tim Sale Long-Eared Cowl & Scalloped Cape)
      ctx.save();
      const capeWidth = 36 + batman.capeSpread * 3.2 + (batman.attackAnim > 0 ? 22 : 0);
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = detectiveVisionOn ? '#38BDF8' : '#F59E0B';
      ctx.lineWidth = 2.2;

      // Scalloped Noir Cape
      ctx.beginPath();
      ctx.moveTo(batman.x, batman.y - 26);
      ctx.lineTo(batman.x - capeWidth, batman.y + 24);
      ctx.lineTo(batman.x - capeWidth * 0.5, batman.y + 16);
      ctx.lineTo(batman.x, batman.y + 28);
      ctx.lineTo(batman.x + capeWidth * 0.5, batman.y + 16);
      ctx.lineTo(batman.x + capeWidth, batman.y + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Armored Torso & Long-Eared Cowl
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(batman.x - 14, batman.y - 24, 28, 42);
      ctx.strokeRect(batman.x - 14, batman.y - 24, 28, 42);

      // Long Halloween Spire Ears
      ctx.beginPath();
      ctx.moveTo(batman.x - 10, batman.y - 24);
      ctx.lineTo(batman.x - 8, batman.y - 48);
      ctx.lineTo(batman.x - 2, batman.y - 24);
      ctx.moveTo(batman.x + 2, batman.y - 24);
      ctx.lineTo(batman.x + 8, batman.y - 48);
      ctx.lineTo(batman.x + 10, batman.y - 24);
      ctx.fillStyle = '#020617';
      ctx.fill();
      ctx.stroke();

      // White Narrowed Detective Eyes
      ctx.fillStyle = detectiveVisionOn ? '#38BDF8' : '#F8FAFC';
      ctx.fillRect(batman.x - 7, batman.y - 20, 5, 2.5);
      ctx.fillRect(batman.x + 2, batman.y - 20, 5, 2.5);
      ctx.restore();

      // Draw Noir Rain Overlay
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.25)';
      ctx.lineWidth = 1;
      for (const r of raindrops) {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 3, r.y + r.len);
        ctx.stroke();
        r.y += r.speed;
        r.x -= 1.5;
        if (r.y > canvas.height) {
          r.y = -15;
          r.x = Math.random() * canvas.width;
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('click', onCanvasClick);
    };
  }, [gameMode, detectiveVisionOn, audioEnabled]);

  const activePanel = LONG_HALLOWEEN_PANELS[currentPanelIdx];

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col">
      {/* Top Cloud Streaming HUD Bar */}
      <header className="px-6 py-3.5 border-b border-slate-800 bg-[#0B0F17]/95 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            WEBRTC CLOUD STREAM ACTIVE · 60 FPS · ZERO THREE.JS
          </span>
          <h1 className="text-base sm:text-lg font-bold text-slate-100 font-display">
            {projectTitle}
          </h1>
          <span className="hidden xl:inline text-xs font-mono text-slate-400">
            Storage: {cloudStorageProvider} (92% Pre-Warmed Pakchunk Cache)
          </span>
        </div>

        {/* Instant Gameplay Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGameMode('cutscene')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              gameMode === 'cutscene'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            1. 2.5D Comic Cutscenes
          </button>
          <button
            type="button"
            onClick={() => setGameMode('detective')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              gameMode === 'detective'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            2. Noir Detective Crime Scene
          </button>
          <button
            type="button"
            onClick={() => setGameMode('combat')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              gameMode === 'combat'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            3. Arkham Freeflow Rooftop Combat
          </button>

          <button
            type="button"
            onClick={() => setAudioEnabled((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Lyria Audio ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Enable Audio</span>
              </>
            )}
          </button>

          {onExitToStudio && (
            <button
              type="button"
              onClick={onExitToStudio}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              ← Return to Studio Orchestrator
            </button>
          )}
        </div>
      </header>

      {/* Active Founder Steering Directives Applied to Runtime */}
      {founderSteeringHistory.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 text-xs font-mono text-amber-200 flex items-center justify-between gap-4">
          <div>
            <strong>FOUNDER STEERING APPLIED TO BUILD:</strong>{' '}
            {founderSteeringHistory[founderSteeringHistory.length - 1]}
          </div>
          <span className="shrink-0 text-amber-400">
            {founderSteeringHistory.length} Custom Directive(s) Compiled
          </span>
        </div>
      )}

      {/* Main Interactive Game Viewport */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto p-6 flex flex-col justify-center">
        {/* MODE 1: 2.5D FLIPPING COMIC-PANEL CUTSCENE PLAYER */}
        {gameMode === 'cutscene' && (
          <div className="border-2 border-slate-800 bg-[#0B0F17] rounded-xl p-6 space-y-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-mono text-amber-400">
                  2.5D PARALLAX COMIC-PANEL CUTSCENE ENGINE · TIM SALE HIGH-CONTRAST CHIAROSCURO (ZERO AI SLOP)
                </div>
                <h2 className="text-xl font-bold text-slate-100 mt-0.5 font-display">
                  {activePanel.chapter} — {activePanel.location}
                </h2>
              </div>
              <div className="text-xs font-mono text-slate-400">
                PANEL {currentPanelIdx + 1} OF {LONG_HALLOWEEN_PANELS.length}
              </div>
            </div>

            <div
              className={`relative rounded-xl border-2 border-slate-200/80 bg-[#05070B] p-8 min-h-[340px] flex flex-col justify-between transition-all duration-200 ${
                isFlipping ? 'scale-95 opacity-40 -rotate-1' : 'scale-100 opacity-100 rotate-0'
              }`}
            >
              {/* Top Noir Caption Box (Yellow/Amber Graphic Novel Caption Box) */}
              <div className="max-w-2xl bg-amber-300 text-slate-950 p-4 border-2 border-slate-950 shadow-lg font-serif italic text-sm sm:text-base leading-relaxed">
                <div className="text-[11px] font-mono not-italic font-bold uppercase tracking-wider text-slate-800 mb-1">
                  {activePanel.dateStamp} · {activePanel.speaker}
                </div>
                {activePanel.caption}
              </div>

              {/* Center Stylized Noir Silhouette Graphic */}
              <div className="my-6 py-6 border-y border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="text-xs font-mono text-amber-400 uppercase">
                    2.5D Multi-Plane Layer Stack
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-slate-100 leading-snug font-display">
                    {activePanel.dialogue}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 max-w-sm">
                  <div className="text-amber-400 font-semibold mb-1">SHADER & RIG TELEMETRY:</div>
                  {activePanel.visualNotes}
                </div>
              </div>

              {/* Bottom Panel Flip Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {LONG_HALLOWEEN_PANELS.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleFlipPanel(idx)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-semibold cursor-pointer ${
                        idx === currentPanelIdx
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {currentPanelIdx < LONG_HALLOWEEN_PANELS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => handleFlipPanel(currentPanelIdx + 1)}
                      className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Flip to Next Comic Panel →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGameMode('detective')}
                      className="px-5 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Enter Live Crime Scene Investigation (Batman Sole Playable) →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: NOIR DETECTIVE CRIME-SCENE FORENSICS & CASEBOARD */}
        {gameMode === 'detective' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Interactive Crime Scene Viewport */}
            <div className="lg:col-span-7 border border-slate-800 bg-[#0B0F17] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-sky-400">
                    COWL DETECTIVE VISION Mk.IV · HOLIDAY CRIME SCENE #01 (JOHNNY VITI)
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 font-display">
                    Click Evidence Markers to Reconstruct the Holiday Execution
                  </h2>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/40">
                  {hotspots.filter((h) => h.scanned).length} / {hotspots.length} Clues Analyzed
                </span>
              </div>

              <div className="relative h-[360px] rounded-xl border border-sky-500/40 bg-gradient-to-b from-[#071529] to-[#040911] overflow-hidden p-4">
                {/* Forensic Grid Lines */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:36px_36px]" />

                {/* Ballistic Laser Trajectory Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line
                    x1="28%"
                    y1="68%"
                    x2="46%"
                    y2="54%"
                    stroke="#F43F5E"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <line
                    x1="46%"
                    y1="54%"
                    x2="72%"
                    y2="42%"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>

                {hotspots.map((spot) => {
                  const isSelected = selectedHotspot.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => handleScanHotspot(spot)}
                      style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        spot.scanned
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : isSelected
                          ? 'bg-amber-400 text-slate-950 border-white scale-105'
                          : 'bg-sky-500/20 border-sky-400 text-sky-200 hover:scale-105'
                      }`}
                    >
                      [{spot.id}] {spot.label} {spot.scanned ? '✓' : ''}
                    </button>
                  );
                })}

                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-sky-300/80">
                  <span>MODEL: CHR-BAT-001 (92,400 TRIS · CEL-SHADED CHIAROSCURO)</span>
                  <span>BALLISTICS RECONSTRUCTION: .22 LR SUBSONIC</span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Caseboard Deduction & Transition to Rooftop Combat */}
            <div className="lg:col-span-5 border border-slate-800 bg-[#0B0F17] rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="text-xs font-mono text-amber-400">
                  THE LONG HALLOWEEN CASEBOARD · FORENSIC DEDUCTION
                </div>
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-sky-400">
                    {selectedHotspot.id} · {selectedHotspot.category.toUpperCase()}
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    {selectedHotspot.findingTitle}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedHotspot.forensicDetail}
                  </p>
                  <div className="pt-2 text-xs font-mono text-amber-300">
                    Suspect Correlation: {selectedHotspot.suspectLink}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono text-slate-400">
                    EVIDENCE CHECKLIST ({hotspots.filter((h) => h.scanned).length}/4):
                  </div>
                  {hotspots.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleScanHotspot(h)}
                      className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs cursor-pointer hover:border-slate-700"
                    >
                      <span className="font-mono text-slate-200">
                        {h.id} · {h.label}
                      </span>
                      <span
                        className={`font-mono ${
                          h.scanned ? 'text-emerald-400 font-bold' : 'text-amber-400'
                        }`}
                      >
                        {h.scanned ? 'ANALYZED ✓' : 'CLICK TO SCAN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {deductionComplete
                    ? 'Caseboard Complete! Falcone Enforcers detected on rooftop!'
                    : 'Scan clues or jump straight to rooftop combat:'}
                </span>
                <button
                  type="button"
                  onClick={() => setGameMode('combat')}
                  className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
                >
                  Launch Arkham Freeflow Combat →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: PLAYABLE ARKHAM FREEFLOW v4 COMBAT & ROOFTOP TRAVERSAL */}
        {gameMode === 'combat' && (
          <div className="border border-slate-800 bg-[#0B0F17] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-amber-400">
                  ARKHAM FREEFLOW v4 COMBAT & PREDATOR ROOFTOP SANDBOX · CEL-SHADED CHIAROSCURO SHADER
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">{combatLog}</div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
                  COMBO: <strong className="text-amber-400 text-sm">{comboCount}x</strong> (Best:{' '}
                  {maxCombo}x)
                </div>
                <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
                  ARMOR: <strong className="text-emerald-400 text-sm">{batmanHp}%</strong>
                </div>
                <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
                  HOSTILES: <strong className="text-rose-400 text-sm">{enemiesRemaining}</strong>
                </div>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border-2 border-slate-800 bg-[#05070B] flex justify-center">
              <canvas
                ref={canvasRef}
                width={880}
                height={440}
                className="w-full max-w-[880px] h-[440px] cursor-crosshair block"
              />
            </div>

            {/* Interactive Controls Bar (Works with Keyboard OR Mouse Clicks) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs font-mono text-slate-400">
                Move: <code className="text-slate-200">WASD / Arrows</code> · Strike:{' '}
                <code className="text-amber-300">J or Click Canvas</code> · Counter:{' '}
                <code className="text-amber-300">K</code> · Cape Stun / Evade:{' '}
                <code className="text-amber-300">Space</code> · Grapnel Boost:{' '}
                <code className="text-amber-300">G</code> · Detective Vision:{' '}
                <code className="text-sky-300">V</code>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }))
                  }
                  className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Freeflow Strike [J]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
                  }
                  className="px-3 py-1.5 rounded bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Counter [K]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
                  }
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cape Stun [Space]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))
                  }
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Grapnel Boost [G]
                </button>
                <button
                  type="button"
                  onClick={() => setDetectiveVisionOn((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 border border-sky-500/40 text-sky-300 text-xs font-mono cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Detective Vision
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
