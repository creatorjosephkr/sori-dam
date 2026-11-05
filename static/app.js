'use strict';


// ── YouTube Iframe API ────────────────────────────────────────────────────────
let ytIframePlayerInstance = null;
let ytProgressInterval = null;

function initYoutubeApi() {
  if (window.YT) return;
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// 초기화 호출
initYoutubeApi();

window.onYouTubeIframeAPIReady = function() {
  console.log("[Sori-Dam] YouTube Iframe API Ready!");
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const ico = {
  play:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6,3 20,12 6,21"/></svg>`,
  pause:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>`,
  download: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>`,
  bookmark: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  trash:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>`,
  pencil:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`,
  copy:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  chevron:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`,
  text:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="13" y2="17"/></svg>`,
};

// ── State ─────────────────────────────────────────────────────────────────────
const S = {
  tab: 'basic',
  basicVoices: [],
  myVoices: [],
  outputs: [],
  currentOutput: null,
  voiceGenderTab: 'all',
};

const expandedOutputs = new Set();
const subtitleStates  = new Map(); // id → { active: bool, width: number }

function toSubtitleFormat(text, width) {
  const w = Math.max(1, parseInt(width) || 20);
  const lines = [];
  for (let i = 0; i < text.length; i += w) lines.push(text.slice(i, i + w));
  return lines.join('\n');
}

const selectedHistoryIds = new Set();

function drawWaveform(canvas, peaks, pct = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Get current layout dimensions
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 100;
  const height = rect.height || canvas.height || 26;

  // Sync canvas pixel store with display resolution for crisp lines
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!peaks || peaks.length === 0) return;

  const numBars = peaks.length;
  const centerY = canvasHeight / 2;

  // 1.5px gap in CSS pixels scaled to Retina backing store
  const gap = 1.5 * dpr;
  const totalGaps = (numBars - 1) * gap;
  // Calculate dynamic barWidth so it fills the canvas beautifully without overflow
  const barWidth = Math.max(1 * dpr, (canvasWidth - totalGaps) / numBars);

  const activeCount = Math.round((pct / 100) * numBars);

  // Fetch CSS variables directly to preserve dark/light theme adaptability!
  const computedStyle = getComputedStyle(document.documentElement);
  const activeColor = computedStyle.getPropertyValue('--accent').trim() || '#0071e3';
  const unplayedColor = computedStyle.getPropertyValue('--border-light').trim() || '#e5e5ea';

  ctx.lineCap = 'round';
  ctx.lineWidth = barWidth;

  for (let i = 0; i < numBars; i++) {
    const x = i * (barWidth + gap) + barWidth / 2;
    const p = peaks[i];

    // Silent portions are represented by beautiful small dots of 4px height
    const minH = 4 * dpr;
    const barHeight = Math.max(minH, p * (canvasHeight - 4 * dpr));

    ctx.beginPath();
    ctx.moveTo(x, centerY - barHeight / 2);
    ctx.lineTo(x, centerY + barHeight / 2);

    ctx.strokeStyle = i < activeCount ? activeColor : unplayedColor;
    ctx.stroke();
  }
}

function updateHistorySelectionUI() {
  const selectAll = document.getElementById('selectAllCheckbox');
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const actionBar = document.getElementById('historyActionBar');
  
  if (S.outputs.length === 0) {
    if (actionBar) actionBar.style.display = 'none';
    return;
  }
  
  if (actionBar) actionBar.style.display = 'flex';
  
  if (selectAll) {
    selectAll.checked = selectedHistoryIds.size === S.outputs.length && S.outputs.length > 0;
  }
  
  if (deleteBtn) {
    deleteBtn.disabled = selectedHistoryIds.size === 0;
    deleteBtn.textContent = `${t('history.deleteSelected')} (${selectedHistoryIds.size}개)`;
  }
}

async function getWaveformData(url, numBars = 80) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(buffer);
    const rawData = audioBuffer.getChannelData(0);
    const samples = rawData.length;
    const blockSize = Math.floor(samples / numBars);
    const peaks = [];
    
    for (let i = 0; i < numBars; i++) {
      let start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j]);
      }
      peaks.push(sum / blockSize);
    }
    
    const maxVal = Math.max(...peaks);
    if (maxVal > 0) {
      return peaks.map(p => p / maxVal);
    }
    return new Array(numBars).fill(0.1);
  } catch (e) {
    console.error("오디오 파형 디코딩 실패:", e);
    // 폴백 기본 파형 반환
    return [0.1, 0.2, 0.3, 0.25, 0.15, 0.3, 0.5, 0.65, 0.5, 0.35, 0.4, 0.5, 0.35, 0.2, 0.3, 0.45, 0.6, 0.75, 0.55, 0.3, 0.4, 0.5, 0.35, 0.2, 0.3, 0.35, 0.25, 0.1];
  }
}

// ── Audio Player ──────────────────────────────────────────────────────────────
const player = {
  el: null,
  playing: false,

  init() {
    this.el = document.getElementById('mainAudio');
    this.el.addEventListener('timeupdate', () => player.onTick());
    this.el.addEventListener('loadedmetadata', () => player.onMeta());
    this.el.addEventListener('ended', () => player.onEnd());
    this.el.addEventListener('play', () => player.setPlayIcon(true));
    this.el.addEventListener('pause', () => player.setPlayIcon(false));

    document.getElementById('playBtn').addEventListener('click', () => player.toggle());

    const seek = document.getElementById('seekBar');
    seek.addEventListener('input', () => {
      if (player.el.duration) {
        const pct = seek.value;
        player.el.currentTime = player.el.duration * (pct / 100);
        const canvas = document.getElementById('main-wv-player');
        if (canvas) {
          drawWaveform(canvas, player.peaks, pct);
        }
      }
    });
  },

  load(url, autoplay = true) {
    this.el.pause();
    this.el.src = url;
    this.el.load();
    document.getElementById('seekBar').value = 0;

    // 실제 음성 데이터 디코딩 후 세로형 아날로그 파형 그리기
    getWaveformData(url, 100).then(peaks => {
      this.peaks = peaks;
      const canvas = document.getElementById('main-wv-player');
      if (canvas) {
        drawWaveform(canvas, peaks, 0);
      }
    });

    if (autoplay) this.el.play().catch(() => {});
  },

  toggle() {
    if (this.el.paused) this.el.play();
    else this.el.pause();
  },

  onTick() {
    if (!this.el.duration) return;
    const pct = (this.el.currentTime / this.el.duration) * 100;
    document.getElementById('seekBar').value = pct;
    document.getElementById('currentTime').textContent = fmtTime(this.el.currentTime);
    const canvas = document.getElementById('main-wv-player');
    if (canvas) {
      drawWaveform(canvas, this.peaks, pct);
    }
  },

  onMeta() {
    document.getElementById('totalTime').textContent = fmtTime(this.el.duration);
  },

  onEnd() {
    document.getElementById('seekBar').value = 0;
    document.getElementById('currentTime').textContent = '0:00';
    this.setPlayIcon(false);
    const canvas = document.getElementById('main-wv-player');
    if (canvas) {
      drawWaveform(canvas, this.peaks, 0);
    }
  },

  setPlayIcon(playing) {
    const icon = document.getElementById('playIcon');
    if (playing) {
      icon.setAttribute('d', 'M6 4h4v16H6V4zm8 0h4v16h-4V4z');
    } else {
      icon.setAttribute('d', 'M6 3l14 9-14 9V3z');
    }
  },
};

// ── History Audio Player (Inline) ─────────────────────────────────────────────
const historyPlayer = {
  el: null,
  activeId: null,
  peaksMap: new Map(),

  init() {
    this.el = new Audio();
    this.el.addEventListener('timeupdate', () => this.onTick());
    this.el.addEventListener('loadedmetadata', () => this.onMeta());
    this.el.addEventListener('ended', () => this.onEnd());
    this.el.addEventListener('play', () => this.onPlayPause(true));
    this.el.addEventListener('pause', () => this.onPlayPause(false));
  },

  play(id, url) {
    const sid = String(id);
    // 1. 이미 재생 중인 아이템을 클릭했을 경우
    if (this.activeId === sid) {
      if (this.el.paused) {
        this.el.play().catch(() => {});
      } else {
        this.el.pause();
      }
      return;
    }

    // 2. 다른 아이템이 재생 중이었다면 기존 UI 복구 및 초기화
    if (this.activeId) {
      this.resetActiveUI(this.activeId);
    }

    // 메인 오디오 재생 중이면 일시 정지
    if (player.el && !player.el.paused) {
      player.el.pause();
    }

    this.activeId = sid;

    // 인라인 플레이어 UI 동적 생성 및 노출
    const container = document.getElementById(`oip-${sid}`);
    if (container) {
      container.innerHTML = `
        <div class="inline-player-box">
          <div class="inline-player-controls">
            <button class="inline-play-circle" id="ipc-${sid}" aria-label="재생/일시정지">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path id="ipi-${sid}" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
            <div class="inline-player-progress">
              <div class="waveform-seek-container">
                <canvas class="waveform-visual" id="history-wv-${sid}"></canvas>
                <input type="range" id="isb-${sid}" class="inline-seek-bar" min="0" max="100" value="0" step="0.1">
              </div>
              <div class="inline-player-times">
                <span id="ict-${sid}">0:00</span>
                <span id="itt-${sid}">0:00</span>
              </div>
            </div>
          </div>
        </div>
      `;
      container.hidden = false;

      // 실제 음성 데이터 디코딩 후 인라인 둥근 기둥 파형 그리기
      getWaveformData(url, 75).then(peaks => {
        this.peaksMap.set(sid, peaks);
        const canvas = document.getElementById(`history-wv-${sid}`);
        if (canvas) {
          drawWaveform(canvas, peaks, 0);
        }
        const pct = (this.el.currentTime / this.el.duration) * 100 || 0;
        if (canvas) {
          drawWaveform(canvas, peaks, pct);
        }
      });

      // 탐색(Seek) 리스너 바인딩
      const seek = container.querySelector('.inline-seek-bar');
      seek.addEventListener('input', () => {
        this.seek(sid, seek.value);
      });

      // 재생/일시정지 서클 버튼 리스너 바인딩
      const circleBtn = container.querySelector('.inline-play-circle');
      circleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.play(sid, url);
      });
    }

    this.el.src = url;
    this.el.load();
    this.el.play().catch(() => {});
  },

  onTick() {
    if (!this.activeId || !this.el.duration) return;
    const pct = (this.el.currentTime / this.el.duration) * 100;
    const seek = document.getElementById(`isb-${this.activeId}`);
    if (seek) seek.value = pct;
    const currTime = document.getElementById(`ict-${this.activeId}`);
    if (currTime) currTime.textContent = fmtTime(this.el.currentTime);
    
    const canvas = document.getElementById(`history-wv-${this.activeId}`);
    const peaks = this.peaksMap.get(this.activeId);
    if (canvas && peaks) {
      drawWaveform(canvas, peaks, pct);
    }
  },

  onMeta() {
    if (!this.activeId) return;
    const totTime = document.getElementById(`itt-${this.activeId}`);
    if (totTime) totTime.textContent = fmtTime(this.el.duration);
  },

  onEnd() {
    if (!this.activeId) return;
    const seek = document.getElementById(`isb-${this.activeId}`);
    if (seek) seek.value = 0;
    const currTime = document.getElementById(`ict-${this.activeId}`);
    if (currTime) currTime.textContent = '0:00';
    
    const canvas = document.getElementById(`history-wv-${this.activeId}`);
    const peaks = this.peaksMap.get(this.activeId);
    if (canvas && peaks) {
      drawWaveform(canvas, peaks, 0);
    }
    this.onPlayPause(false);
  },

  onPlayPause(isPlaying) {
    if (!this.activeId) return;
    
    // 1. 목록 버튼 상태 변경
    const btn = document.querySelector(`.output-item[data-id="${this.activeId}"] [data-oa="play"]`);
    if (btn) {
      if (isPlaying) {
        btn.innerHTML = `${ico.pause} 일시정지`;
        btn.classList.add('btn-primary');
      } else {
        btn.innerHTML = `${ico.play} 재생`;
        btn.classList.remove('btn-primary');
      }
    }

    // 2. 인라인 원형 버튼 아이콘 변경
    const icon = document.getElementById(`ipi-${this.activeId}`);
    if (icon) {
      if (isPlaying) {
        icon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'); // Pause path
      } else {
        icon.setAttribute('d', 'M6 3l14 9-14 9V3z'); // Play path
      }
    }
  },

  seek(id, pct) {
    const sid = String(id);
    if (this.activeId === sid && this.el.duration) {
      this.el.currentTime = this.el.duration * (pct / 100);
      const canvas = document.getElementById(`history-wv-${sid}`);
      const peaks = this.peaksMap.get(sid);
      if (canvas && peaks) {
        drawWaveform(canvas, peaks, pct);
      }
    }
  },

  resetActiveUI(id) {
    const sid = String(id);
    const container = document.getElementById(`oip-${sid}`);
    if (container) {
      container.hidden = true;
      container.innerHTML = '';
    }
    const btn = document.querySelector(`.output-item[data-id="${sid}"] [data-oa="play"]`);
    if (btn) {
      btn.innerHTML = `${ico.play} 재생`;
      btn.classList.remove('btn-primary');
    }
  }
};

// ── My Voice Audio Player (Inline) ─────────────────────────────────────────────
const myVoicePlayer = {
  el: null,
  activeId: null,
  peaksMap: new Map(),

  init() {
    this.el = new Audio();
    this.el.addEventListener('timeupdate', () => this.onTick());
    this.el.addEventListener('loadedmetadata', () => this.onMeta());
    this.el.addEventListener('ended', () => this.onEnd());
    this.el.addEventListener('play', () => this.onPlayPause(true));
    this.el.addEventListener('pause', () => this.onPlayPause(false));
  },

  play(id, url) {
    const sid = String(id);
    
    // 텍스트 필드 조회
    const input = document.querySelector(`.voice-preview-input[data-id="${sid}"]`);
    const text = input ? input.value.trim() : '';

    // 만약 이미 재생 중인 activeId이고 텍스트도 이전과 똑같다면 -> 단순 play/pause 토글 처리
    if (this.activeId === sid && (this.lastTextMap?.get(sid) || '') === text) {
      if (this.el.paused) {
        this.el.play().catch(() => {});
      } else {
        this.el.pause();
      }
      return;
    }

    // 다른 아이템이 재생 중이었다면 기존 UI 복구 및 초기화
    if (this.activeId) {
      this.resetActiveUI(this.activeId);
    }

    // 다른 플레이어 정지
    if (player.el && !player.el.paused) player.el.pause();
    if (historyPlayer.el && !historyPlayer.el.paused) historyPlayer.el.pause();

    this.activeId = sid;
    if (!this.lastTextMap) this.lastTextMap = new Map();

    const voice = S.myVoices.find(v => String(v.id) === sid);
    
    // 텍스트가 비어 있는 경우 -> 원래의 오리지널 음성 재생
    if (!text) {
      this.lastTextMap.set(sid, '');
      const originalUrl = (voice && voice.original_audio_url) ? voice.original_audio_url : url;
      this.activeUrl = originalUrl;
      this.loadAndPlay(sid, originalUrl);
      return;
    }

    // 텍스트가 입력되어 있는 경우 -> 실시간 합성 및 재생
    this.lastTextMap.set(sid, text);
    
    // UI에 실시간 합성 로딩 상태 보여주기
    const btn = document.querySelector(`.voice-item-card[data-id="${sid}"] .inline-play-btn`);
    const txt = document.getElementById(`ipt-my-${sid}`);
    
    if (btn) btn.disabled = true;
    if (txt) txt.textContent = t('voice.synthesizing') || '합성 중...';
    
    // 백엔드 음성 합성 시작
    const fd = new FormData();
    fd.append('text', text);
    fd.append('voice_type', 'my');
    fd.append('my_voice_id', sid);
    fd.append('style', voice ? voice.style || '' : '');
    fd.append('cfg_value', voice ? voice.cfg_value || 2.0 : 2.0);
    fd.append('steps', voice ? voice.steps || 10 : 10);
    fd.append('target_db', voice ? voice.target_db || -6.0 : -6.0);
    fd.append('speed', voice ? voice.speed || 1.0 : 1.0);
    
    api('POST', '/api/generate', fd).then(result => {
      if (btn) btn.disabled = false;
      this.activeUrl = result.audio_url;
      this.loadAndPlay(sid, result.audio_url);
    }).catch(err => {
      if (btn) btn.disabled = false;
      if (txt) txt.textContent = t('voice.play');
      this.lastTextMap.delete(sid);
      toast('실시간 음성 합성 실패: ' + err.message, 'error');
    });
  },

  loadAndPlay(sid, audioUrl) {
    const container = document.getElementById(`vip-${sid}`);
    if (container) {
      container.innerHTML = `
        <div class="inline-player-box" style="margin-top: 8px; margin-bottom: 8px;">
          <div class="inline-player-controls">
            <button class="inline-play-circle" id="vpc-my-${sid}" aria-label="재생/일시정지">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path id="ipp-my-${sid}" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
            <div class="inline-player-progress">
              <div class="waveform-seek-container">
                <canvas class="waveform-visual" id="myvoice-wv-${sid}"></canvas>
                <input type="range" id="isb-my-${sid}" class="inline-seek-bar" min="0" max="100" value="0" step="0.1">
              </div>
              <div class="inline-player-times">
                <span id="ict-my-${sid}">0:00</span>
                <span id="itt-my-${sid}">0:00</span>
              </div>
            </div>
          </div>
        </div>
      `;
      container.hidden = false;

      // 실제 음성 데이터 디코딩 후 인라인 둥근 기둥 파형 그리기
      getWaveformData(audioUrl, 75).then(peaks => {
        this.peaksMap.set(sid, peaks);
        const canvas = document.getElementById(`myvoice-wv-${sid}`);
        if (canvas) {
          drawWaveform(canvas, peaks, 0);
        }
        const pct = (this.el.currentTime / this.el.duration) * 100 || 0;
        if (canvas) {
          drawWaveform(canvas, peaks, pct);
        }
      });

      // 탐색 리스너 바인딩
      const seek = container.querySelector('.inline-seek-bar');
      seek.addEventListener('input', () => {
        this.seek(sid, seek.value);
      });

      // 재생/일시정지 서클 버튼 리스너 바인딩
      const circleBtn = container.querySelector('.inline-play-circle');
      circleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.play(sid, audioUrl);
      });
    }

    this.el.src = audioUrl;
    this.el.load();
    this.el.play().catch(() => {});
  },

  onTick() {
    if (!this.activeId || !this.el.duration) return;
    const pct = (this.el.currentTime / this.el.duration) * 100;
    const seek = document.getElementById(`isb-my-${this.activeId}`);
    if (seek) seek.value = pct;
    const currTime = document.getElementById(`ict-my-${this.activeId}`);
    if (currTime) currTime.textContent = fmtTime(this.el.currentTime);
    
    const canvas = document.getElementById(`myvoice-wv-${this.activeId}`);
    const peaks = this.peaksMap.get(this.activeId);
    if (canvas && peaks) {
      drawWaveform(canvas, peaks, pct);
    }
  },

  onMeta() {
    if (!this.activeId) return;
    const totTime = document.getElementById(`itt-my-${this.activeId}`);
    if (totTime) totTime.textContent = fmtTime(this.el.duration);
  },

  onEnd() {
    if (!this.activeId) return;
    const seek = document.getElementById(`isb-my-${this.activeId}`);
    if (seek) seek.value = 0;
    const currTime = document.getElementById(`ict-my-${this.activeId}`);
    if (currTime) currTime.textContent = '0:00';
    
    const canvas = document.getElementById(`myvoice-wv-${this.activeId}`);
    const peaks = this.peaksMap.get(this.activeId);
    if (canvas && peaks) {
      drawWaveform(canvas, peaks, 0);
    }
    this.onPlayPause(false);
  },

  onPlayPause(isPlaying) {
    if (!this.activeId) return;
    
    // 1. 목록 버튼 상태 변경
    const btn = document.querySelector(`.voice-item-card[data-id="${this.activeId}"] [data-va="play"]`);
    if (btn) {
      const txt = document.getElementById(`ipt-my-${this.activeId}`);
      const icon = document.getElementById(`ipi-my-${this.activeId}`);
      if (isPlaying) {
        if (txt) txt.textContent = t('voice.pause');
        if (icon) icon.innerHTML = ico.pause;
        btn.classList.add('btn-primary');
      } else {
        if (txt) txt.textContent = t('voice.play');
        if (icon) icon.innerHTML = ico.play;
        btn.classList.remove('btn-primary');
      }
    }

    // 2. 인라인 원형 버튼 아이콘 변경
    const path = document.getElementById(`ipp-my-${this.activeId}`);
    if (path) {
      if (isPlaying) {
        path.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'); // Pause path
      } else {
        path.setAttribute('d', 'M6 3l14 9-14 9V3z'); // Play path
      }
    }
  },

  seek(id, pct) {
    const sid = String(id);
    if (this.activeId === sid && this.el.duration) {
      this.el.currentTime = this.el.duration * (pct / 100);
      const canvas = document.getElementById(`myvoice-wv-${sid}`);
      const peaks = this.peaksMap.get(sid);
      if (canvas && peaks) {
        drawWaveform(canvas, peaks, pct);
      }
    }
  },

  resetActiveUI(id) {
    const sid = String(id);
    const container = document.getElementById(`vip-${sid}`);
    if (container) {
      container.hidden = true;
      container.innerHTML = '';
    }
    const btn = document.querySelector(`.voice-item[data-id="${sid}"] [data-va="play"]`);
    if (btn) {
      btn.innerHTML = `${ico.play} 재생`;
      btn.classList.remove('btn-primary');
    }
  }
};

