var fft, song, lowHz, highHz, amplitudeInput, backgroundColor, particlesColor, speedMultiplier;
const particles = [];
const shapes = [];
const pos = [];
const angles = [];
const bands = 64;
const padding = 20;
var currentTime = 0;
var duration = 0;
var dragging = false;
var looping = false;
var canvas, ctx;

function setup() {
  createCanvas(400, 400);
  noStroke();

  canvas = document.querySelector('canvas');
  ctx = canvas.getContext('2d');

  fft = new p5.FFT();

  for (let i = 0; i < 300; i++) {
    let spawn = p5.Vector.random2D().mult(Math.min(width, height) / 4);
    particles.push({
      spawn,
      vel: createVector(0, 0),
      acc: spawn.copy().mult(random(0.00001, 0.0001)),
      angularSpeed: random(-0.1, 0.1),
    });
    angles.push(0)
    pos.push(particles[i].spawn.copy());
    let halfSide = random(5, 10) * 0.5;
    shapes.push([
      {
        x: -halfSide,
        y: -halfSide
      },
      {
        x: halfSide,
        y: -halfSide
      },
      {
        x: halfSide,
        y: halfSide
      },
      {
        x: -halfSide,
        y: halfSide
      },
    ]);
  }

  // Get elements
  const recordBtn = document.querySelector('button');
  const video = document.querySelector('video');
  const playButton = document.getElementById('play');
  const stopButton = document.getElementById('stop');
  const loopButton = document.getElementById('loop');

  video.controls = true;
  video.width = canvas.width;
  video.height = canvas.height;

  playButton.onclick = () => togglePlay(currentTime, song, playButton);
  stopButton.onclick = () => toggleStop(song, playButton);
  loopButton.onclick = () => {
    looping = !looping;
    loopButton.style.background = looping ? 'lightgreen' : 'white';
  }

  let inputs = document.querySelectorAll('input');
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    switch (input.id) {
      case 'visualizerWidth':
        resizeCanvas(input.value, height);
        video.width = input.value;
        input.onchange = () => {
          resizeCanvas(input.value, height);
          video.width = input.value;
        }
        break;
      case 'visualizerHeight':
        resizeCanvas(width, input.value);
        video.height = input.value;
        input.onchange = () => {
          resizeCanvas(width, input.value);
          video.height = input.value;
        }
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

            toggleStop(s, playButton);

            s.onended(() => {
              if (s.currentTime() < duration - 0.5) return;
              if (s.isPlaying()) toggleStop(s, playButton);
              if (looping) {
                s.play();
                playButton.classList = 'fa-solid fa-pause';
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

  var chunks = [];
  var videoURL = '';

  // Push data into chunks when available
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

    chunks = [];
  }

  recordBtn.onclick = () => {
    if (recordBtn.innerText == 'Record visualizer') {
      mediaRecorder.start();
      recordBtn.innerText = 'Stop';
      return;
    }

    mediaRecorder.stop();
    recordBtn.innerText = 'Record visualizer';
  }
}

function draw() {
  const amp = fft.getEnergy(parseFloat(lowHz), parseFloat(highHz));
  const spectrum = fft.analyze();
  const wave = fft.waveform();

  document.getElementById('energy').innerHTML = amp.toFixed(1);

  // Update positions
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];

    p.vel.add(p.acc);
    pos[i].add(p.vel);
    angles[i] += p.angularSpeed;

    if (amp > amplitudeInput) {
      pos[i].add(p.vel.copy().mult(speedMultiplier));
    }

    if (pos[i].x < -width / 2 || pos[i].x > width / 2 || pos[i].y < -height / 2 || pos[i].y > height / 2) {
      pos[i] = p.spawn.copy();
      p.vel = createVector(0, 0);
    }
  }

  // Background
  background(backgroundColor);

  // Particles
  push();
  translate(width * 0.5, height * 0.5);
  batchShapeDraw(ctx, pos, angles, shapes, particlesColor)
  pop();

  // Mask
  push();
  let c = color(backgroundColor);
  c.setAlpha(255 - amp);
  fill(c);
  rect(0, 0, width, height);
  pop();

  // Wave
  drawWaveform(0, height * 0.5, width, height * 0.333, wave);

  // Bar spectrum
  drawBarSpectrum(padding, height - padding, width - padding, height * 0.25, spectrum, bands);

  // Circle
  // drawCircularSpectrum(width * 0.5, height * 0.5, 100, 120, spectrum);

  if (!song) return;

  // Progress
  if (!dragging && song.isPlaying()) currentTime = song.currentTime();
  drawProgressBar(padding, padding, width - padding, currentTime, duration);
}

function toggleStop(song, playButton) {
  if (!song) return;
  song.stop();
  currentTime = 0;
  playButton.classList = 'fa-solid fa-play';
}

function togglePlay(time, song, element) {
  if (!song) return;
  if (song.isPlaying()) {
    element.classList = 'fa-solid fa-play';
    song.pause();
    return;
  }
  song.stop();
  song.play(0, 1, 1, time);
  element.classList = 'fa-solid fa-pause';
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

function drawBarSpectrum(x, y, w, h, spectrum, bands) {
  push();
  colorMode(HSB);
  let barWidth = w / (2 * bands);
  for (let i = 0; i < bands; i++) {
    let index = floor(map(i, 0, bands, 0, spectrum.length));
    let _x = map(i, 0, bands, x, w);
    let _y = map(spectrum[index], 0, 255, barWidth, h);
    fill(_x / 10, 255, 255, 255);
    rect(_x - barWidth * 0.5, y, barWidth, -_y);
  }
  pop();
}

function drawWaveform(x, y, w, h, waveform) {
  push();
  strokeWeight(3);
  stroke(255);
  noFill();
  beginShape();
  for (let i = 0; i < w; i++) {
    let index = floor(map(i, 0, w, 0, waveform.length));
    let _y = waveform[index] * h;
    vertex(i + x, -_y + y);
  }
  endShape();
  pop();
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

function batchShapeDraw(ctx, pos, angle, shape, color = 'black', fill = true, closeShape = true) {
  ctx.save();
  fill ? ctx.fillStyle = color : ctx.strokeStyle = color;

  ctx.beginPath();
  for (let i = 0; i < pos.length; i++) {
    // get cosine and sine of angle
    let c = Math.cos(angle[i]);
    let s = Math.sin(angle[i]);

    // transform
    let transformed = [];
    for (let j = 0; j < shape[i].length; j++) {
      let x = shape[i][j].x;
      let y = shape[i][j].y;
      transformed.push({ x: c * x + -s * y, y: s * x + c * y });
    }

    // add lines to path
    ctx.moveTo(pos[i].x, pos[i].y);
    for (let j = 0; j < transformed.length; j++) {
      ctx.lineTo(pos[i].x + transformed[j].x, pos[i].y + transformed[j].y);
    }

    if (closeShape) ctx.lineTo(pos[i].x + transformed[0].x, pos[i].y + transformed[0].y);
  }

  // draws all at once
  fill ? ctx.fill() : ctx.stroke();
  ctx.restore();
}

function drawProgressBar(x, y, w, currentTime, duration) {
  push();
  strokeWeight(1);
  stroke(255);
  line(x, y, w, y);

  circle(map(currentTime, 0, duration, x, w), y, 5);

  let t = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  fill(255);
  noStroke();
  textSize(height / 50);
  text(t, (width - textWidth(t)) * 0.5, y + textAscent() + 5);
  pop();
}