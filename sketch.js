var fft, song, duration, lowHz, highHz, amplitudeInput, backgroundColor, particlesColor;
var particles = [];
const bands = 64;
const spacing = 20;
const cursorDiameter = 5;

function setup() {
  createCanvas(400, 400).mouseClicked(togglePlay);
  noStroke();

  fft = new p5.FFT();

  for (let i = 0; i < 300; i++) {
    particles.push(new Particle());
  }

  // Get elements
  const canvas = document.querySelector('canvas');
  const recordBtn = document.querySelector('button');
  const video = document.querySelector('video');
  video.controls = true;
  video.width = canvas.width;
  video.height = canvas.height;

  let inputs = document.querySelectorAll('input');
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    let id = input.id;
    switch (id) {
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
          if (song) song.stop();
          if (!input.files[0]) return;
          song = loadSound(input.files[0], () => {
            duration = song.duration();

            // Connects song output to audio destination
            song.connect(audioDist);
          });
        }
        break;
      default:
        break;
    }
  }

  // credit: https://medium.com/@amatewasu/how-to-record-a-canvas-element-d4d0826d3591
  // Creates video stream from canvas
  const videoStream = canvas.captureStream();

  // Get audio context
  const audioCtx = getAudioContext();
  const audioDist = audioCtx.createMediaStreamDestination();
  // const audioStream = audioDist.stream;

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

  // Convert raw data to video format
  mediaRecorder.onstop = () => {
    if (videoURL) URL.revokeObjectURL(videoURL);

    videoURL = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));

    // Display video on video element
    video.src = videoURL;

    chunks = [];
  }

  recordBtn.onclick = () => {
    let innerText = recordBtn.innerText;
    if (innerText == 'Record visualizer') {
      mediaRecorder.start();
      recordBtn.innerText = 'Stop';
      return;
    }

    mediaRecorder.stop();
    recordBtn.innerText = 'Record visualizer';
  }
}

function draw() {
  background(backgroundColor);
  const amp = fft.getEnergy(parseFloat(lowHz), parseFloat(highHz));
  const spectrum = fft.analyze();
  const wave = fft.waveform();

  document.getElementById('energy').innerHTML = amp.toFixed(1);

  // Particles
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.update(amp > amplitudeInput);
    p.show(particlesColor);

    if (p.edges()) {
      p.randomize();
    }
  }

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
  drawBarSpectrum(spacing, height - spacing, width - spacing, height * 0.25, spectrum, bands);

  // circle
  // drawCircularSpectrum(width * 0.5, height * 0.5, 100, 120, spectrum);

  if (!song) return;

  // Progress
  push();
  strokeWeight(1);
  stroke(255);
  line(spacing, spacing, width - spacing, spacing);

  let songCurrentTime = song.currentTime();
  let x = map(songCurrentTime, 0, duration, spacing, width - spacing);
  circle(x, spacing, cursorDiameter);

  let t = `${formatTime(songCurrentTime)} / ${formatTime(duration)}`;
  fill(255);
  noStroke();
  textSize(height / 50);
  text(t, (width - textWidth(t)) * 0.5, spacing + textAscent() + cursorDiameter);
  pop();
}

function togglePlay() {
  if (!song) return;
  if (song.isPlaying()) {
    song.pause();
    return;
  }
  song.loop();
}

function formatTime(seconds) {
  let m = Math.floor(seconds / 60);
  let s = Math.floor(seconds - m * 60);
  if (s < 10) s = `0${s}`;
  return `${m}:${s}`;
}

function mouseDragged() {
  handleDrag();
}

function touchMoved() {
  handleDrag();
}

function handleDrag() {
  if (song && mouseX > spacing && mouseX < width - spacing && mouseY > 0 && mouseY < height) {
    // Audio seeking
    song.jump(map(mouseX, spacing, width - spacing, 0, duration));
  }
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

class Particle {
  constructor() {
    this.pos;
    this.vel;
    this.acc;
    this.angularSpeed = random(-0.1, 0.1);
    this.rotation = 0;
    this.width = random(5, 10);
    this.spawnPos = p5.Vector.random2D().mult(Math.min(width, height) / 4);

    this.randomize();
  }

  update(cond) {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.rotation += this.angularSpeed;
    if (cond) {
      this.pos.add(this.vel);
      this.pos.add(this.vel);
    }
  }

  edges() {
    return this.pos.x < -width / 2 || this.pos.x > width / 2 || this.pos.y < -height / 2 || this.pos.y > height / 2;
  }

  randomize() {
    this.pos = this.spawnPos.copy();
    this.vel = createVector(0, 0);
    this.acc = this.pos.copy().mult(random(0.00001, 0.0001));
  }

  show(color) {
    push();
    fill(color);
    translate(this.pos.x + width * 0.5, this.pos.y + height * 0.5);
    rotate(this.rotation);
    rect(-this.width / 2, -this.width / 2, this.width);
    pop();
  }
}