// ── API ───────────────────────────────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method };
  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.body = JSON.stringify(body);
      opts.headers = {
        'Content-Type': 'application/json'
      };
    }
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `오류 (${res.status})`);
  }
  return res.json();
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function loadAll() {
  [S.basicVoices, S.myVoices, S.outputs] = await Promise.all([
    api('GET', '/api/basic-voices'),
    api('GET', '/api/voices'),
    api('GET', '/api/outputs'),
  ]);
  if (S.myVoices) {
    S.myVoices.forEach(v => {
      v.preview_text = '';
    });
  }
}

async function refreshMyVoices() {
  S.myVoices = await api('GET', '/api/voices');
  if (S.myVoices) {
    S.myVoices.forEach(v => {
      v.preview_text = '';
    });
  }
}

async function refreshOutputs() {
  S.outputs = await api('GET', '/api/outputs');
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderVoiceSelect() {
  const sel = document.getElementById('voiceSelect');
  if (!sel) return;
  sel.innerHTML = '';

  const addOpt = (val, label, disabled) => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label;
    if (disabled) o.disabled = true;
    sel.appendChild(o);
  };

  // 기본 음성은 id 기반으로 번역된 이름 사용
  const addGroup = (label, voices, valKey, nameKey, useIdTranslation) => {
    if (!voices.length) return;
    const grp = document.createElement('optgroup');
    grp.label = label;
    voices.forEach(v => {
      const o = document.createElement('option');
      o.value = v[valKey];
      o.textContent = useIdTranslation
        ? (t('voice.name.' + v[valKey]) || v[nameKey])
        : v[nameKey];
      grp.appendChild(o);
    });
    sel.appendChild(grp);
  };

  if (S.tab === 'basic') {
    addOpt('', t('create.voiceNone'), false);
    sel.value = '';
    addGroup(t('voice.group.female'), S.basicVoices.filter(v => v.gender === '여성'), 'id', 'name', true);
    addGroup(t('voice.group.male'), S.basicVoices.filter(v => v.gender === '남성'), 'id', 'name', true);
  } else {
    if (S.myVoices.length === 0) {
      addOpt('', t('create.noVoice'), true);
    } else {
      addOpt('', t('create.voicePlaceholder'), true);
      const myVoices      = S.myVoices.filter(v => v.voice_type === 'my_voice');
      const femaleActors  = S.myVoices.filter(v => v.voice_type === 'female_actor' || (v.voice_type === 'upload' && v.gender === '여성'));
      const maleActors    = S.myVoices.filter(v => v.voice_type === 'male_actor'   || (v.voice_type === 'upload' && v.gender === '남성'));
      addGroup(t('voice.group.my'), myVoices,     'id', 'name', false);
      addGroup(t('voice.group.femaleActor'), femaleActors, 'id', 'name', false);
      addGroup(t('voice.group.maleActor'), maleActors,   'id', 'name', false);
    }
  }
}

function renderMyVoices() {
  const activeTypeTab = document.querySelector('#voiceTypeTabControl .segment-btn.active')?.dataset.voiceTypeTab || 'my_voice';
  const el = document.getElementById('myVoicesList');
  if (!el) return;

  let filteredVoices = [];
  if (activeTypeTab === 'my_voice') {
    filteredVoices = S.myVoices.filter(v => v.voice_type === 'my_voice');
  } else if (activeTypeTab === 'female_actor') {
    filteredVoices = S.myVoices.filter(v => v.voice_type === 'female_actor' || (v.voice_type === 'upload' && v.gender === '여성'));
  } else if (activeTypeTab === 'male_actor') {
    filteredVoices = S.myVoices.filter(v => v.voice_type === 'male_actor' || (v.voice_type === 'upload' && v.gender === '남성'));
  }

  if (filteredVoices.length === 0) {
    let emptyMsg = '';
    if (activeTypeTab === 'my_voice') {
      emptyMsg = `<p style="font-weight: 500; margin-bottom: 4px;">${t('voices.emptyMy')}</p><p style="font-size: 12.5px; opacity: 0.75;">${t('voices.emptyMyDesc')}</p>`;
    } else if (activeTypeTab === 'female_actor') {
      emptyMsg = `<p style="font-weight: 500; margin-bottom: 4px;">${t('voices.emptyFemale')}</p><p style="font-size: 12.5px; opacity: 0.75;">${t('voices.emptyFemaleDesc')}</p>`;
    } else {
      emptyMsg = `<p style="font-weight: 500; margin-bottom: 4px;">${t('voices.emptyMale')}</p><p style="font-size: 12.5px; opacity: 0.75;">${t('voices.emptyMaleDesc')}</p>`;
    }
    el.innerHTML = `
      <div class="empty-state" style="padding: 40px 0; text-align: center; color: var(--text-secondary);">
        ${emptyMsg}
      </div>`;
    return;
  }

  el.innerHTML = filteredVoices.map(v => {
    const pt = v.preview_text || '';
    const style = v.style || '';
    return `
    <div class="voice-item-card" data-id="${v.id}" style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
      <div class="voice-row-top" style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          <span class="badge ${v.gender === '여성' ? 'badge-female' : 'badge-male'}" style="margin: 0; padding: 2px 6px; font-size: 11px;">${v.gender}</span>
          <button type="button" data-va="rename" data-id="${v.id}" data-name="${esc(v.name)}" data-gender="${v.gender}" style="background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; transition: color 0.2s; outline: none; margin-right: -2px;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-tertiary)'" title="이름 변경">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <span style="font-weight: 700; color: var(--text-primary); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${esc(v.name)}">${esc(v.name)}</span>
          ${style ? `<span style="font-size: 11.5px; color: var(--accent); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="스타일: ${esc(style)}">| 스타일: ${esc(style)}</span>` : ''}
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button class="btn btn-xs btn-danger-ghost" data-va="delete" data-id="${v.id}" data-name="${esc(v.name)}" style="padding: 3px 8px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 3px;">
            ${ico.trash || `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`} 삭제
          </button>
        </div>
      </div>
      <div class="voice-row-bottom" style="display: flex; align-items: center; gap: 12px;">
        <button class="btn btn-xs btn-ghost inline-play-btn" data-va="play" data-id="${v.id}" data-url="${v.audio_url}" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; font-size: 12.5px; flex-shrink: 0; min-width: 90px; justify-content: center;">
          <span class="inline-play-icon" id="ipi-my-${v.id}">${ico.play}</span> <span id="ipt-my-${v.id}">재생</span>
        </button>
        <div style="flex: 1;">
          <input type="text" class="input voice-preview-input" data-id="${v.id}" placeholder="이 곳에 만들고 싶은 문장을 짧게 적어 보세요" value="${esc(pt)}" style="width: 100%; max-width: 100%; font-size: 13px; height: 32px; padding: 0 10px;">
        </div>
      </div>
      <div class="voice-inline-player" id="vip-${v.id}" hidden></div>
    </div>`;
  }).join('');

  restoreInlinePlayers();
}

function restoreInlinePlayers() {
  if (myVoicePlayer && myVoicePlayer.activeId) {
    const activeVoice = S.myVoices.find(v => String(v.id) === myVoicePlayer.activeId);
    if (activeVoice) {
      const activeId = myVoicePlayer.activeId;
      const url = myVoicePlayer.activeUrl || activeVoice.audio_url;
      const isPaused = myVoicePlayer.el.paused;
      
      const container = document.getElementById(`vip-${activeId}`);
      if (container) {
        container.innerHTML = `
          <div class="inline-player-box" style="margin-top: 8px; margin-bottom: 8px;">
            <div class="inline-player-controls">
              <button class="inline-play-circle" id="vpc-my-${activeId}" aria-label="재생/일시정지">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path id="ipp-my-${activeId}" d="${isPaused ? 'M6 3l14 9-14 9V3z' : 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'}"/>
                </svg>
              </button>
              <div class="inline-player-progress">
                <div class="waveform-seek-container">
                  <canvas class="waveform-visual" id="myvoice-wv-${activeId}"></canvas>
                  <input type="range" id="isb-my-${activeId}" class="inline-seek-bar" min="0" max="100" value="0" step="0.1">
                </div>
                <div class="inline-player-times">
                  <span id="ict-my-${activeId}">0:00</span>
                  <span id="itt-my-${activeId}">0:00</span>
                </div>
              </div>
            </div>
          </div>
        `;
        container.hidden = false;

        getWaveformData(url, 75).then(peaks => {
          myVoicePlayer.peaksMap.set(activeId, peaks);
          const canvas = document.getElementById(`myvoice-wv-${activeId}`);
          if (canvas) {
            drawWaveform(canvas, peaks, 0);
          }
          myVoicePlayer.onTick();
        });

        const seek = container.querySelector('.inline-seek-bar');
        if (seek) {
          seek.addEventListener('input', () => {
            myVoicePlayer.seek(activeId, seek.value);
          });
        }

        const circleBtn = container.querySelector('.inline-play-circle');
        if (circleBtn) {
          circleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            myVoicePlayer.play(activeId, url);
          });
        }
        
        myVoicePlayer.onTick();
        if (myVoicePlayer.el.duration) {
          const totTime = document.getElementById(`itt-my-${activeId}`);
          if (totTime) totTime.textContent = fmtTime(myVoicePlayer.el.duration);
        }
        
        const btn = document.querySelector(`.voice-item-card[data-id="${activeId}"] [data-va="play"]`);
        if (btn) {
          const txt = document.getElementById(`ipt-my-${activeId}`);
          if (!isPaused) {
            if (txt) txt.textContent = t('voice.pause');
            btn.classList.add('btn-primary');
          } else {
            if (txt) txt.textContent = t('voice.play');
            btn.classList.remove('btn-primary');
          }
        }
      }
    } else {
      myVoicePlayer.el.pause();
      myVoicePlayer.activeId = null;
    }
  }
}

function renderOutputs() {
  const el = document.getElementById('outputsList');
  document.getElementById('outputCount').textContent = `${S.outputs.length}${t('unit.count')}`;
  const badge = document.getElementById('navHistoryBadge');
  if (badge) { badge.textContent = S.outputs.length; badge.hidden = S.outputs.length === 0; }

  updateHistorySelectionUI();

  if (S.outputs.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <p>${t('history.empty')}</p>
        <p>${t('history.emptyDesc')}</p>
      </div>`;
    return;
  }

  el.innerHTML = S.outputs.map(o => {
    const sid      = String(o.id);
    const expanded = expandedOutputs.has(sid);
    const sub      = subtitleStates.get(sid) || { active: false, width: 20 };
    const preview  = o.text.length > 60 ? o.text.slice(0, 60) + '…' : o.text;
    const dispText = sub.active ? toSubtitleFormat(o.text, sub.width) : o.text;
    const isChecked = selectedHistoryIds.has(sid) ? 'checked' : '';
    return `
      <div class="output-item${expanded ? ' is-expanded' : ''}" data-id="${o.id}">
        <div class="output-row-wrapper" style="display: flex; align-items: center; width: 100%;">
          <input type="checkbox" class="history-select-checkbox" data-id="${o.id}" ${isChecked} style="width: 17px; height: 17px; margin-left: 16px; margin-right: 4px; accent-color: var(--accent); cursor: pointer; flex-shrink: 0;">
          <div class="output-header" data-oa="expand" data-id="${o.id}" style="flex: 1; padding-left: 12px; margin-left: 0; width: auto;">
            <div class="output-meta">
              <span class="output-voice">${esc(o.voice_name || '—')}</span>
              <span class="output-duration">${fmtTime(o.duration || 0)}</span>
              <span class="output-date text-secondary">${fmtDate(o.created_at)}</span>
              <span class="output-chevron">${ico.chevron}</span>
            </div>
            <div class="output-text text-secondary">"${esc(preview)}"</div>
          </div>
        </div>
        <div class="output-expand"${expanded ? '' : ' hidden'}>
          <pre class="output-fulltext" id="oft-${o.id}">${esc(dispText)}</pre>
          <div class="output-text-actions">
            <button class="btn btn-xs btn-ghost" data-oa="copy" data-id="${o.id}">${ico.copy} 복사</button>
            <div class="subtitle-controls">
              <button class="btn btn-xs ${sub.active ? 'btn-primary' : 'btn-ghost'}" data-oa="subtitle" data-id="${o.id}">자막형식</button>
              <input type="number" class="subtitle-width-input" data-id="${o.id}" value="${sub.width}" min="1" max="200" aria-label="글자 수">
              <span class="subtitle-unit">자</span>
            </div>
          </div>
        </div>
        <div class="output-inline-player" id="oip-${o.id}" hidden></div>
        <div class="output-actions">
          <button class="btn btn-xs btn-ghost" data-oa="play" data-url="${o.audio_url}" data-id="${o.id}">${ico.play} 재생</button>
          <a class="btn btn-xs btn-ghost" href="${o.audio_url}" download="voice.wav" id="dl-${o.id}">${ico.download} 다운로드</a>
          <button class="btn btn-xs btn-ghost" data-oa="edit" data-url="${o.audio_url}" data-id="${o.id}" style="display:inline-flex; align-items:center; gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
            편집
          </button>
          <button class="btn btn-xs btn-ghost" data-oa="save" data-id="${o.id}" data-dur="${o.duration}">${ico.bookmark} 내 음성 저장</button>
          <button class="btn btn-xs btn-danger-ghost" data-oa="delete" data-id="${o.id}">${ico.trash} 삭제</button>
        </div>
      </div>`;
  }).join('');

  // 재생 중인 인라인 플레이어가 목록 갱신 후에도 정상 표기되도록 UI 복원
  if (historyPlayer && historyPlayer.activeId) {
    const activeOutput = S.outputs.find(o => String(o.id) === historyPlayer.activeId);
    if (activeOutput) {
      const activeId = historyPlayer.activeId;
      const url = activeOutput.audio_url;
      const isPaused = historyPlayer.el.paused;
      
      const container = document.getElementById(`oip-${activeId}`);
      if (container) {
        container.innerHTML = `
          <div class="inline-player-box">
            <div class="inline-player-controls">
              <button class="inline-play-circle" id="ipc-${activeId}" aria-label="재생/일시정지">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path id="ipi-${activeId}" d="${isPaused ? 'M6 3l14 9-14 9V3z' : 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'}"/>
                </svg>
              </button>
              <div class="inline-player-progress">
                <div class="waveform-seek-container">
                  <canvas class="waveform-visual" id="history-wv-${activeId}"></canvas>
                  <input type="range" id="isb-${activeId}" class="inline-seek-bar" min="0" max="100" value="0" step="0.1">
                </div>
                <div class="inline-player-times">
                  <span id="ict-${activeId}">0:00</span>
                  <span id="itt-${activeId}">0:00</span>
                </div>
              </div>
            </div>
          </div>
        `;
        container.hidden = false;

        // 실제 음성 데이터 디코딩 후 인라인 둥근 기둥 파형 복원
        getWaveformData(url, 75).then(peaks => {
          historyPlayer.peaksMap.set(activeId, peaks);
          const canvas = document.getElementById(`history-wv-${activeId}`);
          if (canvas) {
            drawWaveform(canvas, peaks, 0);
          }
          historyPlayer.onTick();
        });

        const seek = container.querySelector('.inline-seek-bar');
        seek.addEventListener('input', () => {
          historyPlayer.seek(activeId, seek.value);
        });

        const circleBtn = container.querySelector('.inline-play-circle');
        circleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          historyPlayer.play(activeId, url);
        });
        
        historyPlayer.onTick();
        if (historyPlayer.el.duration) {
          const totTime = document.getElementById(`itt-${activeId}`);
          if (totTime) totTime.textContent = fmtTime(historyPlayer.el.duration);
        }
        
        const btn = document.querySelector(`.output-item[data-id="${activeId}"] [data-oa="play"]`);
        if (btn) {
          if (!isPaused) {
            btn.innerHTML = `${ico.pause} 일시정지`;
            btn.classList.add('btn-primary');
          } else {
            btn.innerHTML = `${ico.play} 재생`;
            btn.classList.remove('btn-primary');
          }
        }
      }
    } else {
      historyPlayer.el.pause();
      historyPlayer.activeId = null;
    }
  }
}


function renderAll() {
  renderVoiceSelect();
  renderMyVoices();
  renderOutputs();
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function handleGenerate() {
  const text = document.getElementById('textInput').value.trim();
  if (!text) { toast('텍스트를 입력하세요.', 'error'); return; }

  const voiceId = document.getElementById('voiceSelect').value;
  const style = document.getElementById('styleInput').value.trim();

  if (S.tab === 'my' && !voiceId) { toast('내 음성을 선택하세요.', 'error'); return; }
  if (S.tab === 'basic' && !voiceId && !style) { toast('음성을 선택하거나 스타일을 입력하세요.', 'error'); return; }
  const cfg = document.getElementById('cfgSlider').value;
  const steps = document.getElementById('stepsSlider').value;
  const targetDb = document.getElementById('targetDbSlider').value;
  const speed = document.getElementById('speedSlider').value;

  // 로그창 준비
  const logWindow = document.getElementById('logWindow');
  const logContent = document.getElementById('logContent');
  logWindow.hidden = false;
  logContent.innerHTML = '';

  function appendLog(msg) {
    // 로그 타입 분류
    const isProgress = /^\s*\d+%\s*\|/.test(msg) || msg.includes('it/s]') || msg.includes('s/it]');
    const isError = msg.startsWith('✗') || msg.includes('Error') || msg.includes('error') || msg.includes('Traceback');
    const isServer = msg.startsWith('[server]');
    const isSystem = msg.startsWith('[Sori-Dam]') || msg.startsWith('[voxcpm') || msg.startsWith('Warm') || msg.startsWith('Running') || msg.startsWith('Loading') || msg.startsWith('Fetching');

    // ── tqdm 진행바: 기존 줄 덮어쓰기 (같은 줄 유지) ──
    if (isProgress) {
      let progressLine = logContent.querySelector('.log-progress-live');
      if (!progressLine) {
        progressLine = document.createElement('div');
        progressLine.className = 'log-line log-progress log-progress-live';
        logContent.appendChild(progressLine);
      }
      progressLine.textContent = msg;
      logWindow.scrollTop = logWindow.scrollHeight;
      return;
    }

    const line = document.createElement('div');
    let cls = 'log-line';

    if (isError) {
      cls += ' err';
    } else if (isServer) {
      cls += ' log-server';
      const tagSpan = document.createElement('span');
      tagSpan.style.cssText = 'color: var(--text-tertiary); font-weight: 700; margin-right: 4px;';
      tagSpan.textContent = '[server]';
      const textSpan = document.createElement('span');
      textSpan.textContent = msg.slice(8);
      line.className = cls;
      line.appendChild(tagSpan);
      line.appendChild(textSpan);
      logContent.appendChild(line);
      logWindow.scrollTop = logWindow.scrollHeight;
      return;
    } else if (isSystem) {
      cls += ' log-system';
    }

    line.className = cls;
    line.textContent = msg;
    logContent.appendChild(line);
    logWindow.scrollTop = logWindow.scrollHeight;
  }

  appendLog('▶  음성 생성 준비 중...');

  const sessionId = Math.random().toString(36).slice(2, 10);
  const evtSource = new EventSource(`/api/logs/${sessionId}`);
  evtSource.onmessage = e => {
    if (e.data === '[DONE]') { evtSource.close(); return; }
    appendLog(e.data);
  };
  evtSource.onerror = () => evtSource.close();

  // SSE 큐 등록 대기 (타이밍 이슈 방지)
  await new Promise(r => setTimeout(r, 80));

  setGenerating(true);
  try {
    const fd = new FormData();
    fd.append('text', text);
    fd.append('style', style);
    fd.append('voice_type', S.tab);
    fd.append('cfg_value', cfg);
    fd.append('steps', steps);
    fd.append('target_db', targetDb);
    fd.append('speed', speed);
    fd.append('session_id', sessionId);
    if (S.tab === 'basic') fd.append('basic_voice_id', voiceId);
    else fd.append('my_voice_id', voiceId);

    const result = await api('POST', '/api/generate', fd);
    S.currentOutput = result;
    showPlayer(result);

    await refreshOutputs();
    renderOutputs();
    document.getElementById('restartBtn').hidden = false;
    toast('음성이 생성되었습니다.', 'success');
  } catch (e) {
    evtSource.close();
    toast(e.message, 'error');
  } finally {
    setGenerating(false);
  }
}

function setGenerating(on) {
  const btn = document.getElementById('generateBtn');
  btn.disabled = on;
  if (on) btn.classList.add('loading');
  else btn.classList.remove('loading');
}

// ── Player ────────────────────────────────────────────────────────────────────
function showPlayer(output, autoplay = false) {
  const card = document.getElementById('playerCard');
  card.classList.remove('player-disabled');

  document.getElementById('playerVoiceName').textContent = output.voice_name || '—';
  document.getElementById('playerDuration').textContent = fmtTime(output.duration || 0);
  document.getElementById('playerText').textContent = `"${output.text.slice(0, 100)}${output.text.length > 100 ? '…' : ''}"`;

  document.getElementById('downloadBtn').href = output.audio_url;
  document.getElementById('downloadBtn').setAttribute('download', 'voice.wav');

  document.getElementById('saveAsVoiceBtn').onclick = () =>
    showSaveVoiceModal(output.id, output.duration);

  // ── 트림 버튼 ──
  const trimOutputBtn = document.getElementById('trimOutputBtn');
  if (trimOutputBtn) {
    trimOutputBtn.onclick = async () => {
      toast('오디오 로딩 중...', 'info');
      try {
        const resp = await fetch(output.audio_url);
        const blob = await resp.blob();
        // output 트림 모달 전용 오픈 (적용 후 콜백 포함)
        openOutputTrimModal(blob, output, (trimmedBlob, durationSec) => {
          const newUrl = URL.createObjectURL(trimmedBlob);
          // 플레이어 교체
          player.load(newUrl, false);
          // 다운로드 버튼 업데이트
          document.getElementById('downloadBtn').href = newUrl;
          // 시간 표시 업데이트
          document.getElementById('playerDuration').textContent = fmtTime(durationSec);
          toast(`트림 완료 (${durationSec.toFixed(1)}초)`, 'success');
        });
      } catch (e) {
        toast('오디오 로딩 실패: ' + e.message, 'error');
      }
    };
  }

  player.load(output.audio_url, autoplay);
}

// ── 음성 만들기 결과 트림 모달 ─────────────────────────────────────────────────
async function openOutputTrimModal(blob, output, onApply) {
  // 오디오 디코딩
  let audioBuffer;
  try {
    const ab = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioBuffer = await ctx.decodeAudioData(ab);
    ctx.close();
  } catch (e) {
    toast('오디오 디코딩 실패: ' + e.message, 'error');
    return;
  }

  const duration = audioBuffer.duration;
  trimState = {
    itemId: '__output__',
    audioBuffer,
    totalDuration: duration,
    startSec: 0,
    endSec: duration,
    previewAudio: null,
    previewRAF: null,
    dragging: null,
    _onApply: onApply,   // 콜백 저장
  };

  // UI 초기화
  document.getElementById('trimTotalDur').textContent = duration.toFixed(1) + '초';
  document.getElementById('trimStartInput').value = '0';
  document.getElementById('trimStartInput').max = duration;
  document.getElementById('trimEndInput').value = duration.toFixed(1);
  document.getElementById('trimEndInput').max = duration;
  document.getElementById('trimWarning').style.display = 'none';
  updateTrimLabels();

  document.getElementById('trimModalOverlay').hidden = false;
  requestAnimationFrame(() => {
    drawTrimWaveform();
    updateTrimHandlePositions();
  });

  bindTrimEvents();

  // 트림 적용 버튼 오버라이드 (output 전용 처리)
  document.getElementById('trimApplyBtn').onclick = async () => {
    const { audioBuffer: ab, startSec, endSec } = trimState;
    const dur = endSec - startSec;
    if (dur < 0.1) { toast('구간이 너무 짧습니다.', 'error'); return; }

    try {
      const sampleRate = ab.sampleRate;
      const frameCount = Math.floor(dur * sampleRate);
      const offCtx = new OfflineAudioContext(ab.numberOfChannels, frameCount, sampleRate);
      const source = offCtx.createBufferSource();
      source.buffer = ab;
      source.connect(offCtx.destination);
      source.start(0, startSec, dur);
      const rendered = await offCtx.startRendering();
      const wavBuffer = audioBufferToWav(rendered);
      const trimmedBlob = new Blob([wavBuffer], { type: 'audio/wav' });

      stopTrimPreview();
      closeTrimModal();

      if (typeof trimState._onApply === 'function') {
        trimState._onApply(trimmedBlob, dur);
      }
    } catch (e) {
      toast('트림 처리 실패: ' + e.message, 'error');
    }
  };
}


// ── Voice handlers ────────────────────────────────────────────────────────────
function bindVoicesListEvents(listId) {
  const el = document.getElementById(listId);
  if (!el) return;
  
  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-va]');
    if (!btn) return;
    const { va, url, name, id } = btn.dataset;

    if (va === 'play') {
      myVoicePlayer.play(id, url);
    } else if (va === 'rename') {
      showRenameModal(id, name, btn.dataset.gender);
    } else if (va === 'delete') {
      await confirmDelete(`"${name}" 음성을 삭제할까요?`, async () => {
        if (myVoicePlayer.activeId === String(id)) {
          myVoicePlayer.el.pause();
          myVoicePlayer.activeId = null;
        }
        await api('DELETE', `/api/voices/${id}`);
        await refreshMyVoices();
        renderMyVoices();
        renderVoiceSelect();
        toast('음성이 삭제되었습니다.');
      });
    }
  });

  el.addEventListener('input', e => {
    const input = e.target.closest('.voice-preview-input');
    if (!input) return;
    const voiceId = input.dataset.id;
    const text = input.value.trim();

    // 상태 모델 즉시 반영 (메모리 상에서만 관리)
    const voice = S.myVoices.find(v => String(v.id) === String(voiceId));
    if (voice) {
      voice.preview_text = text;
    }
  });
}

