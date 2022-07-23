const Application = PIXI.Application;
const app = new Application({
  autoResize: true,
  resolution: window.devicePixelRatio,
  transparent: true,
});

document.body.appendChild(app.view);

const Graphics = PIXI.Graphics;
const Container = PIXI.Container;
const loader = PIXI.Loader.shared;
let player1;
let player2;
let update;
let socket;
// scale according to screen of developed on monitor
let scalex = window.innerWidth / 1920
let scaley = window.innerHeight / 969;

class Player {
  constructor(initx, inity, socketId, num, comp) {
    this.jumping = false;
    this.crouching = false;
    this.animation = "idle";
    this.curr_animation = "idle";
    this.velocity = [0, 0];
    this.acceleration = [0, 0];
    this.gravity = 60;
    this.last_key;
    this.curr_move = "none";
    this.keys = { w: false, a: false, s: false, d: false };
    this.id = socketId;
    this.lastUpdateTime = 0;
    this.num = num;
    this.comp = comp;
    this.left = false;
    this.attacking = false;
    this.collidingLeft = false;
    this.collidingRight = false;

    // initial position
    this.player = new Container();
    this.player.position.x = initx;
    this.player.position.y = inity;
    app.stage.addChild(this.player);

    this.attackCollisionPos = [null, null, null, null, null, false];

    // only do this if you are not a computer, mr. spy!
    if (!comp) {
      document.addEventListener("keydown", this.keyDown);
      document.addEventListener("keyup", this.keyUp);
      document.addEventListener("mousedown", this.click);
      document.addEventListener("contextmenu", this.rclick);
      app.ticker.add(this.move);
      app.ticker.add(this.attack);
    }
  }

  userInput = (data) => {
    const keys = data["keys"];
    const last_key = data["last"];
    const jumping = data["jumping"];
    const crouching = data["crouching"];
    const collidingLeft = data['collidingLeft'];
    const collidingRight = data['collidingRight'];

    if (keys["d"] && last_key == "d") {
      // walk right
      if (collidingRight) {
        this.velocity[0] = 0;
      } else {
        this.velocity[0] = 500;
      }
    } else if (keys["a"] && last_key == "a") {
      // walk left
      if (collidingLeft) {
        this.velocity[0] = 0;
      } else {
        this.velocity[0] = -500;
      }
      
    } else if (!keys["a"] && !keys["d"]) {
      // idle
      this.velocity[0] = 0;
    }

    // crouching
    if (crouching && !jumping && !keys["a"] && !keys["d"]) {
      this.velocity[0] = 0;
      this.animation = "crouch";
    }

    // jumping
    if (jumping) {
      this.velocity[1] += this.gravity;
      // end jump
      if (this.player.y > player_height) {
        this.acceleration = [0, 0];
        this.velocity[1] = 0;
        this.jumping = false;
        if (this.velocity[0] != 0) {
          this.animation = "walk";
        } else {
          this.animation = "idle";
        }
        this.player.y = player_height;
      }
    }
  };

  update() {
    const currentTime = new Date().getTime();
    let delta;
    if (this.lastUpdateTime === 0) {
      delta = 0;
    } else {
      delta = (currentTime - this.lastUpdateTime) / 1000;
    }
    this.player.x += this.velocity[0] * delta;
    this.player.y += this.velocity[1] * delta;
    this.velocity[0] += this.acceleration[0] * delta;
    this.velocity[1] += this.acceleration[1] * delta;
    this.acceleration = [0, 0];

    this.lastUpdateTime = currentTime;
  }

  keyDown = (e) => {
    this.keys[e.key] = true;
    if (e.key == "s" && !this.crouching) {
      // crouch
      this.crouching = true;
    }
    if (e.key == "a" || e.key == "d") {
      // move left/right
      this.last_key = e.key;
      this.crouching = false;
      if (!this.jumping && !this.crouching && !this.attacking) {
        this.animation = "walk";
      }
    }
    if (e.key == "w" && !this.jumping) {
      // jump
      this.velocity[1] = -1500;
      this.jumping = true;
      this.crouching = false;
      this.animation = "jump";
    }
  };

  keyUp = (e) => {
    this.keys[e.key] = false;
    if (e.key == "s") {
      this.crouching = false;
    }
    if (
      !this.jumping &&
      !this.crouching &&
      !this.attacking &&
      !this.keys["a"] &&
      !this.keys["d"]
    ) {
      this.animation = "idle";
    }
  };

