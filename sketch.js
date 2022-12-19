var fft, song, duration, lowHzInput, highHzInput, amplitudeInput, vWidth, vHeight;
var particles = [];
const band = 64;
const spacing = 20;
const cursorDiameter = 5;

function setup() {
  createCanvas(400, 400).mouseClicked(togglePlay);
  angleMode(DEGREES);
  fft = new p5.FFT();

  for (let i = 0; i < 300; i++) {
    particles.push(new Particle());
  }

  // Get elements
  vWidth = document.getElementById('visualizerWidth');
  vHeight = document.getElementById('visualizerHeight');
  amplitudeInput = document.getElementById('amplitudeInput');
  lowHzInput = document.getElementById('lowHzInput');
  highHzInput = document.getElementById('highHzInput');
  const canvas = document.querySelector('canvas');
  const recordBtn = document.querySelector('button');
  const video = document.querySelector('video');
  video.controls = true;
  video.width = width;
  video.height = height;

  // credit: https://medium.com/@amatewasu/how-to-record-a-canvas-element-d4d0826d3591
  // Creates video stream from canvas
  const videoStream = canvas.captureStream();

  // Get audio context
  const audioCtx = getAudioContext();
  const audioDist = audioCtx.createMediaStreamDestination();
  const audioStream = audioDist.stream;

  vWidth.onchange = resizeVisualizer;
  vHeight.onchange = resizeVisualizer;

  function resizeVisualizer() {
    resizeCanvas(parseInt(vWidth.value), parseInt(vHeight.value));
    video.width = width;
    video.height = height;
  }

  createFileInput((file) => {
    if (song) song.stop();
    song = loadSound(file, () => {
      duration = song.duration();

      // Connects song output to audio destination
      song.connect(audioDist);
    });
  }).position(0, 0);

  // Adds audio track to video stream
  videoStream.addTrack(audioStream.getAudioTracks()[0]);

  // Record the stream
  const mediaRecorder = new MediaRecorder(videoStream);

  var chunks = [];
  var videoURL = '';

  // Push data into chunks when available
  mediaRecorder.onstart = () => {
    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    }
  }

  // Convert raw data to video format
  mediaRecorder.onstop = () => {
    var blob = new Blob(chunks, { type: 'video/mp4' });
    chunks = [];
    videoURL = URL.createObjectURL(blob);

    // Display video on video element
    video.src = videoURL;
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

    URL.revokeObjectURL(videoURL);
  }
}

function draw() {
  if (!song) return;

  background(0);
  var amp = fft.getEnergy(parseFloat(lowHzInput.value), parseFloat(highHzInput.value));
  var spectrum = fft.analyze();
  var wave = fft.waveform();

  document.getElementById('energy').innerHTML = amp.toFixed(1);

  // Particles
  push();
  translate(width / 2, height / 2);
  for (let i = 0; i < particles.length; i++) {
    let particle = particles[i];
    particle.update(amp > parseFloat(amplitudeInput.value));
    particle.show();

    if (particle.edges()) {
      particle.pos = p5.Vector.random2D().mult(width / 4);
      particle.vel = createVector(0, 0);
      particle.acc = particle.pos.copy().mult(random(0.0001, 0.00001));
    }
  }
  pop();

  // Mask
  push();
  noStroke();
  fill(0, 255 - amp);
  rect(0, 0, width, width);
  pop();

  // Wave
  push();
  strokeWeight(3);
  stroke(255);
  noFill();
  beginShape();
  for (var i = 0; i < width; i++) {
    var index = floor(map(i, 0, width, 0, wave.length));
    var y = wave[index] * height / 5 + height / 2;
    vertex(i, y);
  }
  endShape();
  pop();

  // Bar spectrum
  push();
  strokeWeight(3);
  colorMode(HSB);
  for (var i = 0; i < band; i++) {
    let index = floor(map(i, 0, band, 0, spectrum.length));
    let x = map(i, 0, band, spacing, width - spacing);
    let y = map(spectrum[index], 0, 1024, height - spacing, spacing);
    stroke(x / 10, 255, 255, 255);
    line(x, height - spacing, x, y);
  }
  pop();

  // circle
  // push();
  // translate(width / 2, height / 2);
  // for (var t = -1; t <= 1; t += 2) {
  //   beginShape();
  //   for (var i = 0; i <= 180; i++) {
  //     var index = floor(map(i, 0, 180, 0, spectrum.length - 1));
  //     var r = map(spectrum[index], 0, band, 100, 120);
  //     var x = r * sin(i) * t;
  //     var y = -r * cos(i);
  //     vertex(x, y);
  //   }
  //   endShape();
  // }
  // pop();

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
    song.jump(map(mouseX, spacing, width - spacing, 0, duration));
  }
}

class Particle {
  constructor() {
    this.pos = p5.Vector.random2D().mult(width / 4);
    this.vel = createVector(0, 0);
    this.acc = this.pos.copy().mult(random(0.0001, 0.00001));
    this.angularSpeed = random() * 2;
    this.rotation = 0;
    this.width = random(5, 10);
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
    if (this.pos.x < -width / 2 || this.pos.x > width / 2 || this.pos.y < -height / 2 || this.pos.y > height / 2) {
      return true;
    }
    return false;
  }

  show() {
    push();
    noStroke();
    fill(255);
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    rect(-this.width / 2, -this.width / 2, this.width);
    pop();
  }
}