document.getElementById('outputsList').addEventListener('click', async e => {
  const btn = e.target.closest('[data-oa]');
  if (!btn) return;
  const { oa, url, id, dur } = btn.dataset;

  if (oa === 'expand') {
    const sid = String(id);
    const item = e.currentTarget.querySelector(`.output-item[data-id="${id}"]`);
    const panel = item?.querySelector('.output-expand');
    if (!panel) return;
    if (expandedOutputs.has(sid)) {
      expandedOutputs.delete(sid);
      item.classList.remove('is-expanded');
      panel.hidden = true;
    } else {
      expandedOutputs.add(sid);
      item.classList.add('is-expanded');
      panel.hidden = false;
    }
  } else if (oa === 'copy') {
    const sid = String(id);
    const o = S.outputs.find(x => String(x.id) === sid);
    if (!o) return;
    const sub = subtitleStates.get(sid) || { active: false, width: 20 };
    const text = sub.active ? toSubtitleFormat(o.text, sub.width) : o.text;
    await navigator.clipboard.writeText(text);
    toast('텍스트가 복사되었습니다.');
  } else if (oa === 'subtitle') {
    const sid = String(id);
    const sub = subtitleStates.get(sid) || { active: false, width: 20 };
    const item = e.currentTarget.querySelector(`.output-item[data-id="${id}"]`);
    const input = item?.querySelector('.subtitle-width-input');
    const width = input ? parseInt(input.value) || 20 : sub.width;
    const newActive = !sub.active;
    subtitleStates.set(sid, { active: newActive, width });
    btn.className = `btn btn-xs ${newActive ? 'btn-primary' : 'btn-ghost'}`;
    const o = S.outputs.find(x => String(x.id) === sid);
    if (o) {
      const pre = document.getElementById(`oft-${id}`);
      if (pre) pre.textContent = newActive ? toSubtitleFormat(o.text, width) : o.text;
    }
  } else if (oa === 'play') {
    const output = S.outputs.find(o => String(o.id) === String(id));
    if (output) historyPlayer.play(output.id, output.audio_url);
  } else if (oa === 'save') {
    showSaveVoiceModal(id, parseFloat(dur));
  } else if (oa === 'edit') {
    toast('오디오 로딩 중...', 'info');
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const output = S.outputs.find(o => String(o.id) === String(id));
      openOutputTrimModal(blob, output || { audio_url: url }, (trimmedBlob, durationSec) => {
        const newUrl = URL.createObjectURL(trimmedBlob);
        // 다운로드 링크 교체
        const dlBtn = document.getElementById(`dl-${id}`);
        if (dlBtn) dlBtn.href = newUrl;
        toast(`편집 완료 (${durationSec.toFixed(1)}초) - 다운로드 버튼에서 저장하세요`, 'success');
      });
    } catch (e) {
      toast('오디오 로딩 실패: ' + e.message, 'error');
    }
  } else if (oa === 'delete') {
    await confirmDelete('이 음성을 기록에서 삭제할까요?', async () => {
      if (historyPlayer.activeId === String(id)) {
        historyPlayer.el.pause();
        historyPlayer.activeId = null;
      }
      await api('DELETE', `/api/outputs/${id}`);
      await refreshOutputs();
      renderOutputs();
      toast('삭제되었습니다.');
    });
  }
});

document.getElementById('outputsList').addEventListener('input', e => {
  const input = e.target.closest('.subtitle-width-input');
  if (!input) return;
  const sid = String(input.dataset.id);
  const sub = subtitleStates.get(sid) || { active: false, width: 20 };
  const width = Math.max(1, parseInt(input.value) || 20);
  subtitleStates.set(sid, { ...sub, width });
  if (sub.active) {
    const o = S.outputs.find(x => String(x.id) === sid);
    if (o) {
      const pre = document.getElementById(`oft-${sid}`);
      if (pre) pre.textContent = toSubtitleFormat(o.text, width);
    }
  }
});



// ── Upload voice ──────────────────────────────────────────────────────────────
const addVoiceBtn = document.getElementById('addVoiceBtn');
if (addVoiceBtn) {
  addVoiceBtn.addEventListener('click', () => {
    showUploadVoiceModal();
  });
}

// ── Record voice ──────────────────────────────────────────────────────────────
const recordVoiceBtn = document.getElementById('recordVoiceBtn');
if (recordVoiceBtn) {
  recordVoiceBtn.addEventListener('click', () => {
    showRecordingConsentModal();
  });
}

// ── 오디오 트림 편집 모달 ─────────────────────────────────────────────────────
let trimState = {
  itemId: null,
  audioBuffer: null,
  totalDuration: 0,
  startSec: 0,
  endSec: 0,
  previewAudio: null,
  previewRAF: null,
  dragging: null, // 'start' | 'end' | null
};

async function openTrimModal(itemId) {
  const item = (typeof tempRecordings !== 'undefined') ? tempRecordings.find(r => r.id === itemId) : null;
  if (!item || !item.blob) { toast('오디오 데이터를 찾을 수 없습니다.', 'error'); return; }

  // 오디오 디코딩
  let audioBuffer;
  try {
    const ab = await item.blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioBuffer = await ctx.decodeAudioData(ab);
    ctx.close();
  } catch (e) {
    toast('오디오 디코딩 실패: ' + e.message, 'error');
    return;
  }

  const duration = audioBuffer.duration;
  trimState = {
    itemId,
    audioBuffer,
    totalDuration: duration,
    startSec: 0,
    endSec: duration,
    previewAudio: null,
    previewRAF: null,
    dragging: null,
  };

  // UI 초기화
  document.getElementById('trimTotalDur').textContent = duration.toFixed(1) + '초';
  document.getElementById('trimStartInput').value = '0';
  document.getElementById('trimStartInput').max = duration;
  document.getElementById('trimEndInput').value = duration.toFixed(1);
  document.getElementById('trimEndInput').max = duration;
  document.getElementById('trimWarning').style.display = 'none';
  updateTrimLabels();

  // 모달 열기
  const overlay = document.getElementById('trimModalOverlay');
  overlay.hidden = false;

  // 파형 그리기 (requestAnimationFrame으로 레이아웃 완성 후)
  requestAnimationFrame(() => {
    drawTrimWaveform();
    updateTrimHandlePositions();
  });

  // 이벤트 바인딩
  bindTrimEvents();
}

function closeTrimModal() {
  stopTrimPreview();
  document.getElementById('trimModalOverlay').hidden = true;
  trimState.itemId = null;
  trimState.audioBuffer = null;
}

function updateTrimLabels() {
  const { startSec, endSec, totalDuration } = trimState;
  document.getElementById('trimStartLabel').textContent = startSec.toFixed(1) + 's';
  document.getElementById('trimEndLabel').textContent = endSec.toFixed(1) + 's';
  const sel = Math.max(0, endSec - startSec);
  document.getElementById('trimSelDur').textContent = sel.toFixed(1) + '초';

  // 경고 표시
  const warn = document.getElementById('trimWarning');
  if (sel < 3) {
    warn.textContent = '⚠ 선택 구간이 3초 미만입니다. 최소 3초 이상 선택해야 등록 가능합니다.';
    warn.style.display = 'block';
  } else if (sel > 30) {
    warn.textContent = '⚠ 선택 구간이 30초를 초과합니다. 최대 30초 이하로 선택해야 합니다.';
    warn.style.display = 'block';
  } else {
    warn.style.display = 'none';
  }
}

function drawTrimWaveform() {
  const { audioBuffer } = trimState;
  if (!audioBuffer) return;
  const canvas = document.getElementById('trimWaveCanvas');
  if (!canvas) return;

  const container = document.getElementById('trimWaveContainer');
  canvas.width = container.clientWidth * window.devicePixelRatio;
  canvas.height = container.clientHeight * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 오디오 데이터 다운샘플링
  const rawData = audioBuffer.getChannelData(0);
  const samples = W;
  const blockSize = Math.floor(rawData.length / samples);
  const peaks = [];
  for (let i = 0; i < samples; i++) {
    let max = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const v = Math.abs(rawData[start + j] || 0);
      if (v > max) max = v;
    }
    peaks.push(max);
  }

  ctx.clearRect(0, 0, W, H);

  // 파형 그리기
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(10,132,255,0.9)');
  grad.addColorStop(1, 'rgba(10,132,255,0.4)');
  ctx.fillStyle = grad;

  const barW = W / peaks.length;
  for (let i = 0; i < peaks.length; i++) {
    const h = peaks[i] * H * 0.85;
    const y = (H - h) / 2;
    ctx.fillRect(i * barW, y, Math.max(1, barW - 0.5), h);
  }
}

function updateTrimHandlePositions() {
  const { startSec, endSec, totalDuration } = trimState;
  const container = document.getElementById('trimWaveContainer');
  if (!container) return;
  const W = container.clientWidth;

  const startPct = startSec / totalDuration;
  const endPct = endSec / totalDuration;

  const handleStart = document.getElementById('trimHandleStart');
  const handleEnd = document.getElementById('trimHandleEnd');
  const maskLeft = document.getElementById('trimMaskLeft');
  const maskRight = document.getElementById('trimMaskRight');

  if (handleStart) handleStart.style.left = (startPct * W - 2) + 'px';
  if (handleEnd) handleEnd.style.left = (endPct * W - 2) + 'px';
  if (maskLeft) maskLeft.style.width = (startPct * W) + 'px';
  if (maskRight) maskRight.style.width = ((1 - endPct) * W) + 'px';
}

function bindTrimEvents() {
  // 취소 버튼
  document.getElementById('trimCancelBtn').onclick = () => closeTrimModal();

  // 오버레이 클릭 닫기
  const overlay = document.getElementById('trimModalOverlay');
  overlay.onclick = (e) => { if (e.target === overlay) closeTrimModal(); };

  // 숫자 입력 직접 변경
  document.getElementById('trimStartInput').oninput = (e) => {
    let v = parseFloat(e.target.value) || 0;
    v = Math.max(0, Math.min(v, trimState.endSec - 0.1));
    trimState.startSec = v;
    updateTrimLabels();
    updateTrimHandlePositions();
  };
  document.getElementById('trimEndInput').oninput = (e) => {
    let v = parseFloat(e.target.value) || 0;
    v = Math.min(trimState.totalDuration, Math.max(v, trimState.startSec + 0.1));
    trimState.endSec = v;
    updateTrimLabels();
    updateTrimHandlePositions();
  };

  // 핸들 드래그
  const container = document.getElementById('trimWaveContainer');
  const handleStart = document.getElementById('trimHandleStart');
  const handleEnd = document.getElementById('trimHandleEnd');

  function getSecFromMouseX(clientX) {
    const rect = container.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * trimState.totalDuration;
  }

  handleStart.addEventListener('mousedown', (e) => {
    e.preventDefault();
    trimState.dragging = 'start';
  });
  handleEnd.addEventListener('mousedown', (e) => {
    e.preventDefault();
    trimState.dragging = 'end';
  });

  // 터치 지원
  handleStart.addEventListener('touchstart', (e) => { e.preventDefault(); trimState.dragging = 'start'; }, { passive: false });
  handleEnd.addEventListener('touchstart', (e) => { e.preventDefault(); trimState.dragging = 'end'; }, { passive: false });

  function onMove(clientX) {
    if (!trimState.dragging) return;
    const sec = getSecFromMouseX(clientX);
    if (trimState.dragging === 'start') {
      trimState.startSec = Math.max(0, Math.min(sec, trimState.endSec - 0.1));
      document.getElementById('trimStartInput').value = trimState.startSec.toFixed(1);
    } else {
      trimState.endSec = Math.min(trimState.totalDuration, Math.max(sec, trimState.startSec + 0.1));
      document.getElementById('trimEndInput').value = trimState.endSec.toFixed(1);
    }
    updateTrimLabels();
    updateTrimHandlePositions();
  }

  window.addEventListener('mousemove', (e) => onMove(e.clientX));
  window.addEventListener('touchmove', (e) => { if (trimState.dragging) onMove(e.touches[0].clientX); }, { passive: false });
  window.addEventListener('mouseup', () => { trimState.dragging = null; });
  window.addEventListener('touchend', () => { trimState.dragging = null; });

  // 미리듣기 버튼
  const previewBtn = document.getElementById('trimPreviewBtn');
  previewBtn.onclick = () => {
    if (trimState.previewAudio) {
      stopTrimPreview();
      return;
    }
    startTrimPreview();
  };

  // 트림 적용 버튼
  document.getElementById('trimApplyBtn').onclick = async () => {
    await applyTrim();
  };
}

function startTrimPreview() {
  stopTrimPreview();
  const { audioBuffer, startSec, endSec, totalDuration } = trimState;
  if (!audioBuffer) return;

  const duration = endSec - startSec;
  if (duration < 0.1) return;

  // OfflineAudioContext로 구간 잘라 재생
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.floor(endSec * sampleRate);
  const frameCount = endSample - startSample;

  const offCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);
  const source = offCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offCtx.destination);
  source.start(0, startSec, duration);

  offCtx.startRendering().then(renderedBuffer => {
    const wav = audioBufferToWav(renderedBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    trimState.previewAudio = audio;

    const previewBtn = document.getElementById('trimPreviewBtn');
    if (previewBtn) {
      previewBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> 정지`;
    }

    // 재생 커서 애니메이션
    const cursor = document.getElementById('trimPlayCursor');
    const container = document.getElementById('trimWaveContainer');
    if (cursor && container) {
      cursor.style.display = 'block';
      const containerW = container.clientWidth;
      const startPct = startSec / totalDuration;

      const startTime = performance.now();
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= duration || !trimState.previewAudio) {
          cursor.style.display = 'none';
          return;
        }
        const pct = startPct + (elapsed / totalDuration);
        cursor.style.left = (pct * containerW) + 'px';
        trimState.previewRAF = requestAnimationFrame(animate);
      };
      trimState.previewRAF = requestAnimationFrame(animate);
    }

    audio.onended = () => stopTrimPreview();
    audio.play().catch(() => stopTrimPreview());
  }).catch(e => {
    toast('미리듣기 실패: ' + e.message, 'error');
  });
}

function stopTrimPreview() {
  if (trimState.previewAudio) {
    trimState.previewAudio.pause();
    trimState.previewAudio = null;
  }
  if (trimState.previewRAF) {
    cancelAnimationFrame(trimState.previewRAF);
    trimState.previewRAF = null;
  }
  const cursor = document.getElementById('trimPlayCursor');
  if (cursor) cursor.style.display = 'none';
  const previewBtn = document.getElementById('trimPreviewBtn');
  if (previewBtn) {
    previewBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> 구간 미리듣기`;
  }
}

async function applyTrim() {
  const { itemId, audioBuffer, startSec, endSec, totalDuration } = trimState;
  const duration = endSec - startSec;

  if (duration < 3) { toast('선택 구간이 3초 미만입니다.', 'error'); return; }
  if (duration > 30) { toast('선택 구간이 30초를 초과합니다.', 'error'); return; }

  const item = (typeof tempRecordings !== 'undefined') ? tempRecordings.find(r => r.id === itemId) : null;
  if (!item) { toast('대상 항목을 찾을 수 없습니다.', 'error'); return; }

  try {
    const sampleRate = audioBuffer.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);

    const offCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);
    const source = offCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offCtx.destination);
    source.start(0, startSec, duration);

    const rendered = await offCtx.startRendering();
    const wavBuffer = audioBufferToWav(rendered);
    const newBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    const newUrl = URL.createObjectURL(newBlob);

    // 기존 URL 해제
    if (item.url) URL.revokeObjectURL(item.url);

    item.blob = newBlob;
    item.url = newUrl;
    item.seconds = Math.round(duration);

    stopTrimPreview();
    closeTrimModal();
    renderRegisterVoiceList();
    toast(`트림 완료! ${startSec.toFixed(1)}초 ~ ${endSec.toFixed(1)}초 구간 (${duration.toFixed(1)}초)으로 저장됨`, 'success');
  } catch (e) {
    toast('트림 처리 실패: ' + e.message, 'error');
  }
}

// ── Audio Format Converter (WebM/OGG -> PCM 16-bit WAV) ─────────────────────
async function convertBlobToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error('Audio decode failed:', err);
    throw new Error('오디오 데이터를 디코딩하는 데 실패했습니다.');
  } finally {
    audioCtx.close();
  }
  
  const wavBuffer = audioBufferToWav(audioBuffer);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2;
  const wavBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(wavBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  floatTo16BitPCM(view, 44, result);
  return wavBuffer;
}

function interleave(inputL, inputR) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function showRecordingConsentModal() {
  const content = `
    <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary); margin-bottom: 16px;">
      <div style="background: rgba(255, 69, 58, 0.08); border: 1px solid rgba(255, 69, 58, 0.15); padding: 12px 16px; border-radius: 8px; color: #ff453a; font-weight: 600; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0; margin-top:2px;" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>녹음 전 필수 주의사항 안내</span>
      </div>
      <p style="margin: 0 0 16px 0; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-primary);">
        "반드시 본인의 음성만 사용해야 하며 타인의 목소리를 동의 없이 무단 사용하면 목소리 주체에 대한 부정경쟁방지법 위반이나 퍼블리시티권(인격권) 침해로 막대한 민사상 손해배상 책임이 발생할 수 있으며, 사안에 따라 형사 고소 대상이 될 수 있습니다."
      </p>
      <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; user-select: none; border-top: 1px solid var(--border-light); padding-top: 12px; margin-top: 12px; color: var(--text-primary);">
        <input type="checkbox" id="consentCheckbox" style="width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer;">
        <span style="font-weight: 600;">위 주의사항을 확인하였으며, 이에 동의합니다.</span>
      </label>
    </div>
  `;

  openModal('음성 녹음 동의', content, async () => {
    const checked = document.getElementById('consentCheckbox').checked;
    if (!checked) {
      toast('주의사항에 동의해야 녹음을 시작할 수 있습니다.', 'error');
      return false;
    }
    setTimeout(() => {
      showRecordingModal();
    }, 150);
    return true;
  });
}

