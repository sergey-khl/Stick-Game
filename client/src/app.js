const Application = PIXI.Application;
const app = new Application({
  autoResize: true,
  resolution: window.devicePixelRatio,
  transparent: true,
});

document.body.appendChild(app.view);

const Graphics = PIXI.Graphics;
const Container = PIXI.Container;

let keys = { 'last': '', 'w': false, 'a': false, 's': false, 'd': false, 'punch': false, 'kick': false, 'block': false, 'throw': false };
let drawer;

// scale according to screen of developed on dimensions
let scalex = window.innerWidth / 2000
let scaley = window.innerHeight / 1000;
const ground_width = window.innerWidth;
const ground_height = window.innerHeight / 10 ;
const player_height = window.innerHeight - ground_height - 400;

const keyDown = (e) => {
  keys[e.key] = true;
  if (e.key == 'a' || e.key == 'd') {
    keys['last'] = e.key;
  }
  if (e.key == ' ') {
    keys['block'] = true;
  } else if (e.key == 'q') {
    keys['throw'] = true;
  } else if (e.key == 'e') {
    keys['sweep'] = true;
  }
};

const keyUp = (e) => {
  keys[e.key] = false;
  if (e.key == ' ') {
    keys['block'] = false;
  } else if (e.key == 'q') {
    keys['throw'] = false;
  } else if (e.key == 'e') {
    keys['sweep'] = false;
  }
};

const click = (e) => {
  if (e.button == 0) {
    keys['punch'] = true;
  } else if (e.button == 2) {
    keys['kick'] = true;
  }
};

const uClick = (e) => {
  if (e.button == 0) {
    keys['punch'] = false;
  } else if (e.button == 2) {
    keys['kick'] = false;
  }
};

const contextClick = (e) => {
  e.preventDefault();
};

