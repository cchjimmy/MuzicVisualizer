var fft, song, lowHz, highHz, amplitudeInput, backgroundColor, particlesColor, speedMultiplier;
const particles = [];
const shape = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
const pos = [];
const angles = [];
const scales = [];
const bands = 64;
const padding = 20;
var currentTime = 0;
var duration = 0;
var dragging = false;
var looping = false;
var canvas, ctx, BGLayer, BGctx;
const energyIndicator = document.querySelector('span#energy');

function setup() {
  canvas = createCanvas(400, 400);
  canvas.canvas.style.zIndex = 2;
  ctx = canvas.drawingContext;

  BGLayer = document.createElement('canvas');
  BGLayer.width = canvas.width;
  BGLayer.height = canvas.height;
  BGctx = BGLayer.getContext('2d');
  BGctx.translate(BGLayer.width * 0.5, BGLayer.height * 0.5);
  
  noStroke();

  fft = new p5.FFT();

  for (let i = 0; i < 300; i++) {
    let spawn = p5.Vector.random2D();
    spawn.setMag(Math.min(width, height) / 4);
    particles.push({
      spawn,
      vel: createVector(0, 0),
      acc: spawn.copy().mult(random(0.00001, 0.0001)),
      angularSpeed: random(-0.1, 0.1),
    });
    angles.push(0)
    pos.push([particles[i].spawn.x, particles[i].spawn.y]);
    let r = random(5, 10);
    scales.push([r, r]);
  }

  // Get elements
  const recordBtn = document.querySelector('button');
  const video = document.querySelector('video');
  const playButton = document.getElementById('play');
  const stopButton = document.getElementById('stop');
  const loopButton = document.getElementById('loop');

  video.controls = true;

  let inputs = document.querySelectorAll('input');
  
  let r = (width, height) => {
    resizeCanvas(width, height);
    video.width = width;
    video.height = height;
    BGLayer.width = width;
    BGLayer.height = height;
    BGctx.translate(BGLayer.width * 0.5, BGLayer.height * 0.5);
          
    for (let i = 0; i < particles.length; i++) {
      particles[i].spawn.setMag(Math.min(width, height) / 4);
    }
  }
        
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    switch (input.id) {
      case 'visualizerWidth':
        r(input.value, height);
        input.onchange = () => r(input.value, height);
        break;
      case 'visualizerHeight':
        r(width, input.value);
        input.onchange = () => r(width, input.value);
        break;
      case 'backgroundColorInput':
        backgroundColor = input.value;
        input.onchange = () => {
          backgroundColor = input.value;
        }
        break;
      case 'particlesColorInput':
        particlesColor = input.value;
        input.onchange = () => {
          particlesColor = input.value;
        }
        break;
      case 'lowHzInput':
        lowHz = parseFloat(input.value);
        input.onchange = () => {
          lowHz = parseFloat(input.value);
        }
        break;
      case 'highHzInput':
        highHz = parseFloat(input.value);
        input.onchange = () => {
          highHz = parseFloat(input.value);
        }
        break;
      case 'amplitudeInput':
        amplitudeInput = parseFloat(input.value);
        break;
      case 'audio':
        input.onchange = () => {
          if (!input.files[0]) return;

          song?.stop();
          song?.disconnect();

          song = loadSound(input.files[0], (s) => {
            duration = s.duration();

            // Connects song output to audio destination
            s.connect(audioDist);

            stopSong(mediaRecorder, s, playButton);

            s.onended(() => {
              if (s.currentTime() < duration - 0.5) return;
              if (s.isPlaying()) stopSong(mediaRecorder, s, playButton);
              if (looping) {
                togglePlay(mediaRecorder, 0, s, playButton);
              }
            })

            return s;
          });
        }
        break;
      case 'speedMultiplier':
        speedMultiplier = parseFloat(input.value);
        input.onchange = () => { speedMultiplier = parseFloat(input.value); };
        break;
      default:
        break;
    }
  }

  // credit: https://medium.com/@amatewasu/how-to-record-a-canvas-element-d4d0826d3591
  // Creates video stream from canvas
  const videoStream = document.querySelector('canvas').captureStream();

  // Get audio context
  const audioCtx = getAudioContext();
  const audioDist = audioCtx.createMediaStreamDestination();

  // Adds audio track to video stream
  videoStream.addTrack(audioDist.stream.getAudioTracks()[0]);

  // Record the stream
  const mediaRecorder = new MediaRecorder(videoStream);

  var videoURL = '';
  var chunks = [];

  mediaRecorder.ondataavailable = (e) => {
    chunks.push(e.data);
  }

  mediaRecorder.onstop = () => {
    // revoke old url
    if (videoURL) URL.revokeObjectURL(videoURL);

    // Convert raw data to video format
    videoURL = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));

    // Display video on video element
    video.src = videoURL;

    chunks.splice(0);
  }

  recordBtn.onclick = () => toggleRecord(mediaRecorder, recordBtn);

  playButton.onclick = () => togglePlay(mediaRecorder, currentTime, song, playButton);

  stopButton.onclick = () => stopSong(mediaRecorder, song, playButton);

  loopButton.onclick = () => {
    looping = !looping;
    loopButton.style.background = looping ? 'lightgreen' : 'white';
  }
}