function showRecordingModal() {
  let mediaRecorder = null;
  let chunks = [];
  let recordedBlob = null;
  let stream = null;
  let timerInterval = null;
  let seconds = 0;
  let isRecording = false;

  // 실시간 시각화를 위한 Web Audio API 변수
  let audioContext = null;
  let analyser = null;
  let dataArray = null;
  let animationFrameId = null;
  let source = null;

  function cleanup() {
    clearInterval(timerInterval);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (source) {
      source.disconnect();
      source = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch {}
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    // 캔버스 클리어
    const canvas = document.getElementById('recWaveCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  const content = `
    <div class="record-area" style="position: relative; overflow: hidden; padding-top: 15px; padding-bottom: 15px; background: rgba(0,0,0,0.02); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <!-- 실시간 마이크 오디오 파형 캔버스 (백그라운드 배치) -->
      <canvas id="recWaveCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; opacity: 0.85;"></canvas>
      
      <div class="record-timer" id="recTimer" style="position: relative; z-index: 2;">0:00</div>
      <button class="record-btn" id="recBtn" type="button" style="position: relative; z-index: 2; margin: 12px auto;">
        <span class="record-dot"></span>
      </button>
      <div class="record-status" id="recStatus" style="position: relative; z-index: 2;">버튼을 눌러 녹음을 시작하세요</div>
      <div class="record-guide" style="position: relative; z-index: 2; font-size: 11.5px; color: var(--text-secondary); margin-top: 8px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 4px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 적정 녹음 시간: <span style="color: var(--accent); font-weight: 600;">최소 3초 ~ 최대 30초</span>
      </div>
    </div>
    <div class="record-preview" id="recPreview" hidden>
      <audio id="recAudio" controls></audio>
    </div>
    <div class="form-group">
      <label class="form-label">음성 이름</label>
      <input type="text" id="modalVoiceName" class="input" placeholder="예: 내 목소리">
    </div>
    <div class="form-group">
      <label class="form-label">성별</label>
      <div class="segment-control" id="genderSeg" style="margin-top:4px">
        <button class="segment-btn active" data-gender="여성">여성</button>
        <button class="segment-btn" data-gender="남성">남성</button>
      </div>
    </div>`;

  openModal('음성 녹음', content, async () => {
    if (!recordedBlob) { toast('녹음을 먼저 완료하세요.', 'error'); return false; }
    if (seconds < 3) { toast('3초 이상 녹음해주세요.', 'error'); return false; }
    if (seconds > 30) { toast('최대 30초 이하로 녹음해주세요.', 'error'); return false; }
    const name = document.getElementById('modalVoiceName').value.trim();
    if (!name) { toast('이름을 입력하세요.', 'error'); return false; }
    const gender = document.querySelector('#genderSeg .active')?.dataset.gender || '여성';

    // 업로드 전 브라우저 자체 디코더를 사용해 webm/ogg를 리얼 PCM 16-bit WAV로 변환
    toast('오디오 포맷 변환 중...', 'info');
    let wavBlob;
    try {
      wavBlob = await convertBlobToWav(recordedBlob);
    } catch (err) {
      toast('오디오 변환 실패: ' + err.message, 'error');
      return false;
    }

    const file = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
    const fd = new FormData();
    fd.append('name', name);
    fd.append('gender', gender);
    fd.append('audio', file);

    await api('POST', '/api/voices', fd);
    cleanup();
    await refreshMyVoices();
    renderMyVoices();
    renderVoiceSelect();
    toast(`"${name}" 음성이 등록되었습니다.`, 'success');
    return true;
  });

  requestAnimationFrame(() => {
    bindGenderSeg('genderSeg');

    const recBtn = document.getElementById('recBtn');
    const timerEl = document.getElementById('recTimer');
    const statusEl = document.getElementById('recStatus');
    const previewEl = document.getElementById('recPreview');
    const audioEl = document.getElementById('recAudio');

    recBtn.addEventListener('click', async () => {
      if (!isRecording) {
        // 녹음 시작
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          toast('마이크 접근 권한이 필요합니다.', 'error');
          return;
        }

        chunks = [];
        seconds = 0;
        recordedBlob = null;
        timerEl.textContent = '0:00';
        previewEl.hidden = true;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : '';

        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        mediaRecorder.onstop = () => {
          recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
          audioEl.src = URL.createObjectURL(recordedBlob);
          previewEl.hidden = false;
        };

        mediaRecorder.start(100);
        isRecording = true;
        recBtn.classList.add('recording');
        statusEl.textContent = '녹음 중… 버튼을 다시 눌러 정지';

        // Web Audio API 분석 및 시각화 가동
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);

          source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

          const canvas = document.getElementById('recWaveCanvas');
          const ctx = canvas.getContext('2d');
          
          const resizeCanvas = () => {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
          };
          resizeCanvas();

          const draw = () => {
            if (!isRecording) return;
            animationFrameId = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            gradient.addColorStop(0, 'rgba(255, 69, 58, 0.01)');
            gradient.addColorStop(0.3, 'rgba(255, 69, 58, 0.32)');
            gradient.addColorStop(0.5, 'rgba(255, 69, 58, 0.65)');
            gradient.addColorStop(0.7, 'rgba(255, 69, 58, 0.32)');
            gradient.addColorStop(1, 'rgba(255, 69, 58, 0.01)');

            ctx.lineWidth = 3.5 * window.devicePixelRatio;
            ctx.strokeStyle = gradient;
            ctx.beginPath();

            const sliceWidth = w / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0;
              const y = (v * h) / 2;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.lineTo(w, h / 2);
            ctx.stroke();
          };

          draw();
        } catch (err) {
          console.error('Audio visualization initialization failed:', err);
        }

        timerInterval = setInterval(() => {
          seconds++;
          const m = Math.floor(seconds / 60);
          const s = seconds % 60;
          timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;

          if (seconds >= 30) {
            // 30초 도달 시 자동 정지 트리거
            clearInterval(timerInterval);
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
            if (source) {
              source.disconnect();
              source = null;
            }
            if (audioContext && audioContext.state !== 'closed') {
              audioContext.close();
              audioContext = null;
            }
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            if (stream) {
              stream.getTracks().forEach(t => t.stop());
            }
            isRecording = false;
            recBtn.classList.remove('recording');
            statusEl.textContent = `✓ 30초 제한 도달 — 녹음 완료`;
            
            // 캔버스 클리어
            const canvas = document.getElementById('recWaveCanvas');
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            toast('최대 녹음 시간(30초)에 도달하여 자동으로 녹음이 종료되었습니다.', 'info');
          }
        }, 1000);

      } else {
        // 녹음 정지
        clearInterval(timerInterval);
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (source) {
          source.disconnect();
          source = null;
        }
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
          audioContext = null;
        }
        mediaRecorder.stop();
        stream.getTracks().forEach(t => t.stop());
        isRecording = false;
        recBtn.classList.remove('recording');
        statusEl.textContent = seconds < 3
          ? `⚠ ${seconds}초 녹음됨 — 3초 이상 필요합니다`
          : seconds > 30
          ? `⚠ ${seconds}초 녹음됨 — 최대 30초까지만 가능합니다`
          : `✓ ${seconds}초 녹음 완료`;

        // 캔버스 클리어
        const canvas = document.getElementById('recWaveCanvas');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });

    // 모달 닫을 때 스트림 정리
    const overlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('modalCancel');

    cancelBtn.onclick = () => { cleanup(); closeModal(); };
    overlay.onclick = e => { if (e.target === overlay) { cleanup(); closeModal(); } };

    document.getElementById('modalVoiceName').focus();
  });
}

function showUploadVoiceModal() {
  let selectedFile = null;

  const content = `
    <div class="form-group">
      <label class="form-label">참조 음성 파일 <span class="text-secondary">(3초 이상 WAV/MP3)</span></label>
      <div class="upload-area" id="uploadArea">
        <div class="upload-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-secondary);"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <p>클릭하거나 파일을 드래그하세요</p>
        <div class="upload-filename" id="uploadFilename" style="display:none"></div>
        <input type="file" id="fileInput" accept=".wav,.mp3,.flac,.ogg,audio/*" style="display:none">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">음성 이름</label>
      <input type="text" id="modalVoiceName" class="input" placeholder="예: 내 목소리">
    </div>
    <div class="form-group">
      <label class="form-label">음성 분류</label>
      <select id="modalVoiceType" class="input" style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-light); border-radius: 6px; outline: none; width: 100%;">
        <option value="my_voice">내 목소리</option>
        <option value="female_actor">Ai성우 - 여성</option>
        <option value="male_actor">Ai성우 - 남성</option>
      </select>
    </div>
    <div class="form-group" id="modalGenderWrap">
      <label class="form-label">성별</label>
      <div class="segment-control" id="genderSeg" style="margin-top:4px">
        <button class="segment-btn active" data-gender="여성">여성</button>
        <button class="segment-btn" data-gender="남성">남성</button>
      </div>
    </div>`;

  openModal('새 음성 등록', content, async () => {
    if (!selectedFile) { toast('음성 파일을 선택하세요.', 'error'); return false; }
    const name = document.getElementById('modalVoiceName').value.trim();
    if (!name) { toast('이름을 입력하세요.', 'error'); return false; }
    
    const voiceType = document.getElementById('modalVoiceType').value;
    let gender;
    if (voiceType === 'my_voice') {
      gender = document.querySelector('#genderSeg .active')?.dataset.gender || '여성';
    } else {
      gender = voiceType === 'female_actor' ? '여성' : '남성';
    }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('gender', gender);
    fd.append('audio', selectedFile);
    fd.append('voice_type', voiceType);

    await api('POST', '/api/voices', fd);
    await refreshMyVoices();
    renderMyVoices();
    renderVoiceSelect();
    toast(`"${name}" 음성이 등록되었습니다.`, 'success');
    return true;
  });

  // Bind after modal DOM is ready (next tick)
  requestAnimationFrame(() => {
    const area = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fname = document.getElementById('uploadFilename');
    const voiceTypeSelect = document.getElementById('modalVoiceType');
    const genderWrap = document.getElementById('modalGenderWrap');

    area.addEventListener('click', () => fileInput.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) setFile(f);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) setFile(fileInput.files[0]);
    });

    function setFile(f) {
      selectedFile = f;
      fname.textContent = f.name;
      fname.style.display = '';
    }

    voiceTypeSelect.addEventListener('change', () => {
      if (voiceTypeSelect.value === 'my_voice') {
        genderWrap.style.display = '';
      } else {
        genderWrap.style.display = 'none';
      }
    });

    bindGenderSeg('genderSeg');
    document.getElementById('modalVoiceName').focus();
  });
}

// ── Save as my voice modal ────────────────────────────────────────────────────
function showSaveVoiceModal(outputId, duration) {
  const content = `
    <div class="form-group">
      <label class="form-label">음성 이름</label>
      <input type="text" id="modalVoiceName" class="input" placeholder="예: 내 목소리">
    </div>
    <div class="form-group">
      <label class="form-label">음성 분류</label>
      <select id="modalVoiceType" class="input" style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-light); border-radius: 6px; outline: none; width: 100%;">
        <option value="my_voice">내 목소리</option>
        <option value="female_actor">Ai성우 - 여성</option>
        <option value="male_actor">Ai성우 - 남성</option>
      </select>
    </div>
    <div class="form-group" id="modalGenderWrap">
      <label class="form-label">성별</label>
      <div class="segment-control" id="genderSeg" style="margin-top:4px">
        <button class="segment-btn active" data-gender="여성">여성</button>
        <button class="segment-btn" data-gender="남성">남성</button>
      </div>
    </div>
    <p class="text-secondary" style="font-size:13px;margin-top:4px">
      생성된 음성(${fmtTime(duration)})이 참조 음성으로 등록됩니다.
    </p>`;

  openModal('내 음성으로 저장', content, async () => {
    const name = document.getElementById('modalVoiceName').value.trim();
    if (!name) { toast('이름을 입력하세요.', 'error'); return false; }
    
    const voiceType = document.getElementById('modalVoiceType').value;
    let gender;
    if (voiceType === 'my_voice') {
      gender = document.querySelector('#genderSeg .active')?.dataset.gender || '여성';
    } else {
      gender = voiceType === 'female_actor' ? '여성' : '남성';
    }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('gender', gender);
    fd.append('from_output_id', outputId);
    fd.append('voice_type', voiceType);

    await api('POST', '/api/voices', fd);
    await refreshMyVoices();
    renderMyVoices();
    renderVoiceSelect();
    toast(`"${name}" 음성이 등록되었습니다.`, 'success');
    return true;
  });

  requestAnimationFrame(() => {
    const voiceTypeSelect = document.getElementById('modalVoiceType');
    const genderWrap = document.getElementById('modalGenderWrap');

    voiceTypeSelect.addEventListener('change', () => {
      if (voiceTypeSelect.value === 'my_voice') {
        genderWrap.style.display = '';
      } else {
        genderWrap.style.display = 'none';
      }
    });

    bindGenderSeg('genderSeg');
    document.getElementById('modalVoiceName').focus();
  });
}

// ── Rename modal ──────────────────────────────────────────────────────────────
function showRenameModal(voiceId, currentName, currentGender) {
  const voice = S.myVoices.find(v => String(v.id) === String(voiceId));
  const voiceType = voice ? voice.voice_type : 'my_voice';
  const showGender = (voiceType === 'my_voice');
  const gender = currentGender || '여성';

  const content = `
    <div class="form-group">
      <label class="form-label">이름</label>
      <input type="text" id="modalVoiceName" class="input" value="${esc(currentName)}">
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">음성 분류</label>
      <select id="modalVoiceType" class="input" style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-light); border-radius: 6px; outline: none; width: 100%;">
        <option value="my_voice" ${voiceType === 'my_voice' ? 'selected' : ''}>내 목소리</option>
        <option value="female_actor" ${voiceType === 'female_actor' ? 'selected' : ''}>Ai성우 - 여성</option>
        <option value="male_actor" ${voiceType === 'male_actor' ? 'selected' : ''}>Ai성우 - 남성</option>
      </select>
    </div>
    <div class="form-group" id="modalVoiceGenderWrap" style="margin-top:12px; display: ${showGender ? 'block' : 'none'};">
      <label class="form-label">성별</label>
      <div class="segment-control" id="modalVoiceGender" style="margin-top:4px">
        <button class="segment-btn ${gender === '여성' ? 'active' : ''}" data-gender="여성">여성</button>
        <button class="segment-btn ${gender === '남성' ? 'active' : ''}" data-gender="남성">남성</button>
      </div>
    </div>`;

  openModal('음성 정보 변경', content, async () => {
    const name = document.getElementById('modalVoiceName').value.trim();
    if (!name) { toast('이름을 입력하세요.', 'error'); return false; }
    
    const newVoiceType = document.getElementById('modalVoiceType').value;
    let newGender;
    if (newVoiceType === 'my_voice') {
      newGender = document.querySelector('#modalVoiceGender .active')?.dataset.gender || '여성';
    } else {
      newGender = newVoiceType === 'female_actor' ? '여성' : '남성';
    }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('gender', newGender);
    fd.append('voice_type', newVoiceType);

    await api('PUT', `/api/voices/${voiceId}`, fd);
    await refreshMyVoices();
    renderMyVoices();
    renderVoiceSelect();
    toast('음성 정보가 변경되었습니다.', 'success');
    return true;
  });

  requestAnimationFrame(() => {
    const voiceTypeSelect = document.getElementById('modalVoiceType');
    const genderWrap = document.getElementById('modalVoiceGenderWrap');

    voiceTypeSelect.addEventListener('change', () => {
      if (voiceTypeSelect.value === 'my_voice') {
        genderWrap.style.display = '';
      } else {
        genderWrap.style.display = 'none';
      }
    });

    bindGenderSeg('modalVoiceGender');
    const inp = document.getElementById('modalVoiceName');
    inp.focus();
    inp.select();
  });
}

function showPreviewTextModal(voiceId, currentText, currentStyle = '') {
  const content = `
    <div class="form-group" style="margin-bottom: 12px;">
      <label class="form-label">음성 스타일</label>
      <input type="text" id="modalVoiceStyle" class="input" placeholder="예: 활기차고 빠른 목소리, 차분한 목소리" value="${esc(currentStyle)}">
      <div class="form-hint">음성 생성 시 자동으로 채워질 스타일 단어입니다.</div>
    </div>
    <div class="form-group">
      <label class="form-label">미리듣기 텍스트</label>
      <textarea id="modalPreviewText" class="textarea" rows="3" placeholder="참조 음성 파일에서 말한 내용을 입력하세요…">${esc(currentText)}</textarea>
      <div class="form-hint" id="previewTextHint">등록된 음성 파일에서 실제로 발화된 텍스트를 입력하면 나중에 참고할 수 있습니다.</div>
    </div>`;

  openModal('음성 스타일 및 미리듣기 텍스트 변경', content, async () => {
    const text = document.getElementById('modalPreviewText').value.trim();
    const style = document.getElementById('modalVoiceStyle').value.trim();
    
    // Inject a beautiful, premium loading alert inside the modal!
    const hint = document.getElementById('previewTextHint');
    if (hint) {
      hint.innerHTML = `
        <div class="voice-generating-loader">
          <svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="animation: spin 1.2s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span>새로운 미리듣기 음성을 다시 생성하는 중입니다…</span>
        </div>`;
    }
    
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    
    try {
      const fd = new FormData();
      fd.append('preview_text', text);
      fd.append('style', style);
      await api('PUT', `/api/voices/${voiceId}`, fd);
      await refreshMyVoices();
      renderMyVoices();
      toast('스타일 및 미리듣기 텍스트가 성공적으로 저장되었습니다.', 'success');
      return true;
    } catch (e) {
      if (confirmBtn) confirmBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (hint) {
        hint.innerHTML = '등록된 음성 파일에서 실제로 발화된 텍스트를 입력하면 나중에 참고할 수 있습니다.';
      }
      throw e;
    }
  });

  requestAnimationFrame(() => {
    const inp = document.getElementById('modalVoiceStyle');
    inp?.focus();
  });
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function confirmDelete(message, onConfirm) {
  const content = `<p style="font-size:14.5px;line-height:1.6;color:var(--text-secondary)">${message}</p>`;
  openModal('삭제 확인', content, async () => {
    await onConfirm();
    return true;
  }, true);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title, content, onConfirm, isDanger = false) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = content;

  const confirmBtn = document.getElementById('modalConfirm');
  confirmBtn.textContent = isDanger ? '삭제' : '확인';
  confirmBtn.className = `btn ${isDanger ? 'btn-danger' : 'btn-primary'}`;

  if (isDanger) {
    confirmBtn.style.cssText = 'background:var(--danger);color:white';
  } else {
    confirmBtn.style.cssText = '';
  }

  const overlay = document.getElementById('modalOverlay');
  overlay.hidden = false;

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    try {
      const ok = await onConfirm();
      if (ok !== false) closeModal();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  };

  document.getElementById('modalCancel').onclick = closeModal;
  overlay.onclick = e => { if (e.target === overlay) closeModal(); };

  document.addEventListener('keydown', onEsc);
}

function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e) {
  if (e.key === 'Escape') closeModal();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bindGenderSeg(id) {
  document.querySelectorAll(`#${id} .segment-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`#${id} .segment-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDate(ts) {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast${type ? ' ' + type : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

// ── Tab ───────────────────────────────────────────────────────────────────────
function getVoiceHint(tab) {
  if (tab === 'my') return t('create.voiceHintMy');
  return t('create.voiceSelectHint');
}

document.getElementById('tabControl').addEventListener('click', e => {
  const btn = e.target.closest('.segment-btn');
  if (!btn || !btn.dataset.tab) return;
  document.querySelectorAll('#tabControl .segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  S.tab = btn.dataset.tab;
  document.getElementById('voiceSelectHint').textContent = getVoiceHint(S.tab);
  renderVoiceSelect();
});

document.getElementById('voiceSelect').addEventListener('change', () => {
  if (S.tab === 'my') {
    const selectedId = document.getElementById('voiceSelect').value;
    const voice = S.myVoices.find(v => String(v.id) === String(selectedId));
    if (voice) {
      if (voice.style !== undefined) {
        document.getElementById('styleInput').value = voice.style || '';
      }
      if (voice.cfg_value !== undefined && voice.cfg_value !== null) {
        const cfgVal = parseFloat(voice.cfg_value);
        document.getElementById('cfgSlider').value = cfgVal;
        document.getElementById('cfgVal').textContent = cfgVal.toFixed(1);
      }
      if (voice.steps !== undefined && voice.steps !== null) {
        const stepsVal = parseInt(voice.steps);
        document.getElementById('stepsSlider').value = stepsVal;
        document.getElementById('stepsVal').textContent = stepsVal;
      }
      if (voice.target_db !== undefined && voice.target_db !== null) {
        const dbVal = parseInt(voice.target_db);
        document.getElementById('targetDbSlider').value = dbVal;
        document.getElementById('targetDbVal').textContent = `${dbVal} dB`;
      }
      if (voice.speed !== undefined && voice.speed !== null) {
        const speedVal = parseFloat(voice.speed);
        document.getElementById('speedSlider').value = speedVal;
        document.getElementById('speedVal').textContent = `${speedVal.toFixed(1)}x`;
      }
    }
  }
});

// ── Char count ────────────────────────────────────────────────────────────────
document.getElementById('textInput').addEventListener('input', e => {
  document.getElementById('charCount').textContent = e.target.value.length;
});

// ── Sliders ───────────────────────────────────────────────────────────────────
document.getElementById('cfgSlider').addEventListener('input', e => {
  document.getElementById('cfgVal').textContent = parseFloat(e.target.value).toFixed(1);
});

document.getElementById('stepsSlider').addEventListener('input', e => {
  document.getElementById('stepsVal').textContent = e.target.value;
});

document.getElementById('targetDbSlider').addEventListener('input', e => {
  document.getElementById('targetDbVal').textContent = `${e.target.value} dB`;
});

document.getElementById('speedSlider').addEventListener('input', e => {
  document.getElementById('speedVal').textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
});

// ── Reset Advanced Settings ───────────────────────────────────────────────────
document.getElementById('resetAdvancedBtn').addEventListener('click', () => {
  document.getElementById('cfgSlider').value = 2.0;
  document.getElementById('cfgVal').textContent = '2.0';

  document.getElementById('stepsSlider').value = 10;
  document.getElementById('stepsVal').textContent = '10';

  document.getElementById('targetDbSlider').value = -6;
  document.getElementById('targetDbVal').textContent = '-6 dB';

  document.getElementById('speedSlider').value = 1.0;
  document.getElementById('speedVal').textContent = '1.0x';
});

// ── Restart Form ──────────────────────────────────────────────────────────────
document.getElementById('restartBtn').addEventListener('click', () => {
  // 1. 텍스트 입력창 초기화
  const textInput = document.getElementById('textInput');
  if (textInput) {
    textInput.value = '';
  }
  const charCount = document.getElementById('charCount');
  if (charCount) {
    charCount.textContent = '0';
  }

  // 2. 스타일 입력창 초기화
  const styleInput = document.getElementById('styleInput');
  if (styleInput) {
    styleInput.value = '';
  }

  // 3. 음성 선택 드롭다운 초기화
  const voiceSelect = document.getElementById('voiceSelect');
  if (voiceSelect) {
    voiceSelect.value = '';
  }

  // 4. 고급설정 기본값 재설정
  const resetBtn = document.getElementById('resetAdvancedBtn');
  if (resetBtn) {
    resetBtn.click();
  }

  // 5. 로그 창 초기화 및 숨김
  const logWindow = document.getElementById('logWindow');
  if (logWindow) {
    logWindow.hidden = true;
  }
  const logContent = document.getElementById('logContent');
  if (logContent) {
    logContent.innerHTML = '';
  }

  // 6. 플레이어 카드 비활성화
  const card = document.getElementById('playerCard');
  if (card) {
    card.classList.add('player-disabled');
  }
  const voiceName = document.getElementById('playerVoiceName');
  if (voiceName) {
    voiceName.textContent = '—';
  }
  const duration = document.getElementById('playerDuration');
  if (duration) {
    duration.textContent = '0:00';
  }
  const pText = document.getElementById('playerText');
  if (pText) {
    pText.textContent = t('player.placeholder');
  }

  // 플레이어 오디오 정지 및 언로드
  if (player && player.el) {
    player.el.pause();
    player.el.removeAttribute('src');
  }

  // 플레이어 파형을 기동 상태의 모의 데이터로 초기화
  const mockPeaks = Array.from({length: 100}, (_, i) => {
    return 0.15 + 0.35 * Math.sin(i * 0.1) * Math.sin(i * 0.05) + 0.15 * Math.random();
  });
  player.peaks = mockPeaks;
  const mainWv = document.getElementById('main-wv-player');
  if (mainWv) {
    drawWaveform(mainWv, mockPeaks, 0);
  }

  // 7. 새로 시작 버튼 자기 자신을 다시 숨김
  document.getElementById('restartBtn').hidden = true;

  toast('화면이 초기화되었습니다.', 'success');
});

// ── Help modals ───────────────────────────────────────────────────────────────
const HELP = {
  cfg: {
    title: 'CFG 강도란?',
    html: `
      <p style="font-size:13.5px;line-height:1.75;color:var(--text-secondary);margin-bottom:14px">
        <b style="color:var(--text-primary)">CFG(Classifier-Free Guidance)</b>는 음성 스타일 설명을 얼마나 강하게 반영할지 조절하는 값입니다.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">낮음 1.0</span>
          <span style="color:var(--text-secondary);line-height:1.6">자연스럽고 유연한 음성. 스타일 반영이 약합니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:rgba(0,113,227,0.1);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--accent)">기본 2.0</span>
          <span style="color:var(--text-secondary);line-height:1.6">품질과 스타일 반영의 최적 균형점입니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">높음 3.0</span>
          <span style="color:var(--text-secondary);line-height:1.6">스타일이 강하게 적용됩니다. 너무 높으면 음질이 저하될 수 있습니다.</span>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-tertiary);margin-top:14px">권장 범위: 1.5 ~ 2.5</p>
    `,
  },
  steps: {
    title: '생성 단계란?',
    html: `
      <p style="font-size:13.5px;line-height:1.75;color:var(--text-secondary);margin-bottom:14px">
        <b style="color:var(--text-primary)">생성 단계(Inference Steps)</b>는 확산(Diffusion) 모델이 음성을 완성하기 위해 반복하는 횟수입니다.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">낮음 1–5</span>
          <span style="color:var(--text-secondary);line-height:1.6">빠른 생성. 품질이 상대적으로 낮을 수 있습니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:rgba(0,113,227,0.1);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--accent)">기본 10</span>
          <span style="color:var(--text-secondary);line-height:1.6">속도와 품질의 최적 균형점입니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">높음 30–50</span>
          <span style="color:var(--text-secondary);line-height:1.6">높은 품질. 생성 시간이 길어집니다.</span>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-tertiary);margin-top:14px">권장 범위: 10 ~ 30</p>
    `,
  },
  targetdb: {
    title: '볼륨 최대치란?',
    html: `
      <p style="font-size:13.5px;line-height:1.75;color:var(--text-secondary);margin-bottom:14px">
        생성된 음성의 <b style="color:var(--text-primary)">최대 피크 볼륨</b>을 지정한 dB 값으로 정규화합니다. 음성마다 제각각인 볼륨을 일정하게 맞춥니다.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">−20 dB</span>
          <span style="color:var(--text-secondary);line-height:1.6">매우 조용한 출력.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:rgba(0,113,227,0.1);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--accent)">기본 −6 dB</span>
          <span style="color:var(--text-secondary);line-height:1.6">충분한 헤드룸을 유지하면서 적당한 볼륨을 제공합니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">0 dB</span>
          <span style="color:var(--text-secondary);line-height:1.6">최대 볼륨. 클리핑 위험이 있을 수 있습니다.</span>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-tertiary);margin-top:14px">권장 범위: −12 ~ −3 dB</p>
    `,
  },
  speed: {
    title: '재생 속도란?',
    html: `
      <p style="font-size:13.5px;line-height:1.75;color:var(--text-secondary);margin-bottom:14px">
        피치(Pitch, 목소리 톤)의 변형 없이 **순수하게 말하는 속도(Speed)**만 조절합니다. 
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">0.5x</span>
          <span style="color:var(--text-secondary);line-height:1.6">원래 말하는 속도의 절반으로 매우 느리게 출력됩니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:rgba(0,113,227,0.1);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--accent)">기본 1.0x</span>
          <span style="color:var(--text-secondary);line-height:1.6">표준 속도입니다.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="background:var(--bg);border-radius:6px;padding:2px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary)">2.0x</span>
          <span style="color:var(--text-secondary);line-height:1.6">두 배 빠르게 속사포처럼 출력됩니다.</span>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-tertiary);margin-top:14px">권장 범위: 0.8x ~ 1.3x</p>
    `,
  },
};

function showInfoModal(title, htmlContent) {
  const overlay = document.getElementById('modalOverlay');
  const cancelBtn = document.getElementById('modalCancel');
  const confirmBtn = document.getElementById('modalConfirm');

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = htmlContent;

  confirmBtn.textContent = '확인';
  confirmBtn.style.cssText = '';
  confirmBtn.disabled = false;
  cancelBtn.hidden = true;

  overlay.hidden = false;

  const close = () => {
    cancelBtn.hidden = false;
    closeModal();
  };

  confirmBtn.onclick = close;
  overlay.onclick = e => { if (e.target === overlay) close(); };
  document.addEventListener('keydown', onEsc);
}

document.querySelectorAll('.btn-help').forEach(btn => {
  btn.addEventListener('click', () => {
    const h = HELP[btn.dataset.help];
    if (h) showInfoModal(h.title, h.html);
  });
});

// ── Quit button ───────────────────────────────────────────────────────────────
document.getElementById('quitBtn').addEventListener('click', () => {
  if (window.electronAPI) window.electronAPI.quit();
  else window.close();
});

// ── Generate button ───────────────────────────────────────────────────────────
document.getElementById('generateBtn').addEventListener('click', handleGenerate);

document.getElementById('textInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
});

// ── Download button ───────────────────────────────────────────────────────────
// Set as <a> in HTML; handled via href attribute in showPlayer()

// ── 음성 만들기 창 높이 동기화 ────────────────────────────────────────────────
let _createRO = null;

function startCreateSync() {
  if (!window.electronAPI) return;
  const inner = document.querySelector('.page-create-inner');
  if (!inner || _createRO) return;
  const sync = () => {
    const headerH = document.querySelector('.app-header')?.offsetHeight || 46;
    const footerH = document.querySelector('.app-footer')?.offsetHeight || 28;
    window.electronAPI.setHeight(headerH + footerH + inner.offsetHeight);
  };
  _createRO = new ResizeObserver(sync);
  _createRO.observe(inner);
  sync(); // 진입 즉시 1회 실행
}

function stopCreateSync() {
  if (_createRO) { _createRO.disconnect(); _createRO = null; }
}

// ── 페이지 전환 ───────────────────────────────────────────────────────────────
const VALID_PAGES = new Set(['home', 'create', 'history', 'register-voice', 'voices']);

let registerPageObserver = null;

function adjustWindowHeightForRegisterVoice() {
  if (typeof window.electronAPI === 'undefined' || typeof window.electronAPI.setHeight !== 'function') return;
  const container = document.querySelector('.register-voice-container');
  if (!container) return;

  // 앱 헤더 + 콘텐츠 + 푸터 높이 합산으로 우도 완벽한 창 높이 계산
  const header = document.querySelector('.app-header');
  const footer = document.querySelector('.app-footer, footer, .copyright-bar');
  const headerH = header ? header.getBoundingClientRect().height : 40;
  const footerH = footer ? footer.getBoundingClientRect().height : 36;
  const contentH = container.getBoundingClientRect().height || container.offsetHeight || 480;
  const totalHeight = Math.ceil(headerH + contentH + footerH) + 4; // 2px 상하 여유
  window.electronAPI.setHeight(totalHeight);
}

function startRegisterVoiceHeightObserver() {
  if (typeof window.ResizeObserver === 'undefined') return;
  if (registerPageObserver) {
    registerPageObserver.disconnect();
    registerPageObserver = null;
  }

  const container = document.querySelector('.register-voice-container');
  if (!container) return;

  registerPageObserver = new ResizeObserver(() => {
    requestAnimationFrame(adjustWindowHeightForRegisterVoice);
  });

  // container만 관찰 — body 관찰 시 피드백 루프 발생하므로 제외
  registerPageObserver.observe(container);
  adjustWindowHeightForRegisterVoice();
}

function stopRegisterVoiceHeightObserver() {
  if (registerPageObserver) {
    registerPageObserver.disconnect();
    registerPageObserver = null;
  }
}

function showPage(pageId) {
  if (!VALID_PAGES.has(pageId)) return;

  // 다른 페이지 전환 시 내 목소리 등록 페이지 자원 클린업
  if (pageId !== 'register-voice') {
    regPageCleanup();
    if (typeof registerPagePlayer !== 'undefined') {
      registerPagePlayer.stop();
    }
  }

  document.querySelectorAll('.page').forEach(p => { p.hidden = true; });
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  
  const page = document.getElementById(`page-${pageId}`);
  const nav  = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  
  if (page) page.hidden = false;
  if (nav)  nav.classList.add('active');
  
  try { localStorage.setItem('vox_page', pageId); } catch (_) {}

  if (pageId === 'create') startCreateSync();
  else stopCreateSync();

  if (pageId === 'voices') {
    renderMyVoices();
  } else if (pageId === 'register-voice') {
    renderRegisterVoiceList();
    // 현재 활성 탭에 맞춰 창 높이 즉시 설정
    if (typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setHeight === 'function') {
      const activeTabBtn = document.querySelector('#regSourceTabControl .segment-btn.active');
      const activeTab = activeTabBtn ? activeTabBtn.dataset.regTab : 'mic';
      const heights = { mic: 700, youtube: 940, file: 750 };
      window.electronAPI.setHeight(heights[activeTab] || 700);
    }
  } else {
    // 다른 페이지로 이동 시 기본 높이 복원
    if (typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setHeight === 'function') {
      window.electronAPI.setHeight(700);
    }
  }
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-nav]');
  if (el) showPage(el.dataset.nav);
});