class Drawer {
  constructor() {
    // health bars
    this.health1 = 100;
    this.healthContainer1 = new Container();
    app.stage.addChild(this.healthContainer1);
    const health_total1 = new Graphics();
    this.remaining1 = new Graphics();
    this.healthContainer1.addChild(health_total1);
    this.healthContainer1.addChild(this.remaining1);
    this.healthContainer1.x = window.innerWidth / 20;
    this.healthContainer1.y = window.innerHeight / 20;
    health_total1
      .beginFill(0xff0000)
      .drawRect(0, 0, (window.innerWidth / 2 - window.innerWidth / 10), window.innerHeight / 20); // player 1

    this.health2 = 100;
    this.healthContainer2 = new Container();
    app.stage.addChild(this.healthContainer2);
    const health_total2 = new Graphics();
    this.remaining2 = new Graphics();
    this.healthContainer2.addChild(health_total2);
    this.healthContainer2.addChild(this.remaining2);
    this.healthContainer2.x = (window.innerWidth / 2 + window.innerWidth / 20);
    this.healthContainer2.y = window.innerHeight / 20;
    health_total2
      .beginFill(0xff0000)
      .drawRect(0, 0, (window.innerWidth / 2 - window.innerWidth / 10), window.innerHeight / 20); // player 2

    this.time = new PIXI.Text("99", {
      fill: "#333333",
      fontSize: 40,
      fontWeight: "bold",
      align: "center",
    });
    this.time.anchor.x = 0.5;
    this.time.position.x = window.innerWidth / 2;
    this.time.position.y = window.innerHeight / 20;
    this.time.fontSize = 45 * scalex;

    socket.on("time", (time) => {
      this.time.text = time.toString();
    });
    app.stage.addChild(this.time);


    socket.on("damage", (data) => {
      if (data[0] == 1) {
        this.health1 = data[1];
        //socket.emit('knockback', 1)
      } else if (data[0] == 2) {
        this.health2 = data[1];
        //socket.emit('knockback', 2)
      }     
    });

    this.player1Pos = [window.innerWidth / 3, player_height];
    this.player2Pos = [(window.innerWidth * 2) / 3, player_height];
    this.player1Left = false;
    this.player2Left = true;
    this.animation1 = "idle";
    this.curranimation1 = "none";
    this.animation2 = "idle";
    this.curranimation2 = "none";
    this.attackCollisionPos1 = [];
    this.attackCollisionPos2 = [];
    this.hitBox1 = new Graphics();
    this.hitBox2 = new Graphics();
    this.proj1 = new Graphics();
    this.proj2 = new Graphics();
    app.stage.addChild(this.proj1);
    app.stage.addChild(this.proj2);
    app.stage.addChild(this.hitBox1);
    app.stage.addChild(this.hitBox2);

    socket.on("new-info", (data) => {
      this.player1Pos[0] = data["player1Info"][0];
      this.player1Pos[1] = data["player1Info"][1];
      this.animation1 = data["player1Info"][2];
      this.player1Left = data["player1Info"][3];
      this.player2Pos[0] = data["player2Info"][0];
      this.player2Pos[1] = data["player2Info"][1];
      this.animation2 = data["player2Info"][2];
      this.player2Left = data["player2Info"][3];
      this.attackCollisionPos1 = data["attackCollisionPos1"];
      this.attackCollisionPos2 = data["attackCollisionPos2"];
    });

    socket.on("game-over", (winner) => {
      console.log(winner);
    });

    ChromaFilter.prototype = Object.create(PIXI.Filter.prototype);
    ChromaFilter.prototype.constructor = ChromaFilter;
    this.filter = new ChromaFilter();

    //animations
    //idle
    this.idle_textures = []; // 0.2
    for (let i = 0; i <= 9; i++) {
      const texture = PIXI.Texture.from(`src/idle/idle_000${i}.png`);
      this.idle_textures.push(texture);
    }
    for (let i = 10; i <= 11; i++) {
      const texture = PIXI.Texture.from(`src/idle/idle_00${i}.png`);
      this.idle_textures.push(texture);
    }
    // add stick animation
    this.stick1 = new PIXI.AnimatedSprite(this.idle_textures);
    this.stick1.animationSpeed = 0.2;
    this.stick1.anchor.x = 0.5;
    this.stick1.anchor.y = 1.0;
    this.stick1.width = 250 * scalex;
    this.stick1.height = 400 * scaley;
    this.stick1.y += this.stick1.height;
    this.stick1.filters = [this.filter];
    this.stick2 = new PIXI.AnimatedSprite(this.idle_textures);
    this.stick1.animationSpeed = 0.2;
    this.stick2.anchor.x = 0.5;
    this.stick2.anchor.y = 1.0;
    this.stick2.width = 250 * scalex;
    this.stick2.height = 400  * scaley;
    this.stick2.y += this.stick2.height;
    this.stick2.filters = [this.filter];
    app.stage.addChild(this.stick1);
    app.stage.addChild(this.stick2);


    // shuriken
    this.shuriken_textures = []; // 0.2
    for (let i = 0; i <= 2; i++) {
      const texture = PIXI.Texture.from(`src/shuriken/shuriken_000${i}.png`);
      this.shuriken_textures.push(texture);
    }
    // add shuriken animation 
    this.shuriken1 = new PIXI.AnimatedSprite(this.shuriken_textures);
    this.shuriken1.animationSpeed = 0.2;
    this.shuriken1.width = 50 * scalex;
    this.shuriken1.height = 50 * scaley;
    this.shuriken1.filters = [this.filter];
    this.shuriken2 = new PIXI.AnimatedSprite(this.shuriken_textures);
    this.proj_alive1 = false;
    this.shuriken2.animationSpeed = 0.2;
    this.shuriken2.width = 50 * scalex;
    this.shuriken2.height = 50  * scaley;
    this.shuriken2.filters = [this.filter];
    this.proj_alive2 = false;
    app.stage.addChild(this.shuriken1);
    app.stage.addChild(this.shuriken2);

    //walk
    this.walk_textures = []; // 0.3
    for (let i = 0; i <= 5; i++) {
      const texture = PIXI.Texture.from(`src/walk_f/walk_f_000${i}.png`);
      this.walk_textures.push(texture);
    }
    //jump
    this.jump_textures = [];
    for (let i = 0; i <= 9; i++) {
      const texture = PIXI.Texture.from(`src/jump/jump_000${i}.png`);
      this.jump_textures.push(texture);
    }
    for (let i = 10; i <= 18; i++) {
      const texture = PIXI.Texture.from(`src/jump/jump_00${i}.png`);
      this.jump_textures.push(texture);
    }
    //crouch
    this.crouch_textures = []; // 1.0
    const texture_crouch = PIXI.Texture.from(`src/crouch/crouch_0000.png`);
    this.crouch_textures.push(texture_crouch);
    //block standing
    this.block_s_textures = []; // 1.0
    const texture_block_s = PIXI.Texture.from(`src/block_s/block_s_0000.png`);
    this.block_s_textures.push(texture_block_s);
    //block crouching
    this.block_c_textures = []; // 1.0
    const texture_block_c = PIXI.Texture.from(`src/block_c/block_c_0000.png`);
    this.block_c_textures.push(texture_block_c);
    //fall stunned
    this.stun_fall_textures = []; // 1.0
    const texture_stun_fall = PIXI.Texture.from(`src/stun_fall/stun_fall_0000.png`);
    this.stun_fall_textures.push(texture_stun_fall);
    //punch
    this.punch_textures = [];
    for (let i = 0; i <= 9; i++) {
      const texture = PIXI.Texture.from(`src/punch/punch_000${i}.png`);
      this.punch_textures.push(texture);
    }
    for (let i = 10; i <= 10; i++) {
      const texture = PIXI.Texture.from(`src/punch/punch_00${i}.png`);
      this.punch_textures.push(texture);
    }
    //kick
    this.kick_textures = [];
    for (let i = 0; i <= 9; i++) {
      const texture = PIXI.Texture.from(`src/kick/kick_000${i}.png`);
      this.kick_textures.push(texture);
    }
    for (let i = 10; i <= 11; i++) {
      const texture = PIXI.Texture.from(`src/kick/kick_00${i}.png`);
      this.kick_textures.push(texture);
    }
    // throw_shurikens
    this.throw_shurikens_textures = [];
    for (let i = 0; i <= 9; i++) {
      const texture = PIXI.Texture.from(`src/throw_shurikens/throw_shurikens_000${i}.png`);
      this.throw_shurikens_textures.push(texture);
    }
    for (let i = 10; i <= 11; i++) {
      const texture = PIXI.Texture.from(`src/throw_shurikens/throw_shurikens_00${i}.png`);
      this.throw_shurikens_textures.push(texture);
    }
    // sweep
    this.sweep_textures = [];
    for (let i = 0; i <= 9; i++) {
      const texture = PIXI.Texture.from(`src/sweep/sweep_000${i}.png`);
      this.sweep_textures.push(texture);
    }
    for (let i = 10; i <= 11; i++) {
      const texture = PIXI.Texture.from(`src/sweep/sweep_00${i}.png`);
      this.sweep_textures.push(texture);
    }
  }