  click = (e) => {
    if (this.curr_move == "none" && !this.attacking) {
      if (e.button == 0 && !this.jumping && !this.crouching) {
        this.curr_move = "punch";
      } else if (e.button == 2) {
        this.curr_move = "kick";
      }
    }
  };

  rclick = (e) => {
    e.preventDefault();
  };

  attack = (delta) => {
    if (this.curr_move == "none") {
      return;
    }
    this.attacking = true;
    if (this.curr_move == "punch") {
      // punch
      this.animation = "punch";
      this.curr_move = "none";

      // start-up frames 3
      setTimeout(() => {
        if (this.getLeft()) {
          this.setAttackCollision(
            this.player.x,
            this.player.y + 100,
            -150,
            70,
            5,
            true
          );
        } else {
          this.setAttackCollision(
            this.player.x,
            this.player.y + 100,
            150,
            70,
            5,
            true
          );
        }
        // active frames 3
        setTimeout(() => {
          this.setAttackCollision(null, null, null, null, null, false);
          // recovery frames 5
          setTimeout(() => {
            this.attacking = false;
            this.animation = "idle";
          }, (5 * 500 * delta) / 11);
        }, (3 * 500 * delta) / 11);
      }, (3 * 500 * delta) / 11);
    } else if (this.curr_move == "kick") {
      // kick need to implement
      this.curr_move = "none";
      this.drawKick(
        this.player.position.x + this.player.width,
        this.player.position.y + this.player.height / 2,
        300 - this.player.width,
        100
      );
      app.ticker.add(
        this.hit(
          this.player.position.x + this.player.width,
          this.player.position.y + this.player.height / 2,
          300 - this.player.width,
          100,
          7
        )
      );
      setTimeout(() => {
        this.leg.clear();
        this.attacking = false;
        app.ticker.remove(
          this.hit(
            this.player.position.x + this.player.width,
            this.player.position.y + this.player.height / 2,
            300 - this.player.width,
            100,
            7
          )
        );
      }, 250 * delta);
    }
  };

  // move left/right
  move = (delta) => {
    socket.emit("action", {
      'player': this.num,
      'keys': this.keys,
      'last': this.last_key,
      'jumping': this.jumping,
      'crouching': this.crouching,
      'position': this.getInfo(),
      'animation': this.animation,
      'attackCollisionPos': this.attackCollisionPos,
      'collidingLeft': this.collidingLeft,
      'collidingRight': this.collidingRight
    });
  };

  getPosition = (delta) => {
    return [
      this.player.position.x,
      this.player.position.y,
      this.player.width,
      this.player.height,
    ];
  };

  getInfo = () => {
    return [this.player.x, this.player.y];
  };

  getHealth = () => {
    return this.health;
  };

  setHealth = (health) => {
    this.health = health;
  };

  setAttackCollision = (x, y, width, height, damage, attacking) => {
    this.attackCollisionPos = [x, y, width, height, damage, attacking];
  };

  setCollide = (collision) => {
    if (collision == 'left') {
      this.collidingLeft = true;
    } else if (collision == 'right') {
      this.collidingRight = true;
    } else if (collision == 'none') {
      this.collidingLeft = false;
      this.collidingRight = false;
    }
  }

  getSocket = () => {
    return this.socket;
  };

  getSocketId = () => {
    return this.id;
  };

  getNum = () => {
    return this.num;
  };

  getLeft = () => {
    return this.left;
  };

  isComp = () => {
    return this.comp;
  }

  flip = () => {
    this.left = !this.left;
  };
}

// class GameState {
//   constructor() {
//     // time
//     this.time = 99;
//     this.ticking = false;
//     app.ticker.add(this.clock);
//   }

//   clock = (delta) => {
//     if (this.time <= 0) {
//       app.ticker.remove(this.clock);
//       console.log("game over");
//       if (player1.getHealth() > player2.getHealth()) {
//         sock.emit("win", "1");
//       } else if (player1.getHealth() > player2.getHealth()) {
//         sock.emit("win", "2");
//       } else {
//         sock.emit("win", "0");
//       }
//       return;
//     }
//     if (!this.ticking) {
//       this.ticking = true;
//       setTimeout(() => {
//         this.ticking = false;
//         this.time -= 1;
//         sock.emit("time", this.time);
//       }, 1000 * delta);
//     }
//   };
// }