function draw() {
  const amp = fft.getEnergy(parseFloat(lowHz), parseFloat(highHz));
  const spectrum = fft.analyze();
  const wave = fft.waveform();

  energyIndicator.innerHTML = amp.toFixed(1);

  // Update positions
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];

    p.vel.add(p.acc);
    pos[i][0] += p.vel.x;
    pos[i][1] += p.vel.y;
    angles[i] += p.angularSpeed;

    if (amp > amplitudeInput) {
      let v = p.vel.copy().mult(speedMultiplier);
      pos[i][0] += v.x;
      pos[i][1] += v.y;
    }

    if (pos[i][0] < -BGLayer.width / 2 || pos[i][0] > BGLayer.width / 2 || pos[i][1] < -BGLayer.height / 2 || pos[i][1] > BGLayer.height / 2) {
      pos[i][0] = p.spawn.x;
      pos[i][1] = p.spawn.y;
      p.vel.x = 0;
      p.vel.y = 0;
    }
  }
  
  // Background
  let c = color(backgroundColor);
  c.setAlpha(255 - amp);
  BGctx.fillStyle = c;

  // Particles
  batchShapeDraw(BGctx, pos, angles, scales, shape, particlesColor)

  // Mask
  BGctx.fillRect(-BGLayer.width * 0.5, -BGLayer.height * 0.5, BGLayer.width, BGLayer.height);
  
  ctx.drawImage(BGLayer, 0, 0);

  // Wave
  drawWaveform(ctx, 0, height * 0.5, width, height * 0.333, wave);

  // Bar spectrum
  drawBarSpectrum(ctx, padding, height - padding, width - padding, height * 0.25, spectrum, bands);

  // Circle
  // drawCircularSpectrum(width * 0.5, height * 0.5, 100, 120, spectrum);

  if (!song) return;

  // Progress
  if (!dragging && song.isPlaying()) currentTime = song.currentTime();
  drawProgressBar(ctx, padding, padding, width - padding, currentTime, duration);
}

function stopSong(mediaRecorder, song, playButton) {
  if (!song) return;
  song.stop();
  if (mediaRecorder.state == 'recording') mediaRecorder.pause();
  playButton.classList = 'fa-solid fa-play';
  currentTime = 0;
}

function togglePlay(mediaRecorder, time, song, element) {
  if (!song) return;

  if (song.isPlaying()) {
    song.pause();
    if (mediaRecorder.state == 'recording') mediaRecorder.pause();
    element.classList = 'fa-solid fa-play';
    return;
  }
  song.stop();
  song.play(0, 1, 1, time);
  currentTime = time;
  if (mediaRecorder.state == 'paused') mediaRecorder.resume();
  element.classList = 'fa-solid fa-pause';
}

function toggleRecord(mediaRecorder, recordBtn) {
  if (mediaRecorder.state == 'inactive') {
    mediaRecorder.start();
    recordBtn.innerText = 'Stop';
    return;
  }

  mediaRecorder.stop();
  recordBtn.innerText = 'Record visualizer';
}