  // adjust for screen size 
  scale = () => {
    this.player1Pos[0] *= scalex;
    this.player1Pos[1] *= scaley;
    this.player2Pos[0] *= scalex;
    this.player2Pos[1] *= scaley;
    if (this.attackCollisionPos1) {
      let alive = false;
      for (let i = 0; i < this.attackCollisionPos1.length; i++) {
        if (this.attackCollisionPos1[i][5] == 'throw_shurikens') {
          alive = true;
        }
        this.attackCollisionPos1[i][0] *= scalex;
        this.attackCollisionPos1[i][1] *= scaley;
        this.attackCollisionPos1[i][2] *= scalex;
        this.attackCollisionPos1[i][3] *= scaley;
      }
      this.proj_alive1 = alive;
    }
    if (this.attackCollisionPos2) {
      let alive = false;
      for (let i = 0; i < this.attackCollisionPos2.length; i++) {
        if (this.attackCollisionPos2[i][5] == 'throw_shurikens') {
          alive = true;
        }
        this.attackCollisionPos2[i][0] *= scalex;
        this.attackCollisionPos2[i][1] *= scaley;
        this.attackCollisionPos2[i][2] *= scalex;
        this.attackCollisionPos2[i][3] *= scaley;
      }
      this.proj_alive2 = alive;
    }
  }