class Update {
  constructor() {
    // health bars
    this.health1 = 100;
    this.healthContainer1 = new Container();
    app.stage.addChild(this.healthContainer1);
    const health_total1 = new Graphics();
    this.remaining1 = new Graphics();
    this.healthContainer1.addChild(health_total1);
    this.healthContainer1.addChild(this.remaining1);
    this.healthContainer1.x = 100 * scalex;
    this.healthContainer1.y = 50 * scaley;
    health_total1
      .beginFill(0xff0000)
      .drawRect(0, 0, (window.innerWidth / 2 - 200) * scalex, 50 * scaley); // player 1

    this.health2 = 100;
    this.healthContainer2 = new Container();
    app.stage.addChild(this.healthContainer2);
    const health_total2 = new Graphics();
    this.remaining2 = new Graphics();
    this.healthContainer2.addChild(health_total2);
    this.healthContainer2.addChild(this.remaining2);
    this.healthContainer2.x = (window.innerWidth / 2 + 100) * scalex;
    this.healthContainer2.y = 50 * scaley;
    health_total2
      .beginFill(0xff0000)
      .drawRect(0, 0, (window.innerWidth / 2 - 200) * scalex, 50 * scaley); // player 2

    this.time = new PIXI.Text("99", {
      fill: "#333333",
      fontSize: 40,
      fontWeight: "bold",
      align: "center",
    });
    this.time.position.x = (window.innerWidth / 2 - 20) * scalex;
    this.time.position.y = 50 * scaley
    this.time.fontSize = 40 * scalex

    socket.on("time", (time) => {
      this.time.text = time.toString();
    });
    app.stage.addChild(this.time);


    socket.on("health", (data) => {
      if (data[0] == 1) {
        this.health1 = data[1];
      } else if (data[0] == 2) {
        this.health2 = data[1];
      }     
    });

    socket.on("stop-attack", (player) => {
      if (player == 1) {
        this.attackCollisionPos1 = [null, null, null, null, null, false];
        player1.setAttackCollision(null, null, null, null, null, false);
      } else if (player == 2) {
        this.attackCollisionPos2 = [null, null, null, null, null, false];
        player2.setAttackCollision(null, null, null, null, null, false);
      }     
    });

    socket.on("collide", (data) => {
        if (data[1] == 1) {
            player1.setCollide(data[0]);
        } else if (data[1] == 2) {
            player2.setCollide(data[0]);
        }
    })

    this.player1Pos = [window.innerWidth / 3, player_height];
    this.player2Pos = [(window.innerWidth * 2) / 3, player_height];
    this.animation1 = "idle";
    this.curranimation1 = "none";
    this.animation2 = "idle";
    this.curranimation2 = "none";
    this.attackCollisionPos1 = [null, null, null, null, null, false];
    this.attackCollisionPos2 = [null, null, null, null, null, false];

    socket.on("new-info", (data) => {
      this.player1Pos = data["1"];
      this.player2Pos = data["2"];
      this.animation1 = data["animation1"];
      this.animation2 = data["animation2"];
      this.attackCollisionPos1 = data["attackCollisionPos1"];
      this.attackCollisionPos2 = data["attackCollisionPos2"];
    });

    socket.on("win", (winner) => {
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
    this.stick1 = new PIXI.AnimatedSprite(this.idle_textures);
    this.stick1.animationSpeed = 0.2;
    this.stick1.anchor.x = 0.5;
    this.stick1.width = 200 * scalex;
    this.stick1.height = 350 * scaley;
    this.stick1.filters = [this.filter];
    this.stick2 = new PIXI.AnimatedSprite(this.idle_textures);
    this.stick1.animationSpeed = 0.2;
    this.stick2.anchor.x = 0.5;
    this.stick2.width = 200 * scalex;
    this.stick2.height = 350  * scaley;
    this.stick2.filters = [this.filter];
    app.stage.addChild(this.stick1);
    app.stage.addChild(this.stick2);

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
    const texture = PIXI.Texture.from(`src/crouch/crouch_0000.png`);
    this.crouch_textures.push(texture);
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
  }

  scale = () => {
    this.player1Pos[0] *= scalex;
    this.player1Pos[1] *= scaley;
    this.player2Pos[0] *= scalex;
    this.player2Pos[1] *= scaley;
    if (this.attackCollisionPos1 && this.attackCollisionPos1[0] && this.attackCollisionPos1[1] && this.attackCollisionPos1[2] && this.attackCollisionPos1[3]) {
      this.attackCollisionPos1[0] *= scalex;
      this.attackCollisionPos1[1] *= scaley;
      this.attackCollisionPos1[2] *= scalex;
      this.attackCollisionPos1[3] *= scaley;
    }
    if (this.attackCollisionPos2 && this.attackCollisionPos2[0] && this.attackCollisionPos2[1] && this.attackCollisionPos2[2] && this.attackCollisionPos2[3]) {
      this.attackCollisionPos2[0] *= scalex;
      this.attackCollisionPos2[1] *= scaley;
      this.attackCollisionPos2[2] *= scalex;
      this.attackCollisionPos2[3] *= scaley;
    }
  }

  drawHealth = () => {
    this.remaining1.clear();
    this.remaining2.clear();
    this.remaining1
      .beginFill(0x00ff00)
      .drawRect(
        (window.innerWidth / 2 - 200) * scalex,
        0,
        -((this.health1 / 100) * (window.innerWidth / 2 - 200)) * scalex,
        50 * scaley
      );
    this.remaining2
      .beginFill(0x00ff00)
      .drawRect(0, 0, (this.health2 / 100) * (window.innerWidth / 2 - 200) * scalex, 50 * scaley);
  };

  drawPlayers = () => {
    // draw players to screen
    this.stick1.x = this.player1Pos[0];
    this.stick1.y = this.player1Pos[1];
    this.stick2.x = this.player2Pos[0];
    this.stick2.y = this.player2Pos[1];

    if (this.stick1.x < this.stick2.x && player1.getLeft() == true) {
      player1.flip();
      this.stick1.scale.x *= -1;
    }
    if (this.stick1.x >= this.stick2.x && player1.getLeft() == false) {
      player1.flip();
      this.stick1.scale.x *= -1;
    }
    if (this.stick2.x < this.stick1.x && player2.getLeft() == true) {
      player2.flip();
      this.stick2.scale.x *= -1;
    }
    if (this.stick2.x >= this.stick1.x && player2.getLeft() == false) {
      player2.flip();
      this.stick2.scale.x *= -1;
    }

    this.animate();
  };

  drawHitBox = (x, y, width, height) => {
    const hitBox = new Graphics();
    hitBox.clear();
    hitBox.x = x;
    hitBox.y = y;
    hitBox.beginFill(0x00ff00).drawRect(0, 0, width, height).endFill();
    app.stage.addChild(hitBox);
  };

  // check for attack collision
  checkAttackCollision = () => {
    // check if first player is dealing damage
    if (this.attackCollisionPos1) {
      //this.drawHitBox(this.attackCollisionPos1[0], this.attackCollisionPos1[1], this.attackCollisionPos1[2], this.attackCollisionPos1[3])
      if (
        this.attackCollisionPos1[5] &&
        this.attackCollisionPos1[0] + this.attackCollisionPos1[2] >=
          this.player2Pos[0] - 75 * scalex &&
        this.attackCollisionPos1[0] <= this.player2Pos[0] + 75 * scalex &&
        this.attackCollisionPos1[1] <= this.player2Pos[1] + 350 * scaley &&
        this.attackCollisionPos1[1] + this.attackCollisionPos1[3] >= this.player2Pos[1]
      ) {
        socket.emit("damage", [this.attackCollisionPos1[4], 1]);
      }

      if (
        this.attackCollisionPos1[5] &&
        this.attackCollisionPos1[0] >= this.player2Pos[0] - 75 * scalex &&
        this.attackCollisionPos1[0] + this.attackCollisionPos1[2] <=
          this.player2Pos[0] + 75 * scalex &&
        this.attackCollisionPos1[1] <= this.player2Pos[1] + 350 * scaley &&
        this.attackCollisionPos1[1] + this.attackCollisionPos1[3] >=
          this.player2Pos[1]
      ) {
        socket.emit("damage", [this.attackCollisionPos1[4], 1]);
      }
    }

    // check if second player is dealing damage
    if (this.attackCollisionPos2) {
      //this.drawHitBox(this.attackCollisionPos2[0], this.attackCollisionPos2[1], this.attackCollisionPos2[2], this.attackCollisionPos2[3])
      if (
        this.attackCollisionPos2[5] &&
        this.attackCollisionPos2[0] + this.attackCollisionPos2[2] >=
          this.player1Pos[0] - 75 * scalex &&
        this.attackCollisionPos2[0] <= this.player1Pos[0] + 75 * scalex &&
        this.attackCollisionPos2[1] <= this.player1Pos[1] + 350 * scaley &&
        this.attackCollisionPos2[1] + this.attackCollisionPos2[3] >=
          this.player1Pos[1]
      ) {
        socket.emit("damage", [this.attackCollisionPos2[4], 2]);
      }
      if (
        this.attackCollisionPos2[5] &&
        this.attackCollisionPos2[0] >= this.player1Pos[0] - 75 * scalex &&
        this.attackCollisionPos2[0] + this.attackCollisionPos2[2] <=
          this.player1Pos[0] + 75 * scalex &&
        this.attackCollisionPos2[1] <= this.player1Pos[1] + 350 * scaley &&
        this.attackCollisionPos2[1] + this.attackCollisionPos2[3] >=
          this.player1Pos[1]
      ) {
        socket.emit("damage", [this.attackCollisionPos2[4], 2]);
      }
    }
  };

  // check for player collision
  checkPlayerCollision = () => {
      let colliding = false;
      if ( // collide with each other
          this.player1Pos[0] + 90 * scalex >= this.player2Pos[0] - 90 * scalex &&
          this.player1Pos[0] - 90 * scalex <= this.player2Pos[0] + 90 * scalex &&
          this.player1Pos[1] <= this.player2Pos[1] + 225 * scaley &&
          this.player1Pos[1] + 225 * scaley >= this.player2Pos[1]
      ) {
          if (!player1.getLeft() && player2.getLeft()) {
              colliding = true;
              socket.emit("collide", ['right', 1]);
              socket.emit("collide", ['left', 2]);
          } else if (player1.getLeft() && !player2.getLeft()) {
              colliding = true;
              socket.emit("collide", ['left', 1]);
              socket.emit("collide", ['right', 2]);
          }
      }
      
      if (this.player2Pos[0] + 95 * scalex >= ground_width && player2.getLeft()) { // collide with wall
          colliding = true;
          socket.emit("collide", ['right', 2]);
      } else if (this.player1Pos[0] + 95 * scalex >= ground_width && player1.getLeft()) { // collide with wall
          colliding = true;
          socket.emit("collide", ['right', 1]);
      } else if (this.player2Pos[0] - 95 * scalex <= 0 && !player2.getLeft()) { // collide with wall
          colliding = true;
          socket.emit("collide", ['left', 2]);
      } else if (this.player1Pos[0] - 95 * scalex <= 0 && !player1.getLeft()) { // collide with wall
          colliding = true;
          socket.emit("collide", ['left', 1]);
      }
      
      
      if (!colliding) {
          socket.emit("collide", ['none', 1]);
          socket.emit("collide", ['none', 2]);
      }
  }

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
      case "punch":
        if (this.curranimation1 != this.animation1) {
          this.curranimation1 = this.animation1;
          this.stick1.textures = this.punch_textures;
        }
        this.stick1.animationSpeed = 11 / (60 * 0.5);
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
      case "punch":
        if (this.curranimation2 != this.animation2) {
          this.curranimation2 = this.animation2;
          this.stick2.textures = this.punch_textures;
        }
        this.stick2.animationSpeed = 11 / (60 * 0.5);
        break;
    }
    this.stick2.play();
  };
}