// ── 사이드바 토글 ─────────────────────────────────────────────────────────────
document.getElementById('sidebarToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const collapsed = sidebar.classList.toggle('collapsed');
  try { localStorage.setItem('vox_sidebar', collapsed ? '1' : '0'); } catch (_) {}
});

// ── 카카오뱅크 후원 QR 모달 ──────────────────────────────────────────────────
const donateKakaoModal = document.getElementById('donateKakaoModal');
document.getElementById('btnDonateKakao').addEventListener('click', () => {
  donateKakaoModal.hidden = false;
});
document.getElementById('btnDonateKakaoClose').addEventListener('click', () => {
  donateKakaoModal.hidden = true;
});
donateKakaoModal.addEventListener('click', (e) => {
  if (e.target === donateKakaoModal) donateKakaoModal.hidden = true;
});

// ── History Selection Handlers ────────────────────────────────────────────────
document.getElementById('outputsList').addEventListener('change', e => {
  const chk = e.target.closest('.history-select-checkbox');
  if (!chk) return;
  const sid = String(chk.dataset.id);
  if (chk.checked) {
    selectedHistoryIds.add(sid);
  } else {
    selectedHistoryIds.delete(sid);
  }
  updateHistorySelectionUI();
});

const selectAllChk = document.getElementById('selectAllCheckbox');
if (selectAllChk) {
  selectAllChk.addEventListener('change', () => {
    if (selectAllChk.checked) {
      S.outputs.forEach(o => selectedHistoryIds.add(String(o.id)));
    } else {
      selectedHistoryIds.clear();
    }
    renderOutputs();
  });
}

const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
if (deleteSelectedBtn) {
  deleteSelectedBtn.addEventListener('click', async () => {
    if (selectedHistoryIds.size === 0) return;
    await confirmDelete(`선택한 ${selectedHistoryIds.size}개의 음성을 기록에서 삭제할까요?`, async () => {
      const idsToDelete = Array.from(selectedHistoryIds);
      idsToDelete.forEach(sid => {
        if (historyPlayer.activeId === String(sid)) {
          historyPlayer.el.pause();
          historyPlayer.activeId = null;
        }
      });
      await api('POST', '/api/outputs/delete-multiple', { ids: idsToDelete });
      selectedHistoryIds.clear();
      await refreshOutputs();
      renderOutputs();
      toast('선택한 음성이 삭제되었습니다.');
    });
  });
}

// ── 내 음성 관리 성별 필터링 탭 바인딩 ──────────────────────────────────────────
document.querySelectorAll('#voiceGenderTabControl .segment-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#voiceGenderTabControl .segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.voiceGenderTab = btn.dataset.genderTab;
    renderMyVoices();
  });
});

// ── 내 음성 관리 음성 종류 탭 바인딩 ──────────────────────────────────────────
const voiceTypeTabs = document.querySelectorAll('#voiceTypeTabControl .segment-btn');
if (voiceTypeTabs.length > 0) {
  voiceTypeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // 다른 탭 전환 시 인라인 재생 중인 오디오 정지 및 리셋
      if (myVoicePlayer) {
        if (myVoicePlayer.el && !myVoicePlayer.el.paused) {
          myVoicePlayer.el.pause();
        }
        if (myVoicePlayer.activeId) {
          myVoicePlayer.resetActiveUI(myVoicePlayer.activeId);
        }
        myVoicePlayer.activeId = null;
      }

      document.querySelectorAll('#voiceTypeTabControl .segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      renderMyVoices();
    });
  });
}


// ── '내 목소리 등록' 페이지 전용 비즈니스 로직 ──────────────────────────────────────
// 서브 판넬(유튜브/파일) 미리듣기를 위한 공유 오디오 객체
let regPanelPreviewAudio = new Audio();
let regPanelPreviewPlaying = false;
let regPanelPreviewType = null; // 'youtube' or 'file'
let regPanelPreviewUrl = null;

// 유튜브 및 파일 업로드 시 추출/업로드 정보 보관 변수
let ytExtractedAudioUrl = null;
let ytExtractedDuration = 0;
let uploadedFileObject = null;
let uploadedFileDuration = 0;
let uploadedFileUrl = null;

function extractYoutubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function stopRegPanelPreview() {
  regPanelPreviewAudio.pause();
  regPanelPreviewAudio.removeAttribute('src');
  regPanelPreviewPlaying = false;
  regPanelPreviewType = null;
  regPanelPreviewUrl = null;
  
  // 유튜브 임베드 플레이어 동영상 정지 연동
  if (ytIframePlayerInstance && typeof ytIframePlayerInstance.pauseVideo === 'function') {
    try {
      ytIframePlayerInstance.pauseVideo();
    } catch (_) {}
  }

  // UI 상태 복구
  const ytPlayBtn = document.getElementById('ytPlayBtn');
  if (ytPlayBtn) {
    ytPlayBtn.classList.remove('playing');
    ytPlayBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> <span>미리듣기</span>`;
  }
  const filePlayBtn = document.getElementById('filePlayBtn');
  if (filePlayBtn) {
    filePlayBtn.classList.remove('playing');
    filePlayBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> <span>미리듣기</span>`;
  }
}

// 오디오 재생기 리스너 등록
regPanelPreviewAudio.addEventListener('ended', stopRegPanelPreview);

let tempRecordings = []; // 임시 녹음본 목록 보관 배열 ({ id, seconds, blob, url, name, gender })

let registerPagePlayer = {
  el: null,
  activeId: null,
  analyser: null,
  audioCtx: null,
  source: null,
  animationFrameId: null,
  init() {
    this.el = new Audio();
    this.el.addEventListener('ended', () => {
      this.stop();
    });
  },
  setupWebAudio() {
    if (this.audioCtx) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; // 주파수 데이터를 간결하게 출력하도록 설정
      
      const source = audioCtx.createMediaElementSource(this.el);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      this.audioCtx = audioCtx;
      this.analyser = analyser;
      this.source = source;
    } catch (err) {
      console.error("[Sori-Dam] Web Audio setup failed:", err);
    }
  },
  stop() {
    this.el.pause();
    this.el.removeAttribute('src');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const activeId = this.activeId;
    this.activeId = null;
    if (activeId) {
      const card = document.getElementById(`temp-card-${activeId}`);
      if (card) card.classList.remove('playing');
      const btn = document.getElementById(`btn-play-${activeId}`);
      if (btn) {
        btn.classList.remove('playing');
        btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M8 5v14l11-7z"/></svg> 미리듣기`;
      }
      // inline-player 숨김
      const inlinePlayer = document.getElementById(`tip-${activeId}`);
      if (inlinePlayer) { inlinePlayer.innerHTML = ''; inlinePlayer.hidden = true; }
    }
  }
};

let regPageMediaRecorder = null;
let regPageChunks = [];
let regPageRecordedBlob = null;
let regPageStream = null;
let regPageTimerInterval = null;
let regPageSeconds = 0;
let regPageIsRecording = false;

// 실시간 시각화를 위한 Web Audio API 변수
let regPageAudioContext = null;
let regPageAnalyser = null;
let regPageDataArray = null;
let regPageAnimationFrameId = null;
let regPageSource = null;