  drawHealth = () => {
    this.remaining1.clear();
    this.remaining2.clear();
    this.remaining1
      .beginFill(0x00ff00)
      .drawRect(
        (window.innerWidth / 2 - window.innerWidth / 10),
        0,
        -((this.health1 / 100) * (window.innerWidth / 2 - window.innerWidth / 10)),
        window.innerHeight / 20
      );
    this.remaining2
      .beginFill(0x00ff00)
      .drawRect(0, 0, (this.health2 / 100) * (window.innerWidth / 2 - window.innerWidth / 10), window.innerHeight / 20);
  };

  drawPlayers = () => {
    // draw players to screen
    this.stick1.x = this.player1Pos[0];
    this.stick1.y = this.player1Pos[1];
    this.stick2.x = this.player2Pos[0];
    this.stick2.y = this.player2Pos[1];
    for (let i = 0; i < this.attackCollisionPos1.length; i++) {
      if (this.attackCollisionPos1[i][5] == 'throw_shurikens') {
        this.shuriken1.x = this.attackCollisionPos1[i][0];
        this.shuriken1.y = this.attackCollisionPos1[i][1];
      }
    }
    for (let i = 0; i < this.attackCollisionPos2.length; i++) {
      if (this.attackCollisionPos2[i][5] == 'throw_shurikens') {
        this.shuriken2.x = this.attackCollisionPos2[i][0];
        this.shuriken2.y = this.attackCollisionPos2[i][1];
      }
    }

    if ((this.stick1.scale.x > 0 && this.player1Left) || (this.stick1.scale.x < 0 && !this.player1Left)) {
      this.stick1.scale.x *= -1;
      this.shuriken1.scale.x *= -1;
    }
    if ((this.stick2.scale.x > 0 && this.player2Left) || (this.stick2.scale.x < 0 && !this.player2Left)) {
      this.stick2.scale.x *= -1;
      this.shuriken2.scale.x *= -1;
    }

    this.animate();
  };


  // helper function to see where collisions are happening
  drawHitBoxes = () => {
    this.hitBox1.clear();
    this.hitBox2.clear();
    this.proj1.clear();
    this.proj2.clear();
    
    if (this.attackCollisionPos1) {
      for (let i = 0; i < this.attackCollisionPos1.length; i++) {
        this.hitBox1.x = this.attackCollisionPos1[i][0];
        this.hitBox1.y = this.attackCollisionPos1[i][1];
        this.hitBox1.beginFill(0x00ff00).drawRect(0, 0, this.attackCollisionPos1[i][2], this.attackCollisionPos1[i][3]).endFill();
      }
    }
    if (this.attackCollisionPos2) {
      for (let i = 0; i < this.attackCollisionPos2.length; i++) {
        this.hitBox2.x = this.attackCollisionPos2[i][0];
        this.hitBox2.y = this.attackCollisionPos2[i][1];
        this.hitBox2.beginFill(0x00ff00).drawRect(0, 0, this.attackCollisionPos2[i][2], this.attackCollisionPos2[i][3]).endFill();
      }
    }
  };

