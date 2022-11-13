var fft, song, duration
var particles = [];
const band = 64;
const spacing = 20;
const cursorDiameter = 5;

function preload() {
  // song = loadSound('songs/song.m4a');
  // song = loadSound('songs/song2.m4a')
  // song = loadSound('songs/song2(2).m4a');
  // song = loadSound('songs/boomerang.mp3');
  // song = loadSound('songs/song3.m4a');
  // song = loadSound('songs/1962.m4a');
  song = loadSound('songs/1830.m4a');
}

function setup() {
  createCanvas(windowWidth, windowWidth).mouseClicked(togglePlay);
  angleMode(DEGREES);
  fft = new p5.FFT();
  duration = song.duration();

  for (let i = 0; i < 300; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  background(0);
  var amp = fft.getEnergy(20, 200); // 0 - 255
  var spectrum = fft.analyze();
  var wave = fft.waveform();

  // Particles
  push();
  translate(width / 2, height / 2);
  for (let i = 0; i < particles.length; i++) {
    let particle = particles[i];
    particle.update(amp > 200);
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
  if (song.isPlaying()) {
    song.pause();
  } else {
    song.loop();
  }
}

function formatTime(seconds) {
  let m = Math.floor(seconds / 60);
  let s = Math.floor(seconds - m * 60);
  if (s < 10) s = `0${s}`;
  return `${m}:${s}`;
}

function mouseDragged() {
  return handleDrag();
}

function touchMoved() {
  return handleDrag();
}

function handleDrag() {
  if (mouseX > spacing && mouseX < width - spacing) {
    song.jump(map(mouseX, spacing, width - spacing, 0, duration));
  }
  return false;
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