function regPageCleanup() {
  clearInterval(regPageTimerInterval);
  if (regPageAnimationFrameId) {
    cancelAnimationFrame(regPageAnimationFrameId);
    regPageAnimationFrameId = null;
  }
  if (regPageSource) {
    regPageSource.disconnect();
    regPageSource = null;
  }
  if (regPageAudioContext && regPageAudioContext.state !== 'closed') {
    regPageAudioContext.close();
    regPageAudioContext = null;
  }
  if (regPageMediaRecorder && regPageMediaRecorder.state !== 'inactive') {
    try { regPageMediaRecorder.stop(); } catch {}
  }
  if (regPageStream) {
    regPageStream.getTracks().forEach(t => t.stop());
    regPageStream = null;
  }
  
  // 공유 미리듣기 플레이어 자원 해제
  stopRegPanelPreview();
  
  // 캔버스 클리어
  const canvas = document.getElementById('registerWaveCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// 녹음 버튼 클릭 핸들러
async function handleRegPageBtnClick() {
  const recBtn = document.getElementById('regPageBtn');
  const timerEl = document.getElementById('regPageTimer');
  const statusEl = document.getElementById('regPageStatus');

  if (!regPageIsRecording) {
    // ⚠️ 시작 시 무조건 주의사항 필수 동의 모달을 먼저 거친다!
    const consentContent = `
      <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary); margin-bottom: 16px;">
        <div style="background: rgba(255, 69, 58, 0.08); border: 1px solid rgba(255, 69, 58, 0.15); padding: 12px 16px; border-radius: 8px; color: #ff453a; font-weight: 600; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0; margin-top:2px;" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>녹음 전 필수 주의사항 안내</span>
        </div>
        <p style="margin: 0 0 16px 0; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-primary);">
          "반드시 본인의 음성만 사용해야 하며 타인의 목소리를 동의 없이 무단 사용하면 목소리 주체에 대한 부정경쟁방지법 위반이나 퍼블리시티권(인격권) 침해로 막대한 민사상 손해배상 책임이 발생할 수 있으며, 사안에 따라 형사 고소 대상이 될 수 있습니다."
        </p>
        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; user-select: none; border-top: 1px solid var(--border-light); padding-top: 12px; margin-top: 12px; color: var(--text-primary);">
          <input type="checkbox" id="pageConsentCheckbox" style="width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer;">
          <span style="font-weight: 600;">위 주의사항을 확인하였으며, 이에 동의합니다.</span>
        </label>
      </div>
    `;

    openModal('음성 녹음 동의', consentContent, async () => {
      const checked = document.getElementById('pageConsentCheckbox').checked;
      if (!checked) {
        toast('주의사항에 동의해야 녹음을 시작할 수 있습니다.', 'error');
        return false;
      }
      
      // 모달 닫힌 후 녹음 본격 작동
      setTimeout(async () => {
        try {
          regPageStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          toast('마이크 접근 권한이 필요합니다.', 'error');
          return;
        }

        regPageChunks = [];
        regPageSeconds = 0;
        regPageRecordedBlob = null;
        timerEl.textContent = '0:00';

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : '';

        regPageMediaRecorder = new MediaRecorder(regPageStream, mimeType ? { mimeType } : {});
        regPageMediaRecorder.ondataavailable = e => { if (e.data.size > 0) regPageChunks.push(e.data); };
        regPageMediaRecorder.onstop = () => {
          regPageRecordedBlob = new Blob(regPageChunks, { type: regPageMediaRecorder.mimeType });
          const url = URL.createObjectURL(regPageRecordedBlob);
          
          // 임시 리스트에 추가!
          const tempId = Date.now().toString();
          tempRecordings.push({
            id: tempId,
            seconds: regPageSeconds,
            blob: regPageRecordedBlob,
            url: url,
            name: '',
            gender: '여성',
            voice_type: 'my_voice',
            source_type: 'mic'
          });
          
          renderRegisterVoiceList();
          toast('임시 음성 녹음이 완료되어 오른쪽에 추가되었습니다.', 'success');
        };

        regPageMediaRecorder.start(100);
        regPageIsRecording = true;
        recBtn.classList.add('recording');
        recBtn.querySelector('span').style.borderRadius = '6px';
        recBtn.querySelector('span').style.width = '26px';
        recBtn.querySelector('span').style.height = '26px';
        statusEl.textContent = '녹음 중… 버튼을 다시 눌러 정지';

        // 백그라운드 캔버스 오실로스코프 기동
        try {
          regPageAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          regPageAnalyser = regPageAudioContext.createAnalyser();
          regPageAnalyser.fftSize = 256;
          const bufferLength = regPageAnalyser.frequencyBinCount;
          regPageDataArray = new Uint8Array(bufferLength);

          regPageSource = regPageAudioContext.createMediaStreamSource(regPageStream);
          regPageSource.connect(regPageAnalyser);

          const canvas = document.getElementById('registerWaveCanvas');
          const ctx = canvas.getContext('2d');
          
          const resizeCanvas = () => {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
          };
          resizeCanvas();

          const draw = () => {
            if (!regPageIsRecording) return;
            regPageAnimationFrameId = requestAnimationFrame(draw);

            regPageAnalyser.getByteTimeDomainData(regPageDataArray);

            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            gradient.addColorStop(0, 'rgba(255, 69, 58, 0.01)');
            gradient.addColorStop(0.3, 'rgba(255, 69, 58, 0.32)');
            gradient.addColorStop(0.5, 'rgba(255, 69, 58, 0.65)');
            gradient.addColorStop(0.7, 'rgba(255, 69, 58, 0.32)');
            gradient.addColorStop(1, 'rgba(255, 69, 58, 0.01)');

            ctx.lineWidth = 3.5 * window.devicePixelRatio;
            ctx.strokeStyle = gradient;
            ctx.beginPath();

            const sliceWidth = w / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const v = regPageDataArray[i] / 128.0;
              const y = (v * h) / 2;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.lineTo(w, h / 2);
            ctx.stroke();
          };

          draw();
        } catch (err) {
          console.error('Page audio visualization failed:', err);
        }

        regPageTimerInterval = setInterval(() => {
          regPageSeconds++;
          const m = Math.floor(regPageSeconds / 60);
          const s = regPageSeconds % 60;
          timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;

          if (regPageSeconds >= 30) {
            // 30초 도달 시 자동 정지
            clearInterval(regPageTimerInterval);
            stopRecordingSession(true);
          }
        }, 1000);

      }, 150);
      
      return true;
    });

  } else {
    // 녹음 수동 정지
    clearInterval(regPageTimerInterval);
    stopRecordingSession(false);
  }
}

function stopRecordingSession(isLimitReached = false) {
  const recBtn = document.getElementById('regPageBtn');
  const timerEl = document.getElementById('regPageTimer');
  const statusEl = document.getElementById('regPageStatus');

  if (regPageAnimationFrameId) {
    cancelAnimationFrame(regPageAnimationFrameId);
    regPageAnimationFrameId = null;
  }
  if (regPageSource) {
    regPageSource.disconnect();
    regPageSource = null;
  }
  if (regPageAudioContext && regPageAudioContext.state !== 'closed') {
    regPageAudioContext.close();
    regPageAudioContext = null;
  }
  
  if (regPageMediaRecorder && regPageMediaRecorder.state === 'recording') {
    regPageMediaRecorder.stop();
  }
  if (regPageStream) {
    regPageStream.getTracks().forEach(t => t.stop());
  }

  regPageIsRecording = false;
  recBtn.classList.remove('recording');
  recBtn.querySelector('span').style.borderRadius = '50%';
  recBtn.querySelector('span').style.width = '28px';
  recBtn.querySelector('span').style.height = '28px';

  if (isLimitReached) {
    statusEl.textContent = `✓ 30초 제한 도달 — 임시 저장 완료`;
    toast('최대 녹음 시간(30초)에 도달하여 녹음이 자동 종료되었습니다.', 'info');
  } else {
    statusEl.textContent = regPageSeconds < 3
      ? `⚠ ${regPageSeconds}초 녹음됨 — 3초 이상 필요합니다`
      : regPageSeconds > 30
      ? `⚠ ${regPageSeconds}초 녹음됨 — 최대 30초까지만 가능합니다`
      : `✓ ${regPageSeconds}초 녹음 완료`;
  }

  // 캔버스 클리어
  const canvas = document.getElementById('registerWaveCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function renderRegisterVoiceList() {
  const container = document.getElementById('tempRecordingsList');
  const countEl = document.getElementById('tempRecordingsCount');
  if (!container) return;

  countEl.textContent = `${tempRecordings.length}개`;

  // 탭별 empty-state는 유지하고, 그 외 동적 카드만 제거
  Array.from(container.children).forEach(child => {
    if (!child.classList.contains('tab-empty-state')) {
      child.remove();
    }
  });

  if (tempRecordings.length === 0) {
    // 현재 활성 탭의 empty-state만 표시 (switchRightEmptyState는 전역 함수가 아니므로 직접 처리)
    const activeTabBtn = document.querySelector('#regSourceTabControl .segment-btn.active');
    const activeTab = activeTabBtn ? activeTabBtn.dataset.regTab : 'mic';
    document.querySelectorAll('.tab-empty-state').forEach(el => el.style.display = 'none');
    const emptyTarget = document.getElementById(`emptyState-${activeTab}`);
    if (emptyTarget) emptyTarget.style.display = 'block';
    return;
  }

  // 항목이 있으면 empty-state 모두 숨김
  document.querySelectorAll('.tab-empty-state').forEach(el => el.style.display = 'none');


  tempRecordings.forEach((item) => {
    const isPlaying = registerPagePlayer.activeId === item.id;
    const card = document.createElement('div');
    card.className = `recording-card ${isPlaying ? 'playing' : ''}`;
    card.id = `temp-card-${item.id}`;

    let iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
    let sourceLabel = `임시 녹음본`;

    if (item.source_type === 'youtube') {
      iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>`;
      sourceLabel = `유튜브 추출본`;
    } else if (item.source_type === 'file') {
      iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
      sourceLabel = `오디오 파일본`;
    }
    
    card.innerHTML = `
      <!-- 카드 헤더 (녹음 인덱스 및 삭제) -->
      <div class="recording-card-header">
        <span class="recording-card-title" style="display:inline-flex; align-items:center; gap:4px;">
          ${iconSvg}
          ${sourceLabel} (${item.seconds}초)
        </span>
        <button type="button" class="btn-delete-temp" data-id="${item.id}" style="background:transparent; border:none; color:var(--text-tertiary); cursor:pointer; padding:2px; display:flex; align-items:center; transition:color 0.2s;" onmouseover="this.style.color='#ff453a'" onmouseout="this.style.color='var(--text-tertiary)'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>

      <!-- 인라인 플레이어 영역 (재생 시에만 표시) -->
      <div class="temp-inline-player" id="tip-${item.id}" hidden></div>

      <!-- 카드 바디 (이름 입력 및 분류, 성별 세그먼트) -->
      <div class="recording-card-body" style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">음성 이름</label>
          <input type="text" class="input temp-name-input" data-id="${item.id}" value="${item.name}" placeholder="예: 내 시그니처 목소리" style="padding:6px 10px; font-size:12.5px;">
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">음성 분류</label>
          <select class="input temp-type-select" data-id="${item.id}" style="padding:6px 10px; font-size:12.5px; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-light); border-radius: 6px; outline: none;">
            <option value="my_voice" ${item.voice_type === 'my_voice' ? 'selected' : ''}>내 목소리</option>
            <option value="female_actor" ${item.voice_type === 'female_actor' ? 'selected' : ''}>Ai성우 - 여성</option>
            <option value="male_actor" ${item.voice_type === 'male_actor' ? 'selected' : ''}>Ai성우 - 남성</option>
          </select>
        </div>
        <div class="temp-gender-wrap" id="temp-gender-wrap-${item.id}" style="display:${item.voice_type === 'my_voice' ? 'flex' : 'none'}; flex-direction:column; gap:4px; margin-top:2px;">
          <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">성별</label>
          <div class="segment-control temp-gender-seg" data-id="${item.id}" style="margin-top:2px; padding:2px; height:28px;">
            <button type="button" class="segment-btn ${item.gender === '여성' ? 'active' : ''}" data-gender="여성" style="font-size:11.5px; padding:2px 8px;">여성</button>
            <button type="button" class="segment-btn ${item.gender === '남성' ? 'active' : ''}" data-gender="남성" style="font-size:11.5px; padding:2px 8px;">남성</button>
          </div>
        </div>
      </div>

      <!-- 카드 액션 (재생 및 정식 등록) -->
      <div class="recording-card-actions" style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn-mini-play ${isPlaying ? 'playing' : ''}" id="btn-play-${item.id}" data-id="${item.id}">
            ${isPlaying
              ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> 정지`
              : `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M8 5v14l11-7z"/></svg> 미리듣기`
            }
          </button>
          <button type="button" class="btn-mini-trim btn btn-xs btn-ghost" data-id="${item.id}" style="padding:3px 7px; font-size:10.5px; font-weight:600; display:inline-flex; align-items:center; gap:3px; border:1px solid var(--border-light);" title="트림 편집">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
            편집
          </button>
        </div>
        <button type="button" class="btn btn-primary btn-sm btn-register-temp" data-id="${item.id}" style="padding:5px 12px; font-size:12px; font-weight:600; border-radius:6px;">
          내 음성으로 등록하기
        </button>
      </div>`;

    container.appendChild(card);
  });

  // 이벤트 바인딩
  // 1. 이름 입력 동기화
  container.querySelectorAll('.temp-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const rec = tempRecordings.find(r => r.id === id);
      if (rec) rec.name = e.target.value;
    });
  });

  // 2. 음성 분류 선택 동기화 및 성별 랩 토글
  container.querySelectorAll('.temp-type-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const rec = tempRecordings.find(r => r.id === id);
      if (rec) {
        rec.voice_type = e.target.value;
        const genderWrap = document.getElementById(`temp-gender-wrap-${id}`);
        if (rec.voice_type === 'my_voice') {
          if (genderWrap) genderWrap.style.display = 'flex';
        } else {
          if (genderWrap) genderWrap.style.display = 'none';
          rec.gender = rec.voice_type === 'female_actor' ? '여성' : '남성';
        }
      }
    });
  });

  // 3. 성별 세그먼트 동기화
  container.querySelectorAll('.temp-gender-seg').forEach(seg => {
    seg.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const id = seg.dataset.id;
        const rec = tempRecordings.find(r => r.id === id);
        if (rec) rec.gender = btn.dataset.gender;
      });
    });
  });

  // 4. 삭제 버튼
  container.querySelectorAll('.btn-delete-temp').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (registerPagePlayer.activeId === id) {
        registerPagePlayer.stop();
      }
      tempRecordings = tempRecordings.filter(r => r.id !== id);
      renderRegisterVoiceList();
      toast('임시 음성이 삭제되었습니다.', 'success');
    });
  });

  // 5. 최종 AI 등록 실행
  container.querySelectorAll('.btn-register-temp').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const item = tempRecordings.find(r => r.id === id);
      if (!item) return;

      if (item.seconds < 3) { toast('3초 이상 녹음된 목소리여야 합니다.', 'error'); return; }
      if (item.seconds > 30) { toast('최대 30초 이하의 목소리여야 합니다.', 'error'); return; }
      const name = item.name.trim();
      if (!name) { toast('음성 이름을 입력해주세요.', 'error'); return; }

      // ── WAV 변환 및 전송 시작 ──
      toast('WAV 오디오 포맷 변환 및 등록 중...', 'info');
      let wavBlob;
      if (item.source_type === 'youtube' || (item.blob && item.blob.type === 'audio/wav')) {
        // 이미 백엔드에서 정밀 mono WAV로 추출 완료되었으므로 불필요한 브라우저 디코딩 재변환 우회
        wavBlob = item.blob;
      } else {
        try {
          wavBlob = await convertBlobToWav(item.blob);
        } catch (err) {
          toast('오디오 포맷 변환에 실패했습니다: ' + err.message, 'error');
          return;
        }
      }

      const file = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
      const fd = new FormData();
      fd.append('name', name);
      fd.append('gender', item.gender);
      fd.append('audio', file);
      fd.append('voice_type', item.voice_type || 'my_voice');

      try {
        await api('POST', '/api/voices', fd);
        
        // 정식 등록 성공 시 임시 목록에서 삭제 및 리렌더링
        if (registerPagePlayer.activeId === id) {
          registerPagePlayer.stop();
        }
        tempRecordings = tempRecordings.filter(r => r.id !== id);
        renderRegisterVoiceList();

        // 관리 목록 및 선택 드롭다운 갱신
        await refreshMyVoices();
        renderMyVoices();
        renderVoiceSelect();
        
        toast(`"${name}" 목소리가 내 AI 음성에 완벽하게 등록되었습니다!`, 'success');
      } catch (e) {
        toast('음성 등록 실패: ' + e.message, 'error');
      }
    });
  });

  // 6. 트림 버튼
  container.querySelectorAll('.btn-mini-trim').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openTrimModal(id);
    });
  });

  // 7. 미니 플레이 버튼 (재생/정지) 및 시각화 바인딩
  container.querySelectorAll('.btn-mini-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = tempRecordings.find(r => r.id === id);
      if (!item) return;

      if (registerPagePlayer.activeId === id) {
        // 이미 재생 중이면 정지
        registerPagePlayer.stop();
      } else {
        // 다른 파일이 재생 중이었다면 정지 후 새로 재생
        if (registerPagePlayer.activeId) {
          registerPagePlayer.stop();
        }
        playTempRecording(item);
      }
    });
  });
}

function playTempRecording(item) {
  registerPagePlayer.activeId = item.id;

  // UI 갱신
  const card = document.getElementById(`temp-card-${item.id}`);
  if (card) card.classList.add('playing');
  const btn = document.getElementById(`btn-play-${item.id}`);
  if (btn) {
    btn.classList.add('playing');
    btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> 정지`;
  }

  // inline-player-box 렌더링 (생성 기록과 동일한 구조)
  const container = document.getElementById(`tip-${item.id}`);
  if (container) {
    container.innerHTML = `
      <div class="inline-player-box" style="margin-top:8px; margin-bottom:4px;">
        <div class="inline-player-controls">
          <button class="inline-play-circle" id="tipc-${item.id}" aria-label="재생/일시정지">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path id="tipi-${item.id}" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
          <div class="inline-player-progress">
            <div class="waveform-seek-container">
              <canvas class="waveform-visual" id="tip-wv-${item.id}"></canvas>
              <input type="range" id="tisb-${item.id}" class="inline-seek-bar" min="0" max="100" value="0" step="0.1">
            </div>
            <div class="inline-player-times">
              <span id="tict-${item.id}">0:00</span>
              <span id="titt-${item.id}">0:00</span>
            </div>
          </div>
        </div>
      </div>`;
    container.hidden = false;

    // 파형 데이터 로딩
    getWaveformData(item.url, 75).then(peaks => {
      const canvas = document.getElementById(`tip-wv-${item.id}`);
      if (canvas) drawWaveform(canvas, peaks, 0);

      // 재생 중 시간 업데이트
      const tickFn = () => {
        if (registerPagePlayer.activeId !== item.id) return;
        const el = registerPagePlayer.el;
        // Blob 녹음음 duration이 Infinity로 잡히므로 item.seconds를 fallback으로 사용
        const dur = (isFinite(el.duration) && el.duration > 0) ? el.duration : item.seconds;
        const pct = dur ? (el.currentTime / dur) * 100 : 0;
        const curT = document.getElementById(`tict-${item.id}`);
        const totT = document.getElementById(`titt-${item.id}`);
        const seek = document.getElementById(`tisb-${item.id}`);
        const icon = document.getElementById(`tipi-${item.id}`);
        if (curT) curT.textContent = fmtTime(el.currentTime);
        if (totT) totT.textContent = fmtTime(dur);
        if (seek) seek.value = pct;
        if (canvas) drawWaveform(canvas, peaks, pct);
        if (icon) icon.setAttribute('d', el.paused ? 'M8 5v14l11-7z' : 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
        registerPagePlayer.animationFrameId = requestAnimationFrame(tickFn);
      };
      registerPagePlayer.animationFrameId = requestAnimationFrame(tickFn);
    });

    // seek 슬라이더
    const seek = document.getElementById(`tisb-${item.id}`);
    if (seek) {
      seek.addEventListener('input', () => {
        const el = registerPagePlayer.el;
        const dur = (isFinite(el.duration) && el.duration > 0) ? el.duration : item.seconds;
        if (dur) el.currentTime = dur * (seek.value / 100);
      });
    }

    // 원형 재생/일시정지 버튼
    const circleBtn = document.getElementById(`tipc-${item.id}`);
    if (circleBtn) {
      circleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = registerPagePlayer.el;
        if (el.paused) el.play();
        else el.pause();
      });
    }
  }

  // 오디오 재생
  registerPagePlayer.el.src = item.url;
  registerPagePlayer.el.play().catch(err => {
    console.error('Audio play failed:', err);
    registerPagePlayer.stop();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  // 플랫폼별 body 클래스 분기 추가
  try {
    if (navigator.userAgent.includes('Windows') || navigator.platform.includes('Win')) {
      document.body.classList.add('is-windows');
    } else {
      document.body.classList.add('is-mac');
    }
  } catch (_) {}



  // 사이드바 상태 복원
  try {
    if (localStorage.getItem('vox_sidebar') === '1') {
      document.getElementById('sidebar').classList.add('collapsed');
    }
  } catch (_) {}

  player.init();
  historyPlayer.init();
  myVoicePlayer.init();
  if (typeof registerPagePlayer !== 'undefined') {
    registerPagePlayer.init();
  }
  
  const regPageBtn = document.getElementById('regPageBtn');
  if (regPageBtn) {
    regPageBtn.addEventListener('click', handleRegPageBtnClick);
  }

  // ── '내 목소리 등록' 3대 서브 탭 스위칭 제어 ──
  const regSourceTabs = document.querySelectorAll('#regSourceTabControl .segment-btn');
  regSourceTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1. 기존 재생 및 마이크 녹음 상태 전부 해제
      if (typeof regPageIsRecording !== 'undefined' && regPageIsRecording) {
        clearInterval(regPageTimerInterval);
        stopRecordingSession(false);
      }
      registerPagePlayer.stop();
      stopRegPanelPreview();

      // 2. 탭 활성화 클래스 전환
      regSourceTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 3. 판넬 토글
      const activeTab = btn.dataset.regTab;
      document.querySelectorAll('.reg-panel').forEach(panel => {
        panel.style.display = 'none';
        panel.setAttribute('hidden', 'true');
      });
      const activePanel = document.getElementById(`regPanel-${activeTab}`);
      if (activePanel) {
        activePanel.style.display = 'flex';
        activePanel.removeAttribute('hidden');
      }
      // 탭별 창 높이 조정
      switchRegTabHeight(activeTab);
    });
  });

  // ── 탭별 창 높이 조정 (Electron 전용) ──
  function switchRegTabHeight(tab) {
    if (typeof window.electronAPI === 'undefined' || typeof window.electronAPI.setHeight !== 'function') return;

    if (tab === 'youtube') {
      // 유튜브 탭: 플레이어가 이미 표시 중이면 포함해서 높이 계산
      const playerContainer = document.getElementById('ytPlayerContainer');
      const isPlayerVisible = playerContainer &&
        !playerContainer.hidden &&
        playerContainer.style.display !== 'none';
      if (isPlayerVisible) {
        requestAnimationFrame(() => {
          const panel = document.getElementById('regPanel-youtube');
          const panelW = panel ? panel.getBoundingClientRect().width : 400;
          const playerH = Math.round(panelW * 0.5625);
          window.electronAPI.setHeight(700 + playerH + 60);
        });
      } else {
        window.electronAPI.setHeight(700);
      }
    } else {
      const heights = { mic: 700, file: 750 };
      window.electronAPI.setHeight(heights[tab] || 700);
    }
  }

  // ── 탭 전환 시 오른쪽 빈 상태 메시지 전환 ──
  function switchRightEmptyState(tab) {
    // 임시 목록에 항목이 있으면 empty-state 전체 숨김
    if (typeof tempRecordings !== 'undefined' && tempRecordings.length > 0) {
      document.querySelectorAll('.tab-empty-state').forEach(el => el.style.display = 'none');
      return;
    }
    document.querySelectorAll('.tab-empty-state').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`emptyState-${tab}`);
    if (target) target.style.display = 'block';
  }

  // 탭 전환 이벤트에 오른쪽 메시지 전환 연결
  regSourceTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.regTab;
      switchRightEmptyState(tab);
    });
  });
  // 초기 상태 (mic 탭이 기본)
  switchRightEmptyState('mic');
  switchRegTabHeight('mic');

  // ── 동의 모달 공용 함수 ──
  // callback: 동의 확인 후 실행할 함수
  function showConsentThen(callback) {
    const consentContent = `
      <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary); margin-bottom: 16px;">
        <div style="background: rgba(255, 69, 58, 0.08); border: 1px solid rgba(255, 69, 58, 0.15); padding: 12px 16px; border-radius: 8px; color: #ff453a; font-weight: 600; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0; margin-top:2px;" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>필수 주의사항 안내</span>
        </div>
        <p style="margin: 0 0 16px 0; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-primary);">
          "반드시 본인의 음성만 사용해야 하며 타인의 목소리를 동의 없이 무단 사용하면 목소리 주체에 대한 부정경쟁방지법 위반이나 퍼블리시티권(인격권) 침해로 막대한 민사상 손해배상 책임이 발생할 수 있으며, 사안에 따라 형사 고소 대상이 될 수 있습니다."
        </p>
        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; user-select: none; border-top: 1px solid var(--border-light); padding-top: 12px; margin-top: 12px; color: var(--text-primary);">
          <input type="checkbox" id="pageConsentCheckbox" style="width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer;">
          <span style="font-weight: 600;">위 주의사항을 확인하였으며, 이에 동의합니다.</span>
        </label>
      </div>
    `;
    openModal('음성 등록 동의', consentContent, () => {
      const checked = document.getElementById('pageConsentCheckbox').checked;
      if (!checked) {
        toast('주의사항에 동의해야 진행할 수 있습니다.', 'error');
        return false;
      }
      if (typeof callback === 'function') callback();
    });
  }

  // ── 유튜브 오디오 추출 이벤트 제어 ──
  const ytUrlInput = document.getElementById('ytUrlInput');
  const ytPlayerContainer = document.getElementById('ytPlayerContainer');

  let ytVideoTotalDuration = 0;
  let ytVideoTitleString = "";

  // ── 유튜브 진행바 및 플레이어 API 핸들러들 ──
  function bindYoutubePlayerApi(videoId) {
    if (!window.YT || !window.YT.Player) {
      setTimeout(() => bindYoutubePlayerApi(videoId), 300);
      return;
    }

    if (ytIframePlayerInstance) {
      try { ytIframePlayerInstance.destroy(); } catch (_) {}
      ytIframePlayerInstance = null;
    }

    const placeholderWrapper = document.getElementById('ytPlayerPlaceholderWrapper');
    if (placeholderWrapper) {
      placeholderWrapper.innerHTML = '<div id="ytPlayerPlaceholder" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"></div>';
    }

    try {
      ytIframePlayerInstance = new window.YT.Player('ytPlayerPlaceholder', {
        videoId: videoId,
        playerVars: {
          'enablejsapi': 1,
          'rel': 0,
          'playsinline': 1
        },
        events: {
          'onStateChange': onPlayerStateChange,
          'onReady': onPlayerReady
        }
      });
    } catch (err) {
      console.error("[Sori-Dam] YT player API binding fail:", err);
    }
  }

  function onPlayerReady(event) {
    const duration = event.target.getDuration();
    if (duration > 0) {
      ytVideoTotalDuration = Math.round(duration);
      
      const durationTextEl = document.getElementById('ytVideoDurationText');
      if (durationTextEl) {
        const min = Math.floor(ytVideoTotalDuration / 60);
        const sec = ytVideoTotalDuration % 60;
        durationTextEl.textContent = min > 0 ? `${min}분 ${sec}초 (${ytVideoTotalDuration}초)` : `${sec}초`;
      }
      
      const ytStartSec = document.getElementById('ytStartSec');
      const ytEndSec = document.getElementById('ytEndSec');
      if (ytStartSec) ytStartSec.max = ytVideoTotalDuration;
      if (ytEndSec) {
        ytEndSec.max = ytVideoTotalDuration;
        ytEndSec.value = Math.min(30, ytVideoTotalDuration);
      }
    }
  }

  function onPlayerStateChange(event) {
    if (event.data === 1) {
      startYtProgressPolling();
    } else {
      stopYtProgressPolling();
    }
  }

  function startYtProgressPolling() {
    if (ytProgressInterval) clearInterval(ytProgressInterval);
    ytProgressInterval = setInterval(updateYtProgressUI, 200);
  }

  function stopYtProgressPolling() {
    if (ytProgressInterval) {
      clearInterval(ytProgressInterval);
      ytProgressInterval = null;
    }
  }

  function updateYtProgressUI() {
    if (!ytIframePlayerInstance || typeof ytIframePlayerInstance.getCurrentTime !== 'function') return;

    try {
      const curTime = ytIframePlayerInstance.getCurrentTime() || 0;
      const totalTime = ytIframePlayerInstance.getDuration() || ytVideoTotalDuration || 0;

      if (totalTime > 0) {
        const percent = (curTime / totalTime) * 100;
        const fillBar = document.getElementById('ytProgressFill');
        if (fillBar) {
          fillBar.style.width = `${percent}%`;
        }

        const timeText = document.getElementById('ytProgressTimeText');
        if (timeText) {
          const curMin = Math.floor(curTime / 60);
          const curSec = Math.floor(curTime % 60);
          const totalMin = Math.floor(totalTime / 60);
          const totalSec = Math.floor(totalTime % 60);

          const formatCur = `${curMin}:${curSec.toString().padStart(2, '0')}`;
          const formatTotal = `${totalMin}:${totalSec.toString().padStart(2, '0')}`;

          timeText.textContent = `${formatCur} / ${formatTotal} (현재: ${Math.floor(curTime)}초)`;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function updateYoutubePlayer() {
    if (!ytUrlInput) return;
    const url = ytUrlInput.value.trim();
    const videoId = extractYoutubeVideoId(url);

    const infoBox = document.getElementById('ytInfoBox');
    const videoTitleEl = document.getElementById('ytVideoTitle');
    const durationTextEl = document.getElementById('ytVideoDurationText');
    const ytStartSec = document.getElementById('ytStartSec');
    const ytEndSec = document.getElementById('ytEndSec');
    const progressContainer = document.getElementById('ytProgressContainer');

    if (videoId) {
      ytPlayerContainer.style.display = 'block';
      ytPlayerContainer.removeAttribute('hidden');

      // 플레이어가 나타날 때 창 높이 자연스럽게 증가
      if (typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setHeight === 'function') {
        requestAnimationFrame(() => {
          const panel = document.getElementById('regPanel-youtube');
          const panelW = panel ? panel.getBoundingClientRect().width : 400;
          const playerH = Math.round(panelW * 0.5625); // 16:9 aspect ratio
          // 기본 700px + 플레이어 높이 + 구간설정 콘트롤 업데이트 여백
          window.electronAPI.setHeight(700 + playerH + 60);
        });
      }

      // 진행 바 노출 및 초기화
      if (progressContainer) {
        progressContainer.style.display = 'flex';
        progressContainer.removeAttribute('hidden');
        const fill = document.getElementById('ytProgressFill');
        if (fill) fill.style.width = '0%';
        const text = document.getElementById('ytProgressTimeText');
        if (text) text.textContent = '0:00 / 0:00 (현재: 0초)';
      }

      // YouTube API 바인딩
      bindYoutubePlayerApi(videoId);

      // 유튜브 동영상 정보 로딩 시작
      if (infoBox) {
        infoBox.style.display = 'flex';
        infoBox.removeAttribute('hidden');
      }
      if (videoTitleEl) videoTitleEl.textContent = "동영상 정보를 분석 중입니다...";
      if (durationTextEl) durationTextEl.textContent = "계산 중...";

      try {
        const res = await api('GET', `/api/youtube/info?url=${encodeURIComponent(url)}`);
        ytVideoTotalDuration = res.duration || 0;
        ytVideoTitleString = res.title || "유튜브 동영상";

        if (videoTitleEl) videoTitleEl.textContent = ytVideoTitleString;
        if (durationTextEl) {
          const min = Math.floor(ytVideoTotalDuration / 60);
          const sec = ytVideoTotalDuration % 60;
          durationTextEl.textContent = min > 0 ? `${min}분 ${sec}초 (${ytVideoTotalDuration}초)` : `${sec}초`;
        }

        // 인풋 최댓값 보정
        if (ytStartSec) {
          ytStartSec.max = ytVideoTotalDuration;
        }
        if (ytEndSec) {
          ytEndSec.max = ytVideoTotalDuration;
          ytEndSec.value = Math.min(30, ytVideoTotalDuration);
        }
      } catch (err) {
        console.error(err);
        if (videoTitleEl) videoTitleEl.textContent = "동영상 정보 분석에 실패했습니다.";
        if (durationTextEl) durationTextEl.textContent = "실패";
        ytVideoTotalDuration = 0;
        ytVideoTitleString = "유튜브 동영상";
      }
    } else {
      const placeholderWrapper = document.getElementById('ytPlayerPlaceholderWrapper');
      if (placeholderWrapper) {
        placeholderWrapper.innerHTML = '<div id="ytPlayerPlaceholder" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"></div>';
      }
      ytPlayerContainer.style.display = 'none';
      ytPlayerContainer.setAttribute('hidden', 'true');

      // 플레이어 숨곊지면 유튜브 탭 기본 높이로 복원
      if (typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setHeight === 'function') {
        window.electronAPI.setHeight(700);
      }

      // 진행 바 숨김
      if (progressContainer) {
        progressContainer.style.display = 'none';
        progressContainer.setAttribute('hidden', 'true');
      }
      stopYtProgressPolling();
      if (ytIframePlayerInstance) {
        try { ytIframePlayerInstance.destroy(); } catch (_) {}
        ytIframePlayerInstance = null;
      }

      if (infoBox) {
        infoBox.style.display = 'none';
        infoBox.setAttribute('hidden', 'true');
      }
      ytVideoTotalDuration = 0;
      ytVideoTitleString = "";
    }
  }

  if (ytUrlInput) {
    ytUrlInput.addEventListener('input', updateYoutubePlayer);
    ytUrlInput.addEventListener('change', updateYoutubePlayer);
    ytUrlInput.addEventListener('paste', () => {
      setTimeout(updateYoutubePlayer, 100);
    });
  }

  // 진행바 트랙 클릭 시 영상 이동(Seek) 연동
  const progressTrack = document.getElementById('ytProgressTrack');
  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      if (!ytIframePlayerInstance || typeof ytIframePlayerInstance.seekTo !== 'function') return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const clickPercent = clickX / width;
      
      const totalTime = ytIframePlayerInstance.getDuration() || ytVideoTotalDuration || 0;
      if (totalTime > 0) {
        const seekTime = clickPercent * totalTime;
        ytIframePlayerInstance.seekTo(seekTime, true);
        setTimeout(updateYtProgressUI, 50);
      }
    });
  }

  // 시작/종료 단축 캡처 버튼 바인딩
  const btnSetYtStart = document.getElementById('btnSetYtStart');
  const btnSetYtEnd = document.getElementById('btnSetYtEnd');

  if (btnSetYtStart) {
    btnSetYtStart.addEventListener('click', () => {
      if (!ytIframePlayerInstance || typeof ytIframePlayerInstance.getCurrentTime !== 'function') {
        toast('유튜브 영상이 아직 재생할 수 없는 상태입니다.', 'error');
        return;
      }
      const cur = Math.floor(ytIframePlayerInstance.getCurrentTime());
      const ytStartSec = document.getElementById('ytStartSec');
      const ytEndSec = document.getElementById('ytEndSec');
      if (ytStartSec) {
        ytStartSec.value = cur;
        toast(`시작 지점이 현재 시각인 ${cur}초로 자동 입력되었습니다!`, 'success');
        
        let end = cur + 30;
        if (ytVideoTotalDuration > 0) {
          end = Math.min(end, ytVideoTotalDuration);
        }
        if (ytEndSec) ytEndSec.value = end;
      }
    });
  }

  if (btnSetYtEnd) {
    btnSetYtEnd.addEventListener('click', () => {
      if (!ytIframePlayerInstance || typeof ytIframePlayerInstance.getCurrentTime !== 'function') {
        toast('유튜브 영상이 아직 재생할 수 없는 상태입니다.', 'error');
        return;
      }
      const cur = Math.floor(ytIframePlayerInstance.getCurrentTime());
      const ytStartSec = document.getElementById('ytStartSec');
      const ytEndSec = document.getElementById('ytEndSec');
      
      if (ytStartSec) {
        const start = parseInt(ytStartSec.value) || 0;
        if (cur <= start) {
          toast(`종료 지점(${cur}초)은 시작 지점(${start}초)보다 커야 합니다.`, 'error');
          return;
        }
        if (cur - start > 30) {
          toast(`추출 한계 시간은 최대 30초입니다. (현재 범위: ${cur - start}초)`, 'error');
          return;
        }
      }

      if (ytEndSec) {
        ytEndSec.value = cur;
        toast(`종료 지점이 현재 시각인 ${cur}초로 자동 입력되었습니다!`, 'success');
      }
    });
  }

  const ytExtractBtn = document.getElementById('ytExtractBtn');
  if (ytExtractBtn) {
    ytExtractBtn.addEventListener('click', async () => {
      showConsentThen(async () => {
      const url = document.getElementById('ytUrlInput').value.trim();
      const startSec = parseInt(document.getElementById('ytStartSec').value) || 0;
      const endSec = parseInt(document.getElementById('ytEndSec').value) || 0;

      if (!url) {
        toast('유튜브 링크를 입력해주세요.', 'error');
        return;
      }
      const dur = endSec - startSec;
      if (dur < 3 || dur > 30) {
        toast(`추출 가능한 오디오 길이는 3초~30초 사이입니다. (현재 입력값: ${dur}초)`, 'error');
        return;
      }
      if (startSec < 0) {
        toast('시작 지점은 0초 이상이어야 합니다.', 'error');
        return;
      }

      // 버튼 상태 비활성화 로딩 전환
      ytExtractBtn.disabled = true;
      const originalText = ytExtractBtn.innerHTML;
      ytExtractBtn.innerHTML = `
        <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        <span>오디오 추출 분석 중...</span>
      `;
      toast('백엔드에서 유튜브 다이렉트 스트림 파이핑 크롭 진행 중...', 'info');

      const fd = new FormData();
      fd.append('url', url);
      fd.append('start_time', startSec);
      fd.append('end_time', endSec);

      try {
        const res = await api('POST', '/api/youtube/extract', fd);
        
        // 추출 성공 시 즉시 fetch하여 임시 목록에 자동 수록!
        toast('추출된 유튜브 오디오 임시 저장 처리 중...', 'info');
        const response = await fetch(res.audio_url);
        if (!response.ok) {
          throw new Error(`오디오 파일 다운로드 실패 (${response.status}): ${res.audio_url}`);
        }
        const rawBlob = await response.blob();
        // 명시적으로 audio/wav 타입의 Blob을 생성하여 재생기와 디코더의 호환성 완벽 확보!
        const blob = new Blob([rawBlob], { type: 'audio/wav' });
        const localUrl = URL.createObjectURL(blob);

        const tempId = Date.now().toString();
        // 비디오 제목이 존재하면 이를 기본값으로 지정 (앞뒤 공백 제거 및 최대 30자 제한)
        const defaultName = ytVideoTitleString ? ytVideoTitleString.trim().substring(0, 30) : "유튜브 음성 추출본";

        tempRecordings.push({
          id: tempId,
          seconds: res.duration,
          blob: blob,
          url: localUrl,
          name: defaultName,
          gender: '여성',
          voice_type: 'my_voice',
          source_type: 'youtube' // 유튜브 소스 타입 명시
        });

        renderRegisterVoiceList();
        toast('유튜브 음성 추출 및 임시 목록 추가가 완료되었습니다!', 'success');

        // 시작 시간 0초 초기화, 종료 시간은 30초 한계값 재세팅 (동영상이 30초보다 짧으면 동영상 총 길이)
        if (ytStartSec) ytStartSec.value = 0;
        if (ytEndSec) ytEndSec.value = Math.min(30, ytVideoTotalDuration);

      } catch (err) {
        toast('유튜브 오디오 추출 실패: ' + err.message, 'error');
      } finally {
        ytExtractBtn.disabled = false;
        ytExtractBtn.innerHTML = originalText;
      }
      }); // showConsentThen end
    });
  }

  // 시작 시간 입력 시 종료시간 자동으로 30초 추가 적용
  if (ytStartSec && ytEndSec) {
    const handleStartSecInput = () => {
      const start = parseInt(ytStartSec.value) || 0;
      let end = start + 30;
      if (ytVideoTotalDuration > 0) {
        end = Math.min(end, ytVideoTotalDuration);
      }
      ytEndSec.value = end;
    };
    ytStartSec.addEventListener('input', handleStartSecInput);
    ytStartSec.addEventListener('change', handleStartSecInput);
  }

  // ── 로컬 파일 업로드 이벤트 제어 ──
  const audioDropzone = document.getElementById('audioDropzone');
  const audioFileInput = document.getElementById('audioFileInput');

  if (audioDropzone && audioFileInput) {
    audioDropzone.addEventListener('click', () => {
      showConsentThen(() => {
        audioFileInput.click();
      });
    });

    audioDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      audioDropzone.style.background = 'rgba(10, 132, 255, 0.05)';
      audioDropzone.style.borderColor = 'var(--accent)';
      const icon = audioDropzone.querySelector('.dropzone-icon');
      if (icon) icon.style.transform = 'scale(1.1)';
    });

    const resetDropzoneStyle = () => {
      audioDropzone.style.background = 'rgba(0,0,0,0.01)';
      audioDropzone.style.borderColor = 'var(--border-light)';
      const icon = audioDropzone.querySelector('.dropzone-icon');
      if (icon) icon.style.transform = 'scale(1.0)';
    };

    audioDropzone.addEventListener('dragleave', () => {
      resetDropzoneStyle();
    });

    audioDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      resetDropzoneStyle();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processAudioFile(files[0]);
      }
    });

    audioFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processAudioFile(e.target.files[0]);
      }
    });
  }

  // 드롭/업로드 파일 처리 및 Web Audio API 유효 시간 검증
  async function processAudioFile(file) {
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast('오디오 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    toast('오디오 파일 길이 분석 중...', 'info');
    const reader = new FileReader();
    reader.onload = async function(evt) {
      const arrayBuffer = evt.target.result;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      try {
        const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
        const duration = Math.round(decodedData.duration);

        if (duration < 3 || duration > 30) {
          toast(`오디오 파일은 최소 3초 ~ 최대 30초 사이여야 등록 가능합니다. (현재 파일: ${duration}초)`, 'error');
          return;
        }

        // 성공
        uploadedFileObject = file;
        uploadedFileDuration = duration;
        uploadedFileUrl = URL.createObjectURL(file);

        document.getElementById('fileNameLabel').textContent = file.name;
        document.getElementById('fileDurationLabel').textContent = duration;
        
        const resultBox = document.getElementById('fileResultBox');
        resultBox.style.display = 'flex';
        resultBox.removeAttribute('hidden');

        toast('오디오 파일 분석 및 검증 완료!', 'success');
      } catch (err) {
        toast('오디오 디코딩 실패. 손상되었거나 브라우저에서 읽을 수 없는 오디오 포맷입니다.', 'error');
        console.error(err);
      } finally {
        audioCtx.close();
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // "음성 파일 찾기" 버튼 → 동의 모달 후 파일 탐색
  const fileBrowseBtn = document.getElementById('fileBrowseBtn');
  if (fileBrowseBtn) {
    fileBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 드롭존 클릭 이벤트와 중복 방지
      showConsentThen(() => {
        document.getElementById('audioFileInput').click();
      });
    });
  }

  // 파일 미리듣기 버튼 → inline-player-box 방식
  const filePlayBtn = document.getElementById('filePlayBtn');
  if (filePlayBtn) {
    filePlayBtn.addEventListener('click', () => {
      const tipContainer = document.getElementById('tip-file');

      if (regPanelPreviewPlaying && regPanelPreviewType === 'file') {
        // 정지
        stopRegPanelPreview();
        if (tipContainer) { tipContainer.innerHTML = ''; tipContainer.hidden = true; }
        filePlayBtn.classList.remove('playing');
        filePlayBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> <span>미리듣기</span>`;
      } else {
        registerPagePlayer.stop();
        stopRegPanelPreview();

        // inline-player-box 렌더링
        if (tipContainer) {
          tipContainer.innerHTML = `
            <div class="inline-player-box" style="margin-top:4px;">
              <div class="inline-player-controls">
                <button class="inline-play-circle" id="tipc-file" aria-label="재생/일시정지">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path id="tipi-file" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                </button>
                <div class="inline-player-progress">
                  <div class="waveform-seek-container">
                    <canvas class="waveform-visual" id="tip-wv-file"></canvas>
                    <input type="range" id="tisb-file" class="inline-seek-bar" min="0" max="100" value="0" step="0.1">
                  </div>
                  <div class="inline-player-times">
                    <span id="tict-file">0:00</span>
                    <span id="titt-file">0:00</span>
                  </div>
                </div>
              </div>
            </div>`;
          tipContainer.hidden = false;

          // 파형 데이터 로딩
          getWaveformData(uploadedFileUrl, 75).then(peaks => {
            const canvas = document.getElementById('tip-wv-file');
            if (canvas) drawWaveform(canvas, peaks, 0);

            const tickFn = () => {
              if (!regPanelPreviewPlaying || regPanelPreviewType !== 'file') return;
              const el = regPanelPreviewAudio;
              const dur = (isFinite(el.duration) && el.duration > 0) ? el.duration : uploadedFileDuration;
              const pct = dur ? (el.currentTime / dur) * 100 : 0;
              const curT = document.getElementById('tict-file');
              const totT = document.getElementById('titt-file');
              const seek = document.getElementById('tisb-file');
              const icon = document.getElementById('tipi-file');
              if (curT) curT.textContent = fmtTime(el.currentTime);
              if (totT) totT.textContent = fmtTime(dur);
              if (seek) seek.value = pct;
              if (canvas) drawWaveform(canvas, peaks, pct);
              if (icon) icon.setAttribute('d', el.paused ? 'M8 5v14l11-7z' : 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
              requestAnimationFrame(tickFn);
            };
            requestAnimationFrame(tickFn);
          });

          // seek 슬라이더
          document.getElementById('tisb-file')?.addEventListener('input', (e) => {
            const el = regPanelPreviewAudio;
            const dur = (isFinite(el.duration) && el.duration > 0) ? el.duration : uploadedFileDuration;
            if (dur) el.currentTime = dur * (e.target.value / 100);
          });

          // 원형 재생/일시정지 버튼
          document.getElementById('tipc-file')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (regPanelPreviewAudio.paused) regPanelPreviewAudio.play();
            else regPanelPreviewAudio.pause();
          });
        }

        // 오디오 재생
        regPanelPreviewAudio.src = uploadedFileUrl;
        regPanelPreviewAudio.play().catch(err => {
          console.error(err);
          toast('재생에 실패했습니다.', 'error');
        });
        regPanelPreviewPlaying = true;
        regPanelPreviewType = 'file';

        filePlayBtn.classList.add('playing');
        filePlayBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> <span>정지</span>`;
      }
    });
  }

  // 파일 임시 리스트 추가 버튼
  const fileAddTempBtn = document.getElementById('fileAddTempBtn');
  if (fileAddTempBtn) {
    fileAddTempBtn.addEventListener('click', () => {
      if (!uploadedFileObject) return;

      const baseName = uploadedFileObject.name.substring(0, uploadedFileObject.name.lastIndexOf('.')) || uploadedFileObject.name;
      const tempId = Date.now().toString();

      tempRecordings.push({
        id: tempId,
        seconds: uploadedFileDuration,
        blob: uploadedFileObject,
        url: uploadedFileUrl,
        name: baseName,
        gender: '여성',
        voice_type: 'my_voice',
        source_type: 'file'
      });

      renderRegisterVoiceList();
      toast('오디오 파일이 임시 등록 대기 목록에 저장되었습니다!', 'success');

      // 파일 탭 클리어
      const resultBox = document.getElementById('fileResultBox');
      resultBox.style.display = 'none';
      resultBox.setAttribute('hidden', 'true');
      stopRegPanelPreview();
      uploadedFileObject = null;
      uploadedFileUrl = null;
    });
  }
  bindVoicesListEvents('myVoicesList');
  try {
    await loadAll();
  } catch (e) {
    toast('서버 연결 실패: ' + e.message, 'error');
  }
  renderAll();

  // 이중 파형을 위한 기본 대칭 파형 템플릿 주입 (초기 부팅 시)
  const mainWv = document.getElementById('main-wv-player');
  if (mainWv) {
    const mockPeaks = Array.from({length: 100}, (_, i) => {
      const base = Math.sin(i * Math.PI / 100);
      const noise = 0.4 + 0.6 * Math.random();
      return 0.12 + 0.65 * base * noise;
    });
    player.peaks = mockPeaks;
    drawWaveform(mainWv, mockPeaks, 0);
  }
  // i18n + 테마 초기화 (저장된 언어/모드 복원) — renderAll 이후에 applyI18n만, 렌더 함수 재호출은 여기서 처리
  if (typeof initI18nAndTheme === 'function') initI18nAndTheme();
  // 언어가 복원된 후 다시 렌더링
  renderAll();

  // ── 깃허브 실시간 업데이트 모달 수신 및 바인딩 ───────────────────────────────────
  if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
    const updateModal = document.getElementById('updateModal');
    const curVerEl = document.getElementById('updateCurrentVer');
    const latVerEl = document.getElementById('updateLatestVer');
    const downloadBtn = document.getElementById('updateDownloadBtn');
    const laterBtn = document.getElementById('updateLaterBtn');

    window.electronAPI.onUpdateAvailable((info) => {
      if (updateModal && curVerEl && latVerEl) {
        curVerEl.textContent = info.currentVersion;
        latVerEl.textContent = info.latestVersion;
        
        // 모달 출력
        updateModal.removeAttribute('hidden');
        updateModal.style.display = 'flex';

        // 다운로드 버튼 연결
        downloadBtn.onclick = () => {
          window.electronAPI.openExternal(info.htmlUrl);
          updateModal.setAttribute('hidden', 'true');
          updateModal.style.display = 'none';
        };

        // 나중에 하기 버튼 연결
        laterBtn.onclick = () => {
          updateModal.setAttribute('hidden', 'true');
          updateModal.style.display = 'none';
        };
      }
    });
  }

  // ── AI 음성 모델 사전 설치 & 귀여운 캐릭터(소리담이) 마법사 ───────────────────
  let _modelStatus = null;
  let _preinstallEventSource = null;
  let _damiSpeechTimer = null;
  let _damiClickCount = 0;

  function getDamiQuotes(action) {
    const hwName = (_modelStatus && _modelStatus.cpu_brand) || '시스템';
    const devType = (_modelStatus && _modelStatus.device_type) || 'cpu';

    let hwSpeech = `⚡ ${hwName} 신경망 가속 엔진을 깨우고 있어요!`;
    let hwOptSpeech = `⚡ ${hwName} 연산 유닛에 맞게 신경망을 최적화하고 있어요.`;
    if (devType === 'mps') {
      hwSpeech = `🍎 ${hwName} 칩의 신경망 가속 엔진(MPS)을 깨우고 있어요!`;
      hwOptSpeech = `🍎 ${hwName} 뉴럴 코어에 맞게 신경망을 최적화하고 있어요.`;
    } else if (devType === 'cuda') {
      hwSpeech = `🚀 NVIDIA CUDA GPU 가속 코어를 깨우고 있어요!`;
      hwOptSpeech = `⚡ CUDA 텐서 코어에 맞춰 신경망 연산 커널을 최적화하고 있어요.`;
    } else {
      hwSpeech = `💻 ${hwName} 멀티스레드 CPU 가속 엔진을 준비하고 있어요!`;
      hwOptSpeech = `⚙️ CPU 멀티스레드 환경에 맞게 고속 추론 커널을 최적화하고 있어요.`;
    }

    const quotes = {
      searching: [
        hwSpeech,
        "🔍 최적의 하드웨어 가속 경로를 꼼꼼히 탐색 중이에요...",
        "✨ 조금만 기다려주세요, 최고의 음질을 준비할게요!"
      ],
      downloading: [
        "🎧 세상에서 가장 자연스러운 목소리들을 담는 중이에요~",
        "📦 대용량 AI 모델 가중치(4.6GB)를 소중히 담아오고 있어요...",
        "✨ 최초 실행 때 딱 한 번만 준비하면, 다음부터는 기다림 없이 바로 나온답니다!",
        "💡 저(소리담이)를 클릭해보세요! (뿅!)"
      ],
      studying: [
        "📖 한국어와 영어의 자연스러운 억양과 발음을 공부하는 중!",
        "💡 전구 반짝! 소리담의 인공지능 두뇌가 총명해지고 있어요~",
        hwOptSpeech
      ],
      singing: [
        "🎤 라라라~♪ 신경망 엔진 목 풀기(Warm-up) 중!",
        "🎵 첫 음성 합성 테스트 성공! 목소리가 정말 예뻐요~",
        "⚡ 곧 모든 준비가 완료됩니다!"
      ],
      celebrating: [
        "🎉 와아! 모든 준비가 완벽하게 끝났어요!",
        "💖 지금 바로 첫 목소리를 만들어보세요! (두근두근)",
        "✨ 이제 인터넷 없이도 완전 무료로 무제한 사용 가능해요!"
      ]
    };
    return quotes[action] || quotes.downloading;
  }

  function setDamiAction(action, customMsg = null) {
    const mascot = document.getElementById('damiMascot');
    const speech = document.getElementById('damiSpeech');
    if (mascot) {
      mascot.setAttribute('class', `dami-mascot action-${action}`);
    }
    if (speech) {
      if (customMsg) {
        speech.textContent = customMsg;
      } else {
        const quotes = getDamiQuotes(action);
        speech.textContent = quotes[Math.floor(Math.random() * quotes.length)];
      }
    }
  }

  function startDamiSpeechRotation(action) {
    if (_damiSpeechTimer) clearInterval(_damiSpeechTimer);
    _damiSpeechTimer = setInterval(() => {
      const speech = document.getElementById('damiSpeech');
      const mascot = document.getElementById('damiMascot');
      if (!speech || !mascot) return;
      let currentAction = 'downloading';
      for (const a of ['searching', 'downloading', 'studying', 'singing', 'celebrating']) {
        if (mascot.classList && mascot.classList.contains(`action-${a}`)) {
          currentAction = a;
          break;
        }
      }
      const quotes = getDamiQuotes(currentAction);
      speech.style.opacity = '0';
      speech.style.transform = 'translateY(3px)';
      setTimeout(() => {
        speech.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        speech.style.opacity = '1';
        speech.style.transform = 'translateY(0)';
      }, 200);
    }, 4500);
  }

  function stopDamiSpeechRotation() {
    if (_damiSpeechTimer) {
      clearInterval(_damiSpeechTimer);
      _damiSpeechTimer = null;
    }
  }

  function openPreinstallModal(forceView = null) {
    const modal = document.getElementById('preinstallModal');
    if (!modal) return;

    const introView = document.getElementById('preinstallIntroView');
    const progressView = document.getElementById('preinstallProgressView');
    const successView = document.getElementById('preinstallSuccessView');
    const alreadyView = document.getElementById('preinstallAlreadyInstalledView');

    introView.hidden = true;
    progressView.hidden = true;
    successView.hidden = true;
    alreadyView.hidden = true;

    if (forceView === 'progress') {
      progressView.hidden = false;
    } else if (forceView === 'success') {
      successView.hidden = false;
    } else if (forceView === 'intro') {
      introView.hidden = false;
    } else if (_modelStatus && _modelStatus.installed) {
      alreadyView.hidden = false;
      const desc = document.getElementById('alreadyInstalledDesc');
      if (desc) {
        desc.innerHTML = `로컬 캐시에 모델 가중치(4.6GB)가 안전하게 보관되어 있습니다.<br><span style="font-size:12px; color:var(--accent); font-weight:600;">(가속 장치: ${_modelStatus.device})</span>`;
      }
    } else {
      introView.hidden = false;
    }

    modal.removeAttribute('hidden');
    modal.style.display = 'flex';
  }

  function closePreinstallModal() {
    const modal = document.getElementById('preinstallModal');
    if (modal) {
      modal.setAttribute('hidden', 'true');
      modal.style.display = 'none';
    }
    stopDamiSpeechRotation();
  }

  async function checkModelStatus(silent = false) {
    try {
      const res = await fetch('/api/system/model-status');
      if (!res.ok) return;
      _modelStatus = await res.json();

      const btnDot = document.getElementById('btnModelSetupDot');
      const btnLabel = document.getElementById('btnModelSetupLabel');
      const banner = document.getElementById('modelNoticeBanner');

      if (_modelStatus) {
        const badgeText = document.getElementById('preinstallBadgeText');
        const benefit2 = document.getElementById('benefit2Desc');
        if (badgeText && _modelStatus.device) {
          badgeText.textContent = `${_modelStatus.device} 사전 최적화`;
        }
        if (benefit2 && _modelStatus.device) {
          benefit2.textContent = `${_modelStatus.device} 환경에 맞춰 신경망 가속 엔진을 사전에 워밍업합니다.`;
        }
      }

      if (_modelStatus.installed) {
        if (btnDot) btnDot.style.background = '#30d158'; // Green
        if (btnLabel) btnLabel.textContent = 'AI 준비됨';
        if (banner) banner.hidden = true;
      } else {
        if (btnDot) btnDot.style.background = '#ff9500'; // Orange
        if (btnLabel) btnLabel.textContent = '사전 설치';
        if (banner) banner.hidden = false;

        // 최초 1회 자동 팝업
        if (!silent && localStorage.getItem('soridam_preinstall_prompted') !== 'true') {
          localStorage.setItem('soridam_preinstall_prompted', 'true');
          setTimeout(() => {
            openPreinstallModal('intro');
          }, 800);
        }
      }
    } catch (e) {
      console.warn('[Sori-Dam] 모델 상태 확인 실패:', e);
    }
  }

  function startPreinstallationStream() {
    try {
      openPreinstallModal('progress');
      const startMsg = (_modelStatus && _modelStatus.cpu_brand)
        ? `⚡ ${_modelStatus.cpu_brand} 가속 환경을 확인하는 중입니다...`
        : '⚡ 시스템 및 가속 환경을 확인하는 중입니다...';
      setDamiAction('searching', startMsg);
      startDamiSpeechRotation('searching');

      // UI 요소 리셋
      const barFill = document.getElementById('preinstallBarFill');
      const pctEl = document.getElementById('preinstallPct');
      const titleEl = document.getElementById('preinstallStepTitle');
      const submsgEl = document.getElementById('preinstallSubmsg');
      const speedTag = document.getElementById('preinstallSpeedTag');
      const sizeTag = document.getElementById('preinstallSizeTag');
      const deviceTag = document.getElementById('preinstallDeviceTag');
      const consoleEl = document.getElementById('preinstallConsole');

      if (barFill) {
        barFill.style.background = 'linear-gradient(90deg, #0071e3, #00c6ff)';
        barFill.style.width = '5%';
      }
      if (pctEl) pctEl.textContent = '5%';
      if (titleEl) titleEl.textContent = '하드웨어 가속 환경 점검 중...';
      if (submsgEl) submsgEl.textContent = startMsg;
      if (deviceTag && _modelStatus && _modelStatus.tag_label) {
        deviceTag.textContent = _modelStatus.tag_label;
      }
      if (consoleEl) {
        consoleEl.textContent = `[${new Date().toLocaleTimeString()}] 사전 설치 프로세스 시작...`;
      }

      if (_preinstallEventSource) {
        _preinstallEventSource.close();
        _preinstallEventSource = null;
      }

      _preinstallEventSource = new EventSource('/api/system/pre-install/stream');

      _preinstallEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 오류 발생 처리
          if (data.error) {
            if (titleEl) titleEl.textContent = '설치 중 오류 발생';
            if (submsgEl) submsgEl.innerHTML = `<span style="color:#ff3b30; font-weight:600;">${data.message || '오류가 발생했습니다.'}</span>`;
            if (barFill) barFill.style.background = '#ff3b30';
            if (_preinstallEventSource) {
              _preinstallEventSource.close();
              _preinstallEventSource = null;
            }
            stopDamiSpeechRotation();
            setDamiAction('searching', '⚠️ 문제가 발생했습니다. 터미널 로그를 확인해 주세요.');
            if (consoleEl) {
              consoleEl.textContent += `\n[${new Date().toLocaleTimeString()}] ❌ 오류: ${data.error_msg || data.message}`;
            }
            return;
          }

          // 단계 인디케이터 업데이트
          for (let i = 1; i <= 4; i++) {
            const item = document.getElementById(`stepItem${i}`);
            if (item) {
              item.classList.remove('active', 'done');
              if (i < data.step) {
                item.classList.add('done');
              } else if (i === data.step) {
                item.classList.add('active');
              }
            }
          }

          // 프로그레스 바 & 퍼센트
          if (barFill) barFill.style.width = `${data.progress}%`;
          if (pctEl) pctEl.textContent = `${data.progress}%`;
          if (titleEl && data.step_title) titleEl.textContent = data.step_title;
          if (submsgEl && data.message) submsgEl.textContent = data.message;

          // 태그 정보
          if (sizeTag) {
            if (data.total_mb) {
              sizeTag.textContent = `${data.downloaded_mb || 0} / ${data.total_mb} MB`;
            } else {
              sizeTag.textContent = '4.6 GB';
            }
          }
          if (speedTag) {
            speedTag.textContent = data.speed || '';
            speedTag.style.display = data.speed ? 'inline-block' : 'none';
          }
          if (deviceTag) {
            if (data.device_tag) {
              deviceTag.textContent = data.device_tag;
            } else if (_modelStatus && _modelStatus.tag_label) {
              deviceTag.textContent = _modelStatus.tag_label;
            } else if (_modelStatus && _modelStatus.device_type) {
              deviceTag.textContent = _modelStatus.device_type.toUpperCase();
            }
          }

          // 캐릭터 액션 & 대사 업데이트
          if (data.character_action) {
            setDamiAction(data.character_action, data.message);
          }

          // 콘솔 로그 추가
          if (consoleEl && data.message) {
            consoleEl.textContent += `\n[${new Date().toLocaleTimeString()}] ${data.message}`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
          }

          // 완료 처리
          if (data.done) {
            if (_preinstallEventSource) {
              _preinstallEventSource.close();
              _preinstallEventSource = null;
            }
            stopDamiSpeechRotation();
            setDamiAction('celebrating', '🎉 만세! 모든 준비가 끝났어요!');
            setTimeout(() => {
              const progressView = document.getElementById('preinstallProgressView');
              const successView = document.getElementById('preinstallSuccessView');
              if (progressView && successView) {
                progressView.hidden = true;
                successView.hidden = false;
              }
              checkModelStatus(true);
            }, 1000);
          }
        } catch (err) {
          console.error('SSE 메시지 파싱 오류:', err);
        }
      };

      _preinstallEventSource.onerror = (err) => {
        console.warn('SSE 스트림 연결 이벤트:', err);
        if (_preinstallEventSource && _preinstallEventSource.readyState === EventSource.CLOSED) {
          _preinstallEventSource.close();
          _preinstallEventSource = null;
        }
      };
    } catch (outerErr) {
      console.error('startPreinstallationStream 실행 오류:', outerErr);
    }
  }

  // 바인딩
  function bindPreinstallEvents() {
    // 1. 헤더 버튼
    const btnModel = document.getElementById('btnModelSetup');
    if (btnModel) {
      btnModel.onclick = () => openPreinstallModal();
    }

    // 2. 음성 만들기 상단 배너 버튼
    const btnBanner = document.getElementById('btnOpenPreinstallFromBanner');
    if (btnBanner) {
      btnBanner.onclick = () => openPreinstallModal('intro');
    }

    // 3. 시작 화면 버튼들
    const btnStart = document.getElementById('btnStartPreinstall');
    if (btnStart) {
      btnStart.onclick = () => startPreinstallationStream();
    }

    const btnSkip = document.getElementById('btnSkipPreinstall');
    if (btnSkip) {
      btnSkip.onclick = () => closePreinstallModal();
    }

    // 4. 완료 화면 버튼
    const btnFinish = document.getElementById('btnFinishPreinstall');
    if (btnFinish) {
      btnFinish.onclick = () => {
        closePreinstallModal();
        showPage('create');
        const textInput = document.getElementById('textInput');
        if (textInput) textInput.focus();
      };
    }

    // 5. 이미 설치된 화면 버튼들
    const btnRewarmup = document.getElementById('btnRewarmup');
    if (btnRewarmup) {
      btnRewarmup.onclick = () => startPreinstallationStream();
    }

    const btnCloseAlready = document.getElementById('btnCloseAlready');
    if (btnCloseAlready) {
      btnCloseAlready.onclick = () => closePreinstallModal();
    }

    const btnCancel = document.getElementById('btnCancelPreinstall');
    if (btnCancel) {
      btnCancel.onclick = () => {
        if (_preinstallEventSource) {
          _preinstallEventSource.close();
          _preinstallEventSource = null;
        }
        closePreinstallModal();
      };
    }

    // 6. 터미널 토글
    const btnToggleConsole = document.getElementById('btnToggleConsole');
    const consoleWrap = document.getElementById('preinstallConsoleWrap');
    const toggleIcon = document.getElementById('consoleToggleIcon');
    if (btnToggleConsole && consoleWrap) {
      btnToggleConsole.onclick = () => {
        const isHidden = consoleWrap.hidden;
        consoleWrap.hidden = !isHidden;
        if (toggleIcon) toggleIcon.textContent = isHidden ? '▼' : '▶';
      };
    }

    // 7. 마스코트 인터랙션 클릭 이스터에그
    const mascot = document.getElementById('damiMascot');
    if (mascot) {
      mascot.onclick = () => {
        _damiClickCount++;
        mascot.classList.add('dami-clicked');
        setTimeout(() => mascot.classList.remove('dami-clicked'), 500);

        const speech = document.getElementById('damiSpeech');
        if (speech) {
          const hw = (_modelStatus && _modelStatus.cpu_brand) || '초고속';
          const clickQuotes = [
            "앗, 간지러워요! (≧◡≦)",
            "영차영차, 거의 다 와가요! 힘내라 힘! 💪",
            "소리담을 찾아주셔서 정말 기뻐요! 💖",
            `피융~! 🚀 (${hw} 가속 엔진 최고 속도로 달리는 중)`,
            "뽀잉! ٩(ˊᗜˋ*)و 소리담이와 함께 멋진 목소리를 만들어요!"
          ];
          speech.textContent = clickQuotes[(_damiClickCount - 1) % clickQuotes.length];
        }
      };
    }
  }

  // 초기화 호출
  bindPreinstallEvents();
  checkModelStatus();

  showPage('home');
})();