  animate = () => {
    switch (this.animation1) {
      case "idle":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.idle_textures;
          this.stick1.animationSpeed = 0.2;
        }
        break;
      case "walk":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.walk_textures;
          this.stick1.animationSpeed = 0.3;
        }
        break;
      case "jump":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.jump_textures;
        }
        this.stick1.animationSpeed = 19 / 50;
        break;
      case "crouch":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.crouch_textures;
          this.stick1.animationSpeed = 1.0;
        }
        break;
      case "block_s":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.block_s_textures;
          this.stick1.animationSpeed = 1.0;
        }
        break;
      case "block_c":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.block_c_textures;
          this.stick1.animationSpeed = 1.0;
        }
        break;
      case "stun_fall":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.stun_fall_textures;
          this.stick1.animationSpeed = 1.0;
        }
        break;
      case "punch":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.punch_textures;
        }
        this.stick1.animationSpeed = 11 / (60 * 0.5);
        break;
      case "kick":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.kick_textures;
        }
        this.stick1.animationSpeed = 12 / (60 * 0.6);
        break;
      case "throw_shurikens":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.throw_shurikens_textures;
        }
        this.stick1.animationSpeed = 12 / (60 * 0.4);
        break;
      case "sweep":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.sweep_textures;
        }
        this.stick1.animationSpeed = 13 / (60 * 0.7);
        break;
    }
    this.stick1.play();

    switch (this.animation2) {
      case "idle":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.idle_textures;
          this.stick2.animationSpeed = 0.2;
        }
        break;
      case "walk":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.walk_textures;
          this.stick2.animationSpeed = 0.3;
        }
        break;
      case "jump":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.jump_textures;
        }
        this.stick2.animationSpeed = 19 / 50;
        break;
      case "crouch":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.crouch_textures;
          this.stick2.animationSpeed = 1.0;
        }
        break;
      case "block_s":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.block_s_textures;
          this.stick2.animationSpeed = 1.0;
        }
        break;
      case "block_c":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.block_c_textures;
          this.stick2.animationSpeed = 1.0;
        }
        break;
      case "stun_fall":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.stun_fall_textures;
          this.stick2.animationSpeed = 1.0;
        }
        break;
      case "punch":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.punch_textures;
        }
        this.stick2.animationSpeed = 11 / (60 * 0.5);
        break;
      case "kick":
          if (this.curranimation2 != this.animation2) {
            this.curranimation2 = this.animation2;
            this.stick2.textures = this.kick_textures;
          }
          this.stick2.animationSpeed = 12 / (60 * 0.6);
          break;
      case "throw_shurikens":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.throw_shurikens_textures;
        }
        this.stick2.animationSpeed = 12 / (60 * 0.4);
        break;
      case "sweep":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.sweep_textures;
        }
        this.stick2.animationSpeed = 13 / (60 * 0.7);
        break;
    }
    this.stick2.play();

    if (this.proj_alive1) {
      this.shuriken1.visible = true;
      this.shuriken1.play();
    } else {
      this.shuriken1.visible = false;
    }

    if (this.proj_alive2) {
      this.shuriken2.visible = true;
      this.shuriken2.play();
    } else {
      this.shuriken2.visible = false;
    }
  };
}

// add ground to screen
const ground = new Graphics();  
ground
  .beginFill(0x964b00)
  .drawRect(
    0,
    window.innerHeight * scalex - ground_height,
    ground_width,
    ground_height * 3
  )
  .endFill();
app.stage.addChild(ground);

// remove white background from animations
function ChromaFilter() {
  const vertexShader = [
    "attribute vec2 aVertexPosition;",
    "attribute vec2 aTextureCoord;",
    "uniform mat3 projectionMatrix;",
    "varying vec2 vTextureCoord;",
    "void main(void)",
    "{",
    "gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);",
    "vTextureCoord = aTextureCoord;",
    "}",
  ].join("\n");
  const fragmentShader = [
    "varying vec2 vTextureCoord;",

    "uniform sampler2D uSampler;",

    "void main() {",
    "vec4 textureColor = texture2D(uSampler, vTextureCoord);",
    "if (textureColor.a == 1.0 && textureColor.r == 1.0 && textureColor.g == 1.0 && textureColor.b == 1.0) {",
    "textureColor *= 0.0;",
    "}",
    "gl_FragColor = textureColor;",
    "}",
  ].join("\n");

  PIXI.Filter.call(this, vertexShader, fragmentShader);
}

// initial connection with server
socket = io();
socket.on("player", () => {
  drawer = new Drawer();
  socket.emit("confirm", null);
});

socket.on('test-connection', () => {
  socket.emit('good-connection');
})

// done once a frame so 1/60 sec.
socket.on("render", () => {
  drawer.scale();
  //drawer.drawHitBoxes();
  drawer.drawHealth();
  drawer.drawPlayers();
});

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);
document.addEventListener("mousedown", click);
document.addEventListener("mouseup", uClick);
document.addEventListener("contextmenu", contextClick);

app.ticker.add((delta) => {
  socket.emit("action", {
    'keys': keys,
    'delta': delta,
  });
});

// resize
window.addEventListener("resize", resize);

function resize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
}

resize();