const ground_width = window.innerWidth * scalex;
const ground_height = window.innerHeight / 10 ;
const player_height = window.innerHeight - ground_height - 350;

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
socket.on("player", (player) => {
  if (player == 1) {
    // add first player to screen
    player1Pos = [window.innerWidth / 3, player_height];
    player1 = new Player(player1Pos[0], player1Pos[1], socket.id, 1, false);
    player2 = new Player(
      (window.innerWidth * 2) / 3,
      player_height,
      socket.id,
      2,
      true
    );
    update = new Update();
    socket.emit("confirm", [1, socket.id, player1Pos]);
  } else if (player == 2 && !player2) {
    // add second player to screen
    player2Pos = [(window.innerWidth * 2) / 3, player_height];
    player1 = new Player(
      window.innerWidth / 3,
      player_height,
      socket.id,
      1,
      true
    );
    player2 = new Player(player2Pos[0], player2Pos[1], socket.id, 2, false);
    update = new Update();
    socket.emit("confirm", [2, socket.id, player2Pos]);
  }
});

// done once a frame so 1/60 sec.
socket.on("update", (data) => {
  update.scale();
  player1.update();
  player2.update();
  update.drawHealth();
  update.drawPlayers();
  update.checkAttackCollision();
  update.checkPlayerCollision();
});

// predict movement
socket.on("user-input", (userInput) => {
  if (userInput["player"] == 1) {
    player1.userInput(userInput);
  } else if (userInput["player"] == 2) {
    player2.userInput(userInput);
  }
});

// resize
window.addEventListener("resize", resize);

function resize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
}

resize();