function formatTime(seconds) {
  let m = Math.floor(seconds / 60);
  let s = Math.floor(seconds - m * 60);
  s = s < 10 ? `0${s}` : s;
  return `${m}:${s}`;
}

function mouseDragged() {
  handleDrag();
}

function touchMoved() {
  handleDrag();
}

function touchEnded() {
  handleDragEnd();
}

function mouseReleased() {
  handleDragEnd();
}

function handleDrag() {
  if (mouseX > padding && mouseX < width - padding && mouseY > 0 && mouseY < height) {
    dragging = true;
    // Audio seeking
    currentTime = map(mouseX, padding, width - padding, 0, duration);
  }
}

function handleDragEnd() {
  if (song && song.isPlaying() && dragging) {
    song.jump(currentTime);
  }
  dragging = false;
}

function drawBarSpectrum(ctx, x, y, w, h, spectrum, bands, color = 'white') {
  let halfBarWidth = w / (2 * bands) * 0.5;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < bands; i++) {
    let index = floor(map(i, 0, bands, 0, spectrum.length));
    let _x = map(i, 0, bands, x, w); // horizontal position of bar
    let _y = y - map(spectrum[index], 0, 255, halfBarWidth * 2, h); // actual height of bar
    ctx.moveTo(_x - halfBarWidth, y); // y refers to bottom
    ctx.lineTo(_x + halfBarWidth, y);
    ctx.lineTo(_x + halfBarWidth, _y);
    ctx.lineTo(_x - halfBarWidth, _y);
    ctx.lineTo(_x - halfBarWidth, y);
  }
  ctx.fill();
  ctx.restore();
}

function drawWaveform(ctx, x, y, w, h, waveform, color = 'white') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < w; i++) {
    let index = floor(map(i, 0, w, 0, waveform.length));
    let _y = waveform[index] * h;
    ctx.lineTo(i + x, -_y + y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCircularSpectrum(x, y, rMin, rMax, spectrum) {
  push();
  strokeWeight(1);
  stroke(255);
  noFill();
  translate(x, y);
  for (let t = -1; t <= 1; t += 2) {
    beginShape();
    for (let i = 0; i < Math.PI; i += 0.1) {
      let index = floor(map(i, 0, Math.PI, 0, spectrum.length - 1));
      let r = map(spectrum[index], 0, 255, rMin, rMax);
      let x = r * sin(i) * t;
      let y = -r * cos(i);
      vertex(x, y);
    }
    endShape();
  }
  pop();
}

function batchShapeDraw(ctx, pos, angle, scale, shape, color = 'black', fill = true) {
  ctx.save();
  fill ? ctx.fillStyle = color : ctx.strokeStyle = color;

  ctx.beginPath();
  for (let i = 0; i < pos.length; i++) {
    // get cosine and sine of angle
    let c = Math.cos(angle[i]);
    let s = Math.sin(angle[i]);

    // transform
    let transformed = new Array(shape.length);
    for (let j = 0; j < shape.length; j++) {
      let x = shape[j][0] * scale[i][0];
      let y = shape[j][1] * scale[i][1];
      transformed[j] = [c * x + -s * y, s * x + c * y];
    }

    // add lines to path
    ctx.moveTo(pos[i][0], pos[i][1]);
    for (let j = 0; j < transformed.length; j++) {
      ctx.lineTo(pos[i][0] + transformed[j][0], pos[i][1] + transformed[j][1]);
    }

    // close shape
    ctx.lineTo(pos[i][0] + transformed[0][0], pos[i][1] + transformed[0][1]);
  }

  // draws all at once
  fill ? ctx.fill() : ctx.stroke();
  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, currentTime, duration) {
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(w, y);
  ctx.stroke();

  ctx.arc(map(currentTime, 0, duration, x, w), y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  let t = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  ctx.font = `${height / 50}px`;
  ctx.fillText(t, (width - textWidth(t)) * 0.5, y + textAscent() + 5);
  ctx.restore();
